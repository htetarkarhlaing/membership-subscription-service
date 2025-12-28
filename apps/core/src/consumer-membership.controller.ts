import { Controller } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import {
  CORE_MEMBERSHIP_CANCEL_METHOD,
  CORE_MEMBERSHIP_CHANGE_PLAN_METHOD,
  CORE_MEMBERSHIP_LIST_ACTIVE_METHOD,
  CORE_MEMBERSHIP_SUBSCRIBE_METHOD,
  CORE_MEMBERSHIP_GET_SUBSCRIPTION_METHOD,
  RmqService,
} from '@app/common';
import {
  MembershipSubscribeDto,
  MembershipChangePlanDto,
} from '@app/common/schema/core';
import { MembershipService } from './membership.service';

@Controller()
export class ConsumerMembershipController {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly rmqService: RmqService,
  ) {}

  @MessagePattern({ cmd: CORE_MEMBERSHIP_LIST_ACTIVE_METHOD })
  async handleListActive(
    @Payload() data: { page?: number; limit?: number },
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.membershipService.listActivePlans(
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

  @MessagePattern({ cmd: CORE_MEMBERSHIP_SUBSCRIBE_METHOD })
  async handleSubscribe(
    @Payload() data: MembershipSubscribeDto & { userId: string },
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.membershipService.subscribe(
        data.userId,
        data.planId,
        data.autoRenew,
      );
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: CORE_MEMBERSHIP_CANCEL_METHOD })
  async handleCancel(
    @Payload() data: { userId: string },
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.membershipService.cancelSubscription(
        data.userId,
      );
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: CORE_MEMBERSHIP_CHANGE_PLAN_METHOD })
  async handleChangePlan(
    @Payload() data: MembershipChangePlanDto & { userId: string },
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.membershipService.changePlan(
        data.userId,
        data.targetPlanId,
      );
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }

  @MessagePattern({ cmd: CORE_MEMBERSHIP_GET_SUBSCRIPTION_METHOD })
  async handleGetSubscription(
    @Payload() data: { userId: string },
    @Ctx() context: RmqContext,
  ) {
    try {
      const response = await this.membershipService.getSubscription(
        data.userId,
      );
      this.rmqService.ack(context);
      return response;
    } catch (error) {
      this.rmqService.ack(context);
      throw error;
    }
  }
}
