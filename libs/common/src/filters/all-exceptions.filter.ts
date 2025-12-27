import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiResponse } from './response.interceptor';
import { I18nService } from 'nestjs-i18n';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly i18n: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const lang = (request.headers['accept-language'] as string) || 'en';

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorKey = this.mapStatusToI18nKey(status);

    const payloadMessage =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = '';

    if (payloadMessage && typeof payloadMessage === 'string') {
      message = this.i18n.translate(payloadMessage, { lang });
    } else {
      message = this.i18n.translate(`errors.${errorKey}`, {
        lang,
      });
    }

    const devMessage =
      exception instanceof HttpException ? exception.getResponse() : exception;

    const errorResponse: ApiResponse<null> = {
      meta: {
        success: false,
        message,
        devMessage:
          typeof devMessage === 'string'
            ? devMessage
            : JSON.stringify(devMessage),
      },
      body: null,
    };

    response.status(status).json(errorResponse);
  }

  private mapStatusToI18nKey(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'bad_request';
      case HttpStatus.UNAUTHORIZED:
        return 'unauthorized';
      case HttpStatus.PAYMENT_REQUIRED:
        return 'payment_required';
      case HttpStatus.FORBIDDEN:
        return 'forbidden';
      case HttpStatus.NOT_FOUND:
        return 'not_found';
      case HttpStatus.METHOD_NOT_ALLOWED:
        return 'method_not_allowed';
      case HttpStatus.NOT_ACCEPTABLE:
        return 'not_acceptable';
      case HttpStatus.REQUEST_TIMEOUT:
        return 'request_timeout';
      case HttpStatus.CONFLICT:
        return 'conflict';
      case HttpStatus.GONE:
        return 'gone';
      case HttpStatus.LENGTH_REQUIRED:
        return 'length_required';
      case HttpStatus.PRECONDITION_FAILED:
        return 'precondition_failed';
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return 'payload_too_large';
      case HttpStatus.URI_TOO_LONG:
        return 'uri_too_long';
      case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
        return 'unsupported_media_type';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'unprocessable_entity';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'too_many_requests';

      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'internal_server_error';
      case HttpStatus.NOT_IMPLEMENTED:
        return 'not_implemented';
      case HttpStatus.BAD_GATEWAY:
        return 'bad_gateway';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'service_unavailable';
      case HttpStatus.GATEWAY_TIMEOUT:
        return 'gateway_timeout';
      case HttpStatus.HTTP_VERSION_NOT_SUPPORTED:
        return 'http_version_not_supported';

      default:
        return 'something_went_wrong';
    }
  }
}
