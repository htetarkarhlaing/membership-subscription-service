import { ExceptionFilter, Catch, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

@Catch(RpcException)
export class RpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcExceptionFilter.name);

  catch(exception: RpcException): Observable<any> {
    const error = exception.getError();
    this.logger.error('RPC Exception:', error);
    return throwError(() => exception);
  }
}
