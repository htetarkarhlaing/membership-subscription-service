import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { unset } from 'lodash';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { Request } from 'express';

export interface MetaData {
  success: boolean;
  message: string;
  devMessage: string | null;
}

export interface ApiResponse<T> {
  meta: MetaData;
  body: T | null;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(
    private readonly reflector: Reflector,
    private readonly i18n: I18nService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const skipInterceptor = this.reflector.get<boolean>(
      'skipInterceptor',
      context.getHandler(),
    );

    if (skipInterceptor) {
      return next.handle() as Observable<ApiResponse<T>>;
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const lang = (request.headers['accept-language'] as string) || 'en';

    return next.handle().pipe(
      map((data: any) => {
        const messageKey =
          typeof data?.message === 'string'
            ? data.message
            : 'common.operation_successful';

        const message: string = this.i18n.translate(messageKey, {
          lang,
          defaultValue: this.i18n.translate('common.operation_successful', {
            lang,
          }),
        });
        unset(data, 'message');

        return {
          meta: {
            success: true,
            message,
            devMessage: null,
          },
          body: data,
        };
      }),
    );
  }
}
