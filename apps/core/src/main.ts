import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { buildRmqServerOptions } from '@app/common';
import { CoreModule } from './core.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    CoreModule,
    buildRmqServerOptions(process.env.RABBIT_MQ_CORE_QUEUE ?? 'core.queue'),
  );

  await app.listen();
}
void bootstrap();
