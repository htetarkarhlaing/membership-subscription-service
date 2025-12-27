import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { CoreServiceModule } from './core-service/core-service.module';
import { AuthServiceModule } from './auth-service/auth-service.module';
import { I18nJsonLoader, I18nModule, QueryResolver } from 'nestjs-i18n';
import { join } from 'path';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: join(__dirname, '../../../i18n/'),
        watch: true,
      },
      loader: I18nJsonLoader,
      resolvers: [
        {
          use: QueryResolver,
          options: ['lang', 'locale', 'l'],
        },
      ],
    }),
    CoreServiceModule,
    AuthServiceModule,
  ],
  controllers: [GatewayController],
  providers: [GatewayService],
})
export class GatewayModule {}
