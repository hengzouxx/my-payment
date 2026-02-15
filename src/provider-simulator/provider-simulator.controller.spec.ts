import { Test, TestingModule } from '@nestjs/testing';
import { ProviderSimulatorController } from './provider-simulator.controller';

describe('ProviderSimulatorController', () => {
  let controller: ProviderSimulatorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProviderSimulatorController],
    }).compile();

    controller = module.get<ProviderSimulatorController>(ProviderSimulatorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
