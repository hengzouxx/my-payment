import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrderModule } from './order/order.module';
import { ProviderSimulatorModule } from './provider-simulator/provider-simulator.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_DATABASE ?? 'my_payment',
      autoLoadEntities: true,
      synchronize: true,
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),
    OrderModule,
    ProviderSimulatorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
