import { Controller } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import {
  CORE_WALLET_PAYMENT_METHODS_METHOD,
  CORE_WALLET_SUMMARY_METHOD,
  CORE_WALLET_TOPUP_LIST_METHOD,
  CORE_WALLET_TOPUP_REQUEST_METHOD,
  RmqService,
} from '@app/common';
import { WalletTopUpRequestDto } from '@app/common/schema/core/wallet.dto';
import { WalletService } from './wallet.service';

@Controller()
export class ConsumerWalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly rmqService: RmqService,
  ) {}

  @MessagePattern({ cmd: CORE_WALLET_SUMMARY_METHOD })
  async handleSummary(
    @Payload() data: { userId: string },
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.walletService.summary(data.userId);
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: CORE_WALLET_PAYMENT_METHODS_METHOD })
  async handlePaymentMethods(
    @Payload() data: { page?: number; limit?: number },
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.walletService.listPaymentMethods(
        data?.page,
        data?.limit,
      );
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: CORE_WALLET_TOPUP_REQUEST_METHOD })
  async handleTopUpRequest(
    @Payload() data: WalletTopUpRequestDto & { userId: string },
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.walletService.requestTopUp(data.userId, data);
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: CORE_WALLET_TOPUP_LIST_METHOD })
  async handleTopUpList(
    @Payload() data: { userId: string; page?: number; limit?: number },
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.walletService.listTopUps(
        data.userId,
        data?.page,
        data?.limit,
      );
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }
}
