import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  CORE_ADMIN_MEMBERSHIP_REPORT_METHOD,
  CORE_ADMIN_PLAN_CREATE_METHOD,
  CORE_ADMIN_PLAN_DELETE_METHOD,
  CORE_ADMIN_PLAN_DETAIL_METHOD,
  CORE_ADMIN_PLAN_LIST_METHOD,
  CORE_ADMIN_PLAN_UPDATE_METHOD,
  CORE_ADMIN_SUBSCRIPTION_CANCEL_METHOD,
  ErrorHandlerService,
  RpcClientService,
} from '@app/common';
import {
  MembershipCancelSubscriptionByAdminDto,
  MembershipPlanCreateDto,
  MembershipPlanUpdateDto,
} from '@app/common/schema/core';
import { AdminJwtAuthGuard } from '../auth-service/guards/admin-jwt-auth.guard';

@ApiTags('Membership - Admin')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('admin-membership')
export class AdminMembershipController {
  constructor(
    @Inject('CORE_SERVICE')
    private readonly coreClient: ClientProxy,
    private readonly rpcClient: RpcClientService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'List all membership plans' })
  async listPlans() {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_ADMIN_PLAN_LIST_METHOD },
        {},
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, CORE_ADMIN_PLAN_LIST_METHOD);
    }
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create membership plan' })
  @ApiBody({ type: MembershipPlanCreateDto })
  async createPlan(@Body() dto: MembershipPlanCreateDto) {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_ADMIN_PLAN_CREATE_METHOD },
        dto,
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, CORE_ADMIN_PLAN_CREATE_METHOD);
    }
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Update membership plan' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: MembershipPlanUpdateDto })
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: MembershipPlanUpdateDto,
  ) {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_ADMIN_PLAN_UPDATE_METHOD },
        { id, ...dto },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, CORE_ADMIN_PLAN_UPDATE_METHOD);
    }
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Delete membership plan' })
  @ApiParam({ name: 'id' })
  async deletePlan(@Param('id') id: string) {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_ADMIN_PLAN_DELETE_METHOD },
        { id },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, CORE_ADMIN_PLAN_DELETE_METHOD);
    }
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get membership plan detail' })
  @ApiParam({ name: 'id' })
  async planDetail(@Param('id') id: string) {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_ADMIN_PLAN_DETAIL_METHOD },
        { id },
      );
    } catch (error) {
      this.errorHandler.handleRpcError(error, CORE_ADMIN_PLAN_DETAIL_METHOD);
    }
  }

  @Post('subscriptions/:userId/cancel')
  @ApiOperation({ summary: "Cancel a user's subscription" })
  @ApiParam({ name: 'userId' })
  async cancelSubscription(@Param('userId') userId: string) {
    try {
      const payload: MembershipCancelSubscriptionByAdminDto = { userId };
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_ADMIN_SUBSCRIPTION_CANCEL_METHOD },
        payload,
      );
    } catch (error) {
      this.errorHandler.handleRpcError(
        error,
        CORE_ADMIN_SUBSCRIPTION_CANCEL_METHOD,
      );
    }
  }

  @Get('report')
  @ApiOperation({ summary: 'Membership report' })
  async getReport() {
    try {
      return await this.rpcClient.send(
        this.coreClient,
        { cmd: CORE_ADMIN_MEMBERSHIP_REPORT_METHOD },
        {},
      );
    } catch (error) {
      this.errorHandler.handleRpcError(
        error,
        CORE_ADMIN_MEMBERSHIP_REPORT_METHOD,
      );
    }
  }
}
