import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { RequestContext } from './request-context.service';

export function correlationMiddleware(
  requestContext: RequestContext,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const correlationId = randomUUID();

    res.setHeader('x-correlation-id', correlationId);

    requestContext.run(correlationId, () => {
      next();
    });
  };
}
