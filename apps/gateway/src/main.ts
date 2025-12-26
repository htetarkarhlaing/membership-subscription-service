import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  app.enableShutdownHooks();
  const config = new DocumentBuilder()
    .setTitle('Membership Subscription Service')
    .setDescription('The Membership Subscription Service API description')
    .setVersion('1.0')
    .addTag('Public API')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  await app.listen(process.env.port ?? 8080);
}
void bootstrap();
