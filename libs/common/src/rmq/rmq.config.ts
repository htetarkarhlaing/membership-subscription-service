import { config } from 'dotenv';
import {
  MicroserviceOptions,
  RmqOptions,
  Transport,
} from '@nestjs/microservices';

config();

const getUrls = () =>
  (process.env.RABBIT_MQ_URI ?? 'amqp://localhost:5672')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

const getQueueDurable = () => process.env.RABBIT_MQ_QUEUE_DURABLE !== 'false';
const getPrefetch = () => Number(process.env.RABBIT_MQ_PREFETCH ?? 1);

export const buildRmqServerOptions = (
  queueName = process.env.RABBIT_MQ_CORE_QUEUE ?? 'core.queue',
): MicroserviceOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: getUrls(),
    queue: queueName,
    noAck: false,
    prefetchCount: getPrefetch(),
    queueOptions: {
      durable: getQueueDurable(),
    },
  },
});

export const buildRmqClientOptions = (
  queueName = process.env.RABBIT_MQ_CORE_QUEUE ?? 'core.queue',
  overrides: Partial<RmqOptions['options']> = {},
): RmqOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: getUrls(),
    queue: queueName,
    noAck: true,
    prefetchCount: getPrefetch(),
    queueOptions: {
      durable: getQueueDurable(),
    },
    ...overrides,
  },
});
