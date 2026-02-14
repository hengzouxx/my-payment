import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { OrderStatus } from './order-status';

@Entity('order_history')
export class OrderHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.history)
  order: Order;

  @Column({
    type: 'enum',
    enum: OrderStatus,
  })
  status: OrderStatus;

  @CreateDateColumn()
  timestamp: Date;
}
