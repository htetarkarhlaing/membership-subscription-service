import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from '@app/common';
import { I18nService } from 'nestjs-i18n';
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes';
import { ResponseInterceptor } from '@app/common/filters/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  const i18nService = app.get(I18nService<Record<string, unknown>>);
  app.enableCors({
    origin: '*',
  });
  app.enableShutdownHooks();
  app.useGlobalFilters(new AllExceptionsFilter(i18nService));
  app.useGlobalInterceptors(
    new ResponseInterceptor(new Reflector(), i18nService),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Membership Subscription Service')
    .setDescription('The Membership Subscription Service API documentation')
    .setVersion('1.0')
    .addTag('Public API')
    .addBearerAuth()
    .addGlobalParameters({
      name: 'Accept-Language',
      in: 'header',
      required: false,
      schema: {
        type: 'string',
        example: 'en',
        enum: ['en', 'zh', 'km'],
      },
    })
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  const theme = new SwaggerTheme();
  SwaggerModule.setup('docs', app, documentFactory, {
    customCss: theme.getBuffer(SwaggerThemeNameEnum.DRACULA),
    jsonDocumentUrl: 'docs/json',
    yamlDocumentUrl: 'docs/yaml',
    customSiteTitle: 'The Membership Subscription Service API documentation',
  });

  await app.listen(process.env.port ?? 8080);
}
void bootstrap();
