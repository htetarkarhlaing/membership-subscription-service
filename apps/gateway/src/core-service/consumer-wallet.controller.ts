import { Body, Controller, Get, Inject, Post, Query, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  CORE_WALLET_PAYMENT_METHODS_METHOD,
  CORE_WALLET_SUMMARY_METHOD,
  CORE_WALLET_TOPUP_LIST_METHOD,
  CORE_WALLET_TOPUP_REQUEST_METHOD,
  CurrentUser,
  ErrorHandlerService,
  RpcClientService,
} from '@app/common';
import { WalletTopUpRequestDto } from '@app/common/schema/core';
import { ConsumerJwtAuthGuard } from '../auth-service/guards/consumer-jwt-auth.guard';
import { User } from 'generated/prisma/client';
import { RedisCacheService } from '../shared/redis-cache.service';

@ApiTags('Wallet - Consumer')
@Controller('wallet')
export class ConsumerWalletController {
  constructor(
    @Inject('CORE_SERVICE') private readonly coreClient: ClientProxy,
    private readonly rpcClient: RpcClientService,
    private readonly errorHandler: ErrorHandlerService,
    private readonly cache: RedisCacheService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(ConsumerJwtAuthGuard)
  @ApiOperation({ summary: 'Get wallet summary' })
  async summary(@CurrentUser() user: Omit<User, 'password'>) {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_WALLET_SUMMARY_METHOD },
        { userId: user.id },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, CORE_WALLET_SUMMARY_METHOD);
    }
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'List active payment methods' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async paymentMethods(@Query('page') page = 1, @Query('limit') limit = 10) {
    const numericPage = Math.floor(Number(page));
    const numericLimit = Math.floor(Number(limit));
    const safePage = Number.isFinite(numericPage) && numericPage > 0 ? numericPage : 1;
    const safeLimit = Number.isFinite(numericLimit) && numericLimit > 0
      ? Math.min(numericLimit, 50)
      : 10;

    const cacheKey = `wallet:payment-methods:${safePage}:${safeLimit}`;

    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;

      const result = await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_WALLET_PAYMENT_METHODS_METHOD },
        { page: safePage, limit: safeLimit },
      );
      await this.cache.set(cacheKey, result, 60);
      return result;
    } catch (error) {
      this.errorHandler.handleRpcError(
        error,
        CORE_WALLET_PAYMENT_METHODS_METHOD,
      );
    }
  }

  @Get('topups')
  @ApiBearerAuth()
  @UseGuards(ConsumerJwtAuthGuard)
  @ApiOperation({ summary: 'List own top-up requests' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async topUps(
    @CurrentUser() user: Omit<User, 'password'>,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const numericPage = Math.floor(Number(page));
    const numericLimit = Math.floor(Number(limit));
    const safePage = Number.isFinite(numericPage) && numericPage > 0 ? numericPage : 1;
    const safeLimit = Number.isFinite(numericLimit) && numericLimit > 0
      ? Math.min(numericLimit, 50)
      : 10;

    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_WALLET_TOPUP_LIST_METHOD },
        { userId: user.id, page: safePage, limit: safeLimit },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, CORE_WALLET_TOPUP_LIST_METHOD);
    }
  }

  @Post('topup')
  @ApiBearerAuth()
  @UseGuards(ConsumerJwtAuthGuard)
  @ApiOperation({ summary: 'Submit a wallet top-up request' })
  @ApiBody({ type: WalletTopUpRequestDto })
  async requestTopUp(
    @CurrentUser() user: Omit<User, 'password'>,
    @Body() dto: WalletTopUpRequestDto,
  ) {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_WALLET_TOPUP_REQUEST_METHOD },
        { userId: user.id, ...dto },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, CORE_WALLET_TOPUP_REQUEST_METHOD);
    }
  }
}
