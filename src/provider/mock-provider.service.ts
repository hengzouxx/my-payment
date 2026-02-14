import { Injectable } from "@nestjs/common";

@Injectable()
export class MockProviderService {
  async submit(orderId: string): Promise<string> {
    return `prov_${orderId}`;
  }

  async waitForResult(id: string): Promise<'success' | 'fail'> {
    await new Promise((r) => setTimeout(r, 3000));
    return Math.random() > 0.2 ? 'success' : 'fail';
  }
}
