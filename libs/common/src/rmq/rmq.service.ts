import { Injectable, Logger } from '@nestjs/common';
import {
  RmqContext,
  RmqOptions,
  MicroserviceOptions,
} from '@nestjs/microservices';
import { buildRmqClientOptions, buildRmqServerOptions } from './rmq.config';

@Injectable()
export class RmqService {
  private readonly logger = new Logger(RmqService.name);

  getServerOptions(queue?: string): MicroserviceOptions {
    return buildRmqServerOptions(queue);
  }

  getClientOptions(
    queue?: string,
    overrides?: Partial<RmqOptions['options']>,
  ): RmqOptions {
    return buildRmqClientOptions(queue, overrides);
  }

  ack(context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    channel.ack(originalMessage);
  }

  nack(context: RmqContext, requeue = false) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    channel.nack(originalMessage, false, requeue);
  }
}
