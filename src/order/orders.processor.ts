import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { OrderService } from './order.service';
import { MockProviderService } from '../provider/mock-provider.service';
import { OrderStatus } from "./order-status";

@Processor('orders')
export class OrdersProcessor {
  constructor(
    private readonly orderService: OrderService,
    private readonly provider: MockProviderService,
  ) {}

  @Process('submit')
  async handleSubmit(job: Job<{ orderId: string }>) {
    const order = await this.orderService.findById(job.data.orderId);
    if (!order) return;

    // Prevent duplicate provider submission
    if (order.providerOrderId) return;

    await this.orderService.updateStatus(order, OrderStatus.SUBMITTED);

    const providerId = await this.provider.submit(order.id);

    await this.orderService.attachProviderId(order, providerId);

    await this.orderService.updateStatus(order, OrderStatus.PENDING);

    const result = await this.provider.waitForResult(providerId);

    await this.orderService.updateStatus(
      order,
      result === 'success'
        ? OrderStatus.COMPLETED
        : OrderStatus.FAILED,
    );
  }
}
