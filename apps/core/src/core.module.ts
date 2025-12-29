import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CoreController } from './core.controller';
import { CoreService } from './core.service';
import { RmqModule } from '@app/common';
import { PrismaModule } from '@app/prisma';
import { MembershipService } from './membership.service';
import { ConsumerMembershipController } from './consumer-membership.controller';
import { AdminMembershipController } from './admin-membership.controller';
import { WalletService } from './wallet.service';
import { ConsumerWalletController } from './consumer-wallet.controller';
import { AdminWalletController } from './admin-wallet.controller';
import { SubscriptionScheduler } from './subscription.scheduler';

@Module({
  imports: [RmqModule, PrismaModule, ScheduleModule.forRoot()],
  controllers: [
    CoreController,
    ConsumerMembershipController,
    AdminMembershipController,
    ConsumerWalletController,
    AdminWalletController,
  ],
  providers: [
    CoreService,
    MembershipService,
    WalletService,
    SubscriptionScheduler,
  ],
})
export class CoreModule {}
