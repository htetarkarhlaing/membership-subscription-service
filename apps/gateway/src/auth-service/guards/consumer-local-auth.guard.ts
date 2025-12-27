import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ConsumerLocalAuthGuard extends AuthGuard('consumer-local') {}
