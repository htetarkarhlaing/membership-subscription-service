import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  handleRpcError(error: any, context: string): never {
    this.logger.error(`RPC Error in ${context}`);

    console.error(error);

    if (error?.message === 'Timeout has occurred') {
      throw new HttpException('errors.rpc_timeout', HttpStatus.GATEWAY_TIMEOUT);
    }
    throw new HttpException(
      error?.message || 'errors.internal_server_error',
      error?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
