import { Module } from '@nestjs/common';
import { ProviderSimulatorController } from './provider-simulator.controller';
import { ProviderSimulatorService } from './provider-simulator.service';
import { ProviderOrder } from './provider-order.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProviderOrder]),
  ],
  controllers: [ProviderSimulatorController],
  providers: [ProviderSimulatorService]
})
export class ProviderSimulatorModule {}
