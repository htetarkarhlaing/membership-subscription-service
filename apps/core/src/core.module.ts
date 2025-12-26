import { Module } from '@nestjs/common';
import { CoreController } from './core.controller';
import { CoreService } from './core.service';
import { RmqModule } from '@app/common';

@Module({
  imports: [RmqModule],
  controllers: [CoreController],
  providers: [CoreService],
})
export class CoreModule {}
