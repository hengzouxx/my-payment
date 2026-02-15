import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
  ) {}


  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async health() {
    try {
      // Simple DB check
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', db: 'ok' };
    } catch (e) {
      return { status: 'ok', db: 'error', error: e?.message };
    }
  }
}
