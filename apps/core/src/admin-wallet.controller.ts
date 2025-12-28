import { Controller } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import {
  CORE_ADMIN_PAYMENT_METHOD_CREATE_METHOD,
  CORE_ADMIN_PAYMENT_METHOD_LIST_METHOD,
  CORE_ADMIN_PAYMENT_METHOD_UPDATE_METHOD,
  CORE_ADMIN_TOPUP_APPROVE_METHOD,
  CORE_ADMIN_TOPUP_LIST_METHOD,
  CORE_ADMIN_TOPUP_REJECT_METHOD,
  RmqService,
} from '@app/common';
import {
  PaymentMethodCreateDto,
  PaymentMethodUpdateDto,
  WalletTopUpFilterDto,
  WalletTopUpIdDto,
  WalletTopUpRejectDto,
} from '@app/common/schema/core/wallet.dto';
import { WalletService } from './wallet.service';

@Controller()
export class AdminWalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly rmqService: RmqService,
  ) {}

  @MessagePattern({ cmd: CORE_ADMIN_PAYMENT_METHOD_CREATE_METHOD })
  async handleCreatePaymentMethod(
    @Payload() dto: PaymentMethodCreateDto,
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.walletService.adminCreatePaymentMethod(dto);
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: CORE_ADMIN_PAYMENT_METHOD_UPDATE_METHOD })
  async handleUpdatePaymentMethod(
    @Payload() dto: PaymentMethodUpdateDto,
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.walletService.adminUpdatePaymentMethod(
        dto.id,
        dto,
      );
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: CORE_ADMIN_PAYMENT_METHOD_LIST_METHOD })
  async handleListPaymentMethods(@Ctx() context: RmqContext) {
    try {
      const response = await this.walletService.adminListPaymentMethods();
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: CORE_ADMIN_TOPUP_LIST_METHOD })
  async handleListTopUps(
    @Payload() filter: WalletTopUpFilterDto,
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.walletService.adminListTopUps(filter);
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: CORE_ADMIN_TOPUP_APPROVE_METHOD })
  async handleApproveTopUp(
    @Payload() data: WalletTopUpIdDto,
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.walletService.adminApproveTopUp(data.id);
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: CORE_ADMIN_TOPUP_REJECT_METHOD })
  async handleRejectTopUp(
    @Payload() data: WalletTopUpRejectDto & { adminId: string },
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.walletService.adminRejectTopUp(
        data.id,
        data.adminId,
        data,
      );
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }
}
