import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ConsumerJwtAuthGuard extends AuthGuard('consumer-jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
