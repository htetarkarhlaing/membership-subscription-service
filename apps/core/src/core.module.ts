import { Module } from '@nestjs/common';
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

@Module({
  imports: [RmqModule, PrismaModule],
  controllers: [
    CoreController,
    ConsumerMembershipController,
    AdminMembershipController,
    ConsumerWalletController,
    AdminWalletController,
  ],
  providers: [CoreService, MembershipService, WalletService],
})
export class CoreModule {}
