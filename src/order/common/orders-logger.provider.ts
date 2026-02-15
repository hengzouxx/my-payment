import pino from 'pino';

export const OrdersFileLogger = pino({
  level: 'info',
  transport: {
    target: 'pino/file',
    options: {
      destination: './logs/order.log',
      mkdir: true,
    },
  },
});
