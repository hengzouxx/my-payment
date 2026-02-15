import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Order } from './order.entity';
import { OrderHistory } from './order-history.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrdersProcessor } from './orders.processor';
import { MockProviderService } from '../provider/mock-provider.service';
import { RequestContext } from './common/request-context.service';
import { OrdersFileLogger } from './common/orders-logger.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderHistory]),
    BullModule.registerQueue({ name: 'orders' }),
  ],
  providers: [OrderService, OrdersProcessor, MockProviderService, RequestContext, 
    {
      provide: 'ORDERS_FILE_LOGGER',
      useValue: OrdersFileLogger,
    },
  ],
  controllers: [OrderController],
})
export class OrderModule {}
