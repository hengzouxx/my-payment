import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { ProviderSimulatorService } from './provider-simulator.service';

@Controller('provider-simulator')
export class ProviderSimulatorController {
  constructor(private readonly providerSimulatorService: ProviderSimulatorService) {}

  @Post('submit')
  async submit(@Query('orderId') orderId: string, @Query('amount') amount) {
    return await this.providerSimulatorService.submit(orderId, amount);
  }

  @Get('status/:providerOrderId')
  async status(
    @Param('providerOrderId') providerOrderId: string,
  ) {
      return await this.providerSimulatorService.getStatus(providerOrderId);
  }
}
