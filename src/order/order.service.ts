import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderHistory } from './order-history.entity';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { OrderStatus } from './order-status';
import { RequestContext } from './common/request-context.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,

    @InjectRepository(OrderHistory)
    private historyRepo: Repository<OrderHistory>,

    @InjectQueue('orders')
    private ordersQueue: Queue,
    
    private readonly context: RequestContext,

    @Inject('ORDERS_FILE_LOGGER')
    private readonly fileLogger,
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

    const correlationId = this.context.getCorrelationId();
    this.fileLogger.info({
      message: 'order_state_created',
      correlationId,
      orderId: order.id,
      status: order.status
    });

    // Enqueue async submission
    await this.ordersQueue.add('submit',
      { orderId: order.id, correlationId },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    return {
      orderId: order.id,
      amount: order.amount,
      status: order.status,
    };
  }

  async getOrder(orderId: string) {
    const order = await this.findById(orderId, true);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async updateStatus(order: Order, status: OrderStatus) {
    const from  = order.status;
    order.status = status;
    await this.orderRepo.save(order);
    const to = order.status;
    await this.addHistory(order, status);

    const correlationId = this.context.getCorrelationId();
    this.fileLogger.info({
      message: 'order_state_transition',
      correlationId,
      orderId: order.id,
      from,
      to,
    });
  }
  
  async addHistory(order: Order, status: OrderStatus) {
    const entry = this.historyRepo.create({
      orderId: order.id,
      status,
    });
    await this.historyRepo.save(entry);
  }
  
  async findById(id: string, history: boolean = false) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: history ? ['history'] : undefined,
    });
    return order;
  }

  async attachProviderId(order: Order, providerId: string) {
    await this.orderRepo.update({ id: order.id }, { providerOrderId: providerId });
    order.providerOrderId = providerId;
  }

}
