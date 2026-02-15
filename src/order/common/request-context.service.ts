import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

interface Store {
  correlationId: string;
}

@Injectable()
export class RequestContext {
  private readonly asyncLocalStorage =
    new AsyncLocalStorage<Store>();

  run(correlationId: string, callback: () => void) {
    this.asyncLocalStorage.run({ correlationId }, callback);
  }

  getCorrelationId(): string | undefined {
    return this.asyncLocalStorage.getStore()?.correlationId;
  }
}
