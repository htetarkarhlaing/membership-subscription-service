import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class RpcClientService {
  private readonly logger = new Logger(RpcClientService.name);
  private readonly defaultTimeoutMs = 5000;

  async send<T = any>(
    client: ClientProxy,
    pattern: { cmd: string },
    payload: unknown,
    timeoutMs?: number,
  ): Promise<T> {
    try {
      return await firstValueFrom(
        client
          .send<T>(pattern, payload)
          .pipe(timeout(timeoutMs ?? this.defaultTimeoutMs)),
      );
    } catch (error) {
      this.logger.error(
        `RPC send failed [${pattern.cmd}]`,
        (error as Error)?.stack,
      );
      throw error;
    }
  }

  emit(client: ClientProxy, pattern: { cmd: string }, payload: unknown): void {
    try {
      client.emit(pattern, payload);
    } catch (error) {
      this.logger.error(
        `RPC emit failed [${pattern.cmd}]`,
        (error as Error)?.stack,
      );
    }
  }
}
