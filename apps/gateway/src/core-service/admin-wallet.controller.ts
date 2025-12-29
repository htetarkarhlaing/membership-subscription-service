import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  CORE_ADMIN_PAYMENT_METHOD_CREATE_METHOD,
  CORE_ADMIN_PAYMENT_METHOD_LIST_METHOD,
  CORE_ADMIN_PAYMENT_METHOD_UPDATE_METHOD,
  CORE_ADMIN_TOPUP_APPROVE_METHOD,
  CORE_ADMIN_TOPUP_LIST_METHOD,
  CORE_ADMIN_TOPUP_REJECT_METHOD,
  CurrentUser,
  ErrorHandlerService,
  RpcClientService,
} from '@app/common';
import {
  PaymentMethodCreateDto,
  PaymentMethodUpdateDto,
  WalletTopUpFilterDto,
  WalletTopUpIdDto,
  WalletTopUpRejectDto,
} from '@app/common/schema/core';
import { AdminJwtAuthGuard } from '../auth-service/guards/admin-jwt-auth.guard';
import { User } from 'generated/prisma/client';

@ApiTags('Wallet - Admin')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/wallet')
export class AdminWalletController {
  constructor(
    @Inject('CORE_SERVICE') private readonly coreClient: ClientProxy,
    private readonly rpcClient: RpcClientService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  @Post('payment-method')
  @ApiOperation({ summary: 'Create payment method' })
  @ApiBody({ type: PaymentMethodCreateDto })
  async createPaymentMethod(@Body() dto: PaymentMethodCreateDto) {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_ADMIN_PAYMENT_METHOD_CREATE_METHOD },
        dto,
      );
    } catch (error) {
      this.errorHandler.handleRpcError(
        error,
        CORE_ADMIN_PAYMENT_METHOD_CREATE_METHOD,
      );
    }
  }

  @Post('payment-method/update')
  @ApiOperation({ summary: 'Update payment method' })
  @ApiBody({ type: PaymentMethodUpdateDto })
  async updatePaymentMethod(@Body() dto: PaymentMethodUpdateDto) {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_ADMIN_PAYMENT_METHOD_UPDATE_METHOD },
        dto,
      );
    } catch (error) {
      this.errorHandler.handleRpcError(
        error,
        CORE_ADMIN_PAYMENT_METHOD_UPDATE_METHOD,
      );
    }
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'List payment methods' })
  async listPaymentMethods() {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_ADMIN_PAYMENT_METHOD_LIST_METHOD },
        {},
      );
    } catch (error) {
      this.errorHandler.handleRpcError(
        error,
        CORE_ADMIN_PAYMENT_METHOD_LIST_METHOD,
      );
    }
  }

  @Get('topups')
  @ApiOperation({ summary: 'List top-up requests' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
  })
  async listTopUps(@Query() filter: WalletTopUpFilterDto) {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_ADMIN_TOPUP_LIST_METHOD },
        filter,
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, CORE_ADMIN_TOPUP_LIST_METHOD);
    }
  }

  @Post('topup/approve')
  @ApiOperation({ summary: 'Approve a top-up request' })
  @ApiBody({ type: WalletTopUpIdDto })
  async approveTopUp(
    @CurrentUser() admin: Omit<User, 'password'>,
    @Body() dto: WalletTopUpIdDto,
  ) {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_ADMIN_TOPUP_APPROVE_METHOD },
        { adminId: admin.id, ...dto },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, CORE_ADMIN_TOPUP_APPROVE_METHOD);
    }
  }

  @Post('topup/reject')
  @ApiOperation({ summary: 'Reject a top-up request' })
  @ApiBody({ type: WalletTopUpRejectDto })
  async rejectTopUp(
    @CurrentUser() admin: Omit<User, 'password'>,
    @Body() dto: WalletTopUpRejectDto,
  ) {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_ADMIN_TOPUP_REJECT_METHOD },
        { adminId: admin.id, ...dto },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, CORE_ADMIN_TOPUP_REJECT_METHOD);
    }
  }
}
