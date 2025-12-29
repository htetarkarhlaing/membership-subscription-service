import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { CoreModule } from './core.module';
import { buildRmqServerOptions } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(CoreModule);

  app.connectMicroservice<MicroserviceOptions>(
    buildRmqServerOptions(process.env.RABBIT_MQ_CORE_QUEUE ?? 'core.queue'),
  );

  await app.startAllMicroservices();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Core service running with RMQ + HTTP on port ${port}`);
}

void bootstrap();
