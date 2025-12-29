import { Controller } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import {
  CORE_ADMIN_MEMBERSHIP_REPORT_METHOD,
  CORE_ADMIN_PLAN_CREATE_METHOD,
  CORE_ADMIN_PLAN_DELETE_METHOD,
  CORE_ADMIN_PLAN_DETAIL_METHOD,
  CORE_ADMIN_PLAN_LIST_METHOD,
  CORE_ADMIN_PLAN_UPDATE_METHOD,
  CORE_ADMIN_SUBSCRIPTION_CANCEL_METHOD,
  RmqService,
} from '@app/common';
import {
  MembershipPlanCreateDto,
  MembershipPlanUpdateDto,
  MembershipCancelSubscriptionByAdminDto,
} from '@app/common/schema/core';
import { MembershipService } from './membership.service';

@Controller()
export class AdminMembershipController {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly rmqService: RmqService,
  ) {}

  @MessagePattern({ cmd: CORE_ADMIN_PLAN_CREATE_METHOD })
  async handleCreatePlan(
    @Payload() dto: MembershipPlanCreateDto,
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.membershipService.adminCreatePlan(dto);
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: CORE_ADMIN_PLAN_UPDATE_METHOD })
  async handleUpdatePlan(
    @Payload() data: MembershipPlanUpdateDto & { id: string },
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.membershipService.adminUpdatePlan(
        data.id,
        data,
      );
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: CORE_ADMIN_PLAN_DELETE_METHOD })
  async handleDeletePlan(
    @Payload() data: { id: string },
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.membershipService.adminDeletePlan(data.id);
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: CORE_ADMIN_PLAN_LIST_METHOD })
  async handleListPlans(@Ctx() context: RmqContext) {
    try {
      const response = await this.membershipService.adminListPlans();
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: CORE_ADMIN_PLAN_DETAIL_METHOD })
  async handlePlanDetail(
    @Payload() data: { id: string },
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.membershipService.adminPlanDetail(data.id);
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: CORE_ADMIN_SUBSCRIPTION_CANCEL_METHOD })
  async handleCancelSubscription(
    @Payload() data: MembershipCancelSubscriptionByAdminDto,
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.membershipService.adminCancelSubscription(
        data.userId,
      );
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: CORE_ADMIN_MEMBERSHIP_REPORT_METHOD })
  async handleMembershipReport(@Ctx() context: RmqContext) {
    try {
      const response = await this.membershipService.adminMembershipReport();
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }
}
