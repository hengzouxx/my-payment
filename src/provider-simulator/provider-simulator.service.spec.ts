import { Test, TestingModule } from '@nestjs/testing';
import { ProviderSimulatorService } from './provider-simulator.service';

describe('ProviderSimulatorService', () => {
  let service: ProviderSimulatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProviderSimulatorService],
    }).compile();

    service = module.get<ProviderSimulatorService>(ProviderSimulatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
