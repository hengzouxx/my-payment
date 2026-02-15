import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { OrderService } from './order.service';
import { MockProviderService } from '../provider/mock-provider.service';
import { OrderStatus } from './order-status';
import axios from 'axios';
import { Order } from './order.entity';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { RequestContext } from './common/request-context.service';

@Processor('orders')
@Injectable()
export class OrdersProcessor {
  private readonly logger = new Logger(OrdersProcessor.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly provider: MockProviderService,
    private readonly context: RequestContext,
    @Inject('ORDERS_FILE_LOGGER')
    private readonly fileLogger: {
      info: (data: Record<string, unknown>) => void;
    },
  ) {}

  @Process('submit')
  async handleSubmit(job: Job<{ orderId: string; correlationId: string }>) {
    const { orderId, correlationId } = job.data;

    return this.context.run(correlationId, async () => {
      await this.processOrder(job);
    });
  }

  private async processOrder(job: Job<{ orderId: string }>) {
    const orderId = job.data.orderId;
    const attempt = job.attemptsMade + 1;

    const correlationId = this.context.getCorrelationId() || null;

    this.fileLogger.info({
      message: 'order_processing_started',
      correlationId,
      orderId,
      attempt,
    });

    const order = await this.orderService.findById(orderId);
    if (!order) return;

    // Prevent duplicate provider submission
    if (order.providerOrderId) return;

    await this.orderService.updateStatus(order, OrderStatus.SUBMITTED);

    const submitStartTime = Date.now();
    try {
      const submitResponse = await axios.post(
        'http://localhost:3000/provider-simulator/submit',
        { orderId: order.id, amount: order.amount },
      );

      this.fileLogger.info({
        message: 'submit_to_provider_result',
        correlationId,
        duration: Date.now() - submitStartTime,
        provider_order_id: submitResponse?.data?.providerOrderId,
        orderId,
        attempt,
      });

      await this.orderService.attachProviderId(
        order,
        submitResponse?.data?.providerOrderId,
      );

      await this.orderService.updateStatus(order, submitResponse?.data?.status);

      await this.pollProviderStatus(
        order,
        submitResponse?.data?.providerOrderId,
        correlationId,
      );
    } catch (error) {
      this.fileLogger.info({
        message: 'submit_to_provider_result',
        correlationId,
        duration: Date.now() - submitStartTime,
        error: error?.message || 'unknown',
        orderId,
        attempt,
      });
      throw error; // let Bull retry
    }
  }

  private async pollProviderStatus(
    order: Order,
    providerOrderId: string,
    correlationId: string | null,
  ) {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const submitStartTime = Date.now();
      try {
        const statusResponse = await axios.get(
          `http://localhost:3000/provider-simulator/status/${providerOrderId}`,
          { timeout: 3000 },
        );

        const status = statusResponse.data.status;

        this.fileLogger.info({
          message: 'poll_from_provider_result',
          correlationId,
          duration: Date.now() - submitStartTime,
          provider_order_id: providerOrderId,
          provider_order_status: status,
          orderId: order.id,
          attempt: i + 1,
        });

        if (status === 'PENDING') continue;

        await this.orderService.updateStatus(order, status);
        return;
      } catch (err) {
        this.fileLogger.info({
          message: 'poll_from_provider_result',
          correlationId,
          error: err?.message || 'unknown',
          duration: Date.now() - submitStartTime,
          provider_order_id: providerOrderId,
          orderId: order.id,
          attempt: i + 1,
        });
        // ignore intermittent 500 errors
        continue;
      }
    }

    // If never resolved
    await this.orderService.updateStatus(order, OrderStatus.FAILED);
  }
}
