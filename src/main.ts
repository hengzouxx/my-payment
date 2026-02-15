import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { RequestContext } from './order/common/request-context.service';
import { correlationMiddleware } from './order/common/correlation.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const requestContext = app.get(RequestContext);
  app.use(correlationMiddleware(requestContext));

  app.useLogger(app.get(Logger));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
