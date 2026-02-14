import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderHistory } from './order-history.entity';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { OrderStatus } from './order-status';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,

    @InjectRepository(OrderHistory)
    private historyRepo: Repository<OrderHistory>,

    @InjectQueue('orders')
    private ordersQueue: Queue,
  ) {}

  async createOrder(idempotencyKey: string, amount: number) {
    // Check existing order (idempotency)
    let order = await this.orderRepo.findOne({
      where: { idempotencyKey },
      relations: ['history'],
    });

    if (order) {
      return {
        orderId: order.id,
        amount: order.amount,
        status: order.status,
      };
    }

    // Create new order
    order = this.orderRepo.create({
      idempotencyKey,
      amount,
      status: OrderStatus.RECEIVED,
    });

    await this.orderRepo.save(order);

    await this.addHistory(order, OrderStatus.RECEIVED);

    // Enqueue async submission
    await this.ordersQueue.add('submit', {
      orderId: order.id,
    });

    return {
      orderId: order.id,
      status: order.status,
    };
  }

  async getOrder(orderId: string) {
    const order = await this.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async updateStatus(order: Order, status: OrderStatus) {
    order.status = status;
    await this.orderRepo.save(order);
  
    await this.addHistory(order, status);
  }
  
  async addHistory(order: Order, status: OrderStatus) {
    const entry = this.historyRepo.create({
      order,
      status,
    });
    await this.historyRepo.save(entry);
  }
  
  async findById(id: string) {
    return this.orderRepo.findOne({
      where: { id },
      relations: ['history'],
    });
  }

  async attachProviderId(order: Order, providerId: string) {
    order.providerOrderId = providerId;
    await this.orderRepo.save(order);
  }

}
