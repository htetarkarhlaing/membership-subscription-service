import { Injectable } from '@nestjs/common';

@Injectable()
export class CoreService {
  ping(): string {
    return 'Hello World!';
  }
}
