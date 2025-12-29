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
  CORE_MEMBERSHIP_CANCEL_METHOD,
  CORE_MEMBERSHIP_CHANGE_PLAN_METHOD,
  CORE_MEMBERSHIP_LIST_ACTIVE_METHOD,
  CORE_MEMBERSHIP_GET_SUBSCRIPTION_METHOD,
  CORE_MEMBERSHIP_SUBSCRIBE_METHOD,
  CurrentUser,
  ErrorHandlerService,
  RpcClientService,
} from '@app/common';
import {
  MembershipChangePlanDto,
  MembershipSubscribeDto,
} from '@app/common/schema/core';
import { ConsumerJwtAuthGuard } from '../auth-service/guards/consumer-jwt-auth.guard';
import { User } from 'generated/prisma/client';
import { RedisCacheService } from '../shared/redis-cache.service';

@ApiTags('Membership - Consumer')
@Controller('membership')
export class ConsumerMembershipController {
  constructor(
    @Inject('CORE_SERVICE')
    private readonly coreClient: ClientProxy,
    private readonly rpcClient: RpcClientService,
    private readonly errorHandler: ErrorHandlerService,
    private readonly cache: RedisCacheService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'List active membership plans' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getActivePlans(@Query('page') page = 1, @Query('limit') limit = 10) {
    const numericPage = Math.floor(Number(page));
    const numericLimit = Math.floor(Number(limit));
    const safePage =
      Number.isFinite(numericPage) && numericPage > 0 ? numericPage : 1;
    const safeLimit =
      Number.isFinite(numericLimit) && numericLimit > 0
        ? Math.min(numericLimit, 50)
        : 10;

    const cacheKey = `membership:plans:${safePage}:${safeLimit}`;

    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;

      const result = await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_MEMBERSHIP_LIST_ACTIVE_METHOD },
        { page: safePage, limit: safeLimit },
      );
      await this.cache.set(cacheKey, result, 60);
      return result;
    } catch (error) {
      this.errorHandler.handleRpcError(
        error,
        CORE_MEMBERSHIP_LIST_ACTIVE_METHOD,
      );
    }
  }

  @Post('subscribe')
  @ApiBearerAuth()
  @UseGuards(ConsumerJwtAuthGuard)
  @ApiOperation({ summary: 'Subscribe to a membership plan' })
  @ApiBody({ type: MembershipSubscribeDto })
  async subscribe(
    @CurrentUser() user: Omit<User, 'password'>,
    @Body() dto: MembershipSubscribeDto,
  ) {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_MEMBERSHIP_SUBSCRIBE_METHOD },
        { userId: user.id, ...dto },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, CORE_MEMBERSHIP_SUBSCRIBE_METHOD);
    }
  }

  @Get('subscription')
  @ApiBearerAuth()
  @UseGuards(ConsumerJwtAuthGuard)
  @ApiOperation({ summary: 'Get active subscription info' })
  async getSubscription(@CurrentUser() user: Omit<User, 'password'>) {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_MEMBERSHIP_GET_SUBSCRIPTION_METHOD },
        { userId: user.id },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(
        error,
        CORE_MEMBERSHIP_GET_SUBSCRIPTION_METHOD,
      );
    }
  }

  @Post('cancel')
  @ApiBearerAuth()
  @UseGuards(ConsumerJwtAuthGuard)
  @ApiOperation({ summary: 'Cancel active subscription' })
  async cancel(@CurrentUser() user: Omit<User, 'password'>) {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_MEMBERSHIP_CANCEL_METHOD },
        { userId: user.id },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, CORE_MEMBERSHIP_CANCEL_METHOD);
    }
  }

  @Post('change-plan')
  @ApiBearerAuth()
  @UseGuards(ConsumerJwtAuthGuard)
  @ApiOperation({ summary: 'Change subscription plan (upgrade/downgrade)' })
  @ApiBody({ type: MembershipChangePlanDto })
  async changePlan(
    @CurrentUser() user: Omit<User, 'password'>,
    @Body() dto: MembershipChangePlanDto,
  ) {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_MEMBERSHIP_CHANGE_PLAN_METHOD },
        { userId: user.id, ...dto },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(
        error,
        CORE_MEMBERSHIP_CHANGE_PLAN_METHOD,
      );
    }
  }
}
