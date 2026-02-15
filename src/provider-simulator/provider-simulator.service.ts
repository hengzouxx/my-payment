import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OrderStatus } from './provider-order-status';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProviderOrder } from './provider-order.entity';

@Injectable()
export class ProviderSimulatorService {
    constructor(
        @InjectRepository(ProviderOrder)
        private providerOrderRepo: Repository<ProviderOrder>
    ) {}

    // ---- SUBMIT ----
  async submit(clientOrderId: string, amount: number) {
    this.simulateRandomDelay();
    this.simulateRandomFailure();

    // Idempotency: same clientOrderId should return same providerOrderId
    const existing = await this.providerOrderRepo.findOne({ where: {clientOrderId}});

    if (existing) {
        return {
          providerOrderId: existing.id,
          status: existing.status,
        };
    }

    const order = await this.providerOrderRepo.save({
        clientOrderId,
        amount,
        status: OrderStatus.PENDING
    });

    return {
      providerOrderId: order.id,
      status: OrderStatus.PENDING,
    };
  }

  // ---- STATUS ----
  async getStatus(providerOrderId: string) {
    this.simulateRandomDelay();
    this.simulateRandomFailure();

    const order = await this.providerOrderRepo.findOneBy({ id:providerOrderId });
    if (!order) {
      throw new InternalServerErrorException('Unknown provider order');
    }

    const now = Date.now();
    const createdAt = typeof order.createdAt === "number"
      ? order.createdAt
      : new Date(order.createdAt).getTime();
    const elapsed = now - createdAt;

    // Stay pending for 5 seconds
    if (elapsed < 5000) {
      return { status: OrderStatus.PENDING };
    }

    let finalStatus = OrderStatus.COMPLETED;
    if (Math.random() > 0.5) {
        finalStatus = OrderStatus.FAILED
    }
    return { 
        id: order.id,
        status: finalStatus 
    };
  }

  // ---- Failure simulation ----
  private simulateRandomFailure() {
    if (Math.random() < 0.5) {
      throw new InternalServerErrorException(
        'Random provider failure',
      );
    }
  }

  private simulateRandomDelay() {
    const delayChance = Math.random();

    // 60% chance of heavy delay
    if (delayChance < 0.6) {
      const delay = 2000 + Math.random() * 3000;
      const start = Date.now();
      while (Date.now() - start < delay) {}
    }
  }
}
