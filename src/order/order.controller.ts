import { Controller, Headers, Get, Param, Post, Body } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async create(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body('amount') amount: number,
  ) {
    return this.orderService.createOrder(idempotencyKey, amount);
  }

  @Get(':orderId')
  async get(@Param('orderId') orderId: string) {
    return this.orderService.getOrder(orderId);
  }
}
