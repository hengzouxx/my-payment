import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { OrderService } from './order.service';
import { MockProviderService } from '../provider/mock-provider.service';
import { OrderStatus } from "./order-status";
import axios from 'axios';
import { Order } from './order.entity';

@Processor('orders')
export class OrdersProcessor {
  constructor(
    private readonly orderService: OrderService,
    private readonly provider: MockProviderService,
  ) {}

  @Process('submit')
  async handleSubmit(job: Job<{ orderId: string }>) {
    const provider_url = "http://localhost:3000";

    const order = await this.orderService.findById(job.data.orderId);
    if (!order) return;

    // Prevent duplicate provider submission
    if (order.providerOrderId) return;

    await this.orderService.updateStatus(order, OrderStatus.SUBMITTED);

    try {
      const submitResponse = await axios.post(
        'http://localhost:3000/provider-simulator/submit',
        { orderId: order.id, amount: order.amount },
        { timeout: 3000 },
      );
      console.log('order', submitResponse)
      await this.orderService.attachProviderId(order, submitResponse?.data?.id);

      await this.orderService.updateStatus(order, submitResponse?.data?.status);

      await this.pollProviderStatus(order, submitResponse?.data?.id);
    } catch (error) {
      console.log('e', error)
      throw error; // let Bull retry
    }
  }

  private async pollProviderStatus(
    order: Order,
    providerOrderId: string,
  ) {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 2000));
  
      try {
        const statusResponse = await axios.get(
            `http://localhost:3000/provider-simulator/status/${providerOrderId}`,
            { timeout: 3000 },
          );

        const status = statusResponse.data.status;
  
        if (status === 'PENDING') continue;
  
        await this.orderService.updateStatus(order, status);
        return;
      } catch (err) {
        // ignore intermittent 500 errors
        continue;
      }
    }
  
    // If never resolved
    await this.orderService.updateStatus(order, OrderStatus.FAILED);
  }
}
