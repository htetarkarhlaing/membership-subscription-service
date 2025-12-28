import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { RpcException } from '@nestjs/microservices';
import { SubscriptionStatus, PaymentStatus, Status } from 'generated/prisma/enums';
import {
  MembershipPlanCreateDto,
  MembershipPlanUpdateDto,
} from '@app/common/schema/core';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  private addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  private async getWalletOrThrow(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });

    if (!wallet) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'wallet.not_found',
      });
    }

    return wallet;
  }

  async listActivePlans(page = 1, limit = 10) {
    const normalizedPage = Math.floor(Number(page));
    const normalizedLimit = Math.floor(Number(limit));
    const safePage = Number.isFinite(normalizedPage) && normalizedPage > 0 ? normalizedPage : 1;
    const safeLimit = Number.isFinite(normalizedLimit) && normalizedLimit > 0
      ? Math.min(normalizedLimit, 50)
      : 10;
    const skip = (safePage - 1) * safeLimit;

    const [plans, total] = await this.prisma.$transaction([
      this.prisma.subscriptionPlan.findMany({
        where: {
          Status: Status.ACTIVE,
        },
        orderBy: { price: 'asc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.subscriptionPlan.count({
        where: { Status: Status.ACTIVE },
      }),
    ]);

    return {
      success: true,
      message: 'membership.plans_retrieved',
      data: {
        plans,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pageCount: total > 0 ? Math.ceil(total / safeLimit) : 0,
        },
      },
    };
  }

  async subscribe(userId: string, planId: string, autoRenew = true) {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { id: planId, Status: Status.ACTIVE },
    });

    if (!plan) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'membership.plan_not_found_or_inactive',
      });
    }

    const wallet = await this.getWalletOrThrow(userId);

    const existingActive = await this.prisma.userSubscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });

    if (existingActive) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'membership.active_subscription_exists',
      });
    }

    const chargeAmount = new Prisma.Decimal(plan.price);

    if (wallet.balance.lt(chargeAmount)) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'wallet.insufficient_balance',
      });
    }

    const endDate = this.addMonths(new Date(), plan.planDuration);

    const result = await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.userSubscription.create({
        data: {
          userId,
          planId,
          status: SubscriptionStatus.ACTIVE,
          subscriptionEndDate: endDate,
          autoRenew,
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: wallet.balance.minus(chargeAmount) },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          subscriptionId: subscription.id,
          amount: chargeAmount,
          PaymentStatus: PaymentStatus.SUCCESS,
        },
      });

      return { subscription, transaction };
    });

    return {
      success: true,
      message: 'membership.subscribed_successfully',
      data: {
        subscriptionId: result.subscription.id,
        transactionId: result.transaction.id,
      },
    };
  }

  async cancelSubscription(userId: string) {
    const active = await this.prisma.userSubscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });

    if (!active) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'membership.active_subscription_not_found',
      });
    }

    const canceled = await this.prisma.userSubscription.update({
      where: { id: active.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        autoRenew: false,
        subscriptionEndDate: new Date(),
      },
    });

    return {
      success: true,
      message: 'membership.subscription_canceled',
      data: { subscriptionId: canceled.id },
    };
  }

  async changePlan(userId: string, targetPlanId: string) {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { id: targetPlanId, Status: Status.ACTIVE },
    });

    if (!plan) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'membership.plan_not_found_or_inactive',
      });
    }

    const wallet = await this.getWalletOrThrow(userId);

    const active = await this.prisma.userSubscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });

    const autoRenewPreference = active?.autoRenew ?? true;

    const endDate = this.addMonths(new Date(), plan.planDuration);
    const chargeAmount = new Prisma.Decimal(plan.price);

    if (wallet.balance.lt(chargeAmount)) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'wallet.insufficient_balance',
      });
    }

    if (!active) {
      return this.subscribe(userId, targetPlanId, autoRenewPreference);
    }

    if (active.planId === targetPlanId) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'membership.already_subscribed',
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.userSubscription.update({
        where: { id: active.id },
        data: {
          planId: targetPlanId,
          subscriptionStartDate: new Date(),
          subscriptionEndDate: endDate,
          status: SubscriptionStatus.ACTIVE,
          autoRenew: autoRenewPreference,
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: wallet.balance.minus(chargeAmount) },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          subscriptionId: updated.id,
          amount: chargeAmount,
          PaymentStatus: PaymentStatus.SUCCESS,
        },
      });

      return { updated, transaction };
    });

    return {
      success: true,
      message: 'membership.plan_changed',
      data: {
        subscriptionId: result.updated.id,
        transactionId: result.transaction.id,
      },
    };
  }

  async adminCreatePlan(dto: MembershipPlanCreateDto) {
    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        price: dto.price,
        billingPeriod: dto.billingPeriod,
        planDuration: dto.planDuration,
        Status: dto.status ?? Status.ACTIVE,
      },
    });

    return {
      success: true,
      message: 'membership_admin.plan_created',
      data: { plan },
    };
  }

  async adminUpdatePlan(id: string, dto: MembershipPlanUpdateDto) {
    const plan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        price: dto.price,
        billingPeriod: dto.billingPeriod,
        planDuration: dto.planDuration,
        Status: dto.status,
      } as any,
    });

    return {
      success: true,
      message: 'membership_admin.plan_updated',
      data: { plan },
    };
  }

  async adminDeletePlan(id: string) {
    await this.prisma.subscriptionPlan.delete({ where: { id } });

    return {
      success: true,
      message: 'membership_admin.plan_deleted',
      data: null,
    };
  }

  async adminListPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'membership_admin.plans_retrieved',
      data: { plans },
    };
  }

  async adminPlanDetail(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'membership_admin.plan_not_found',
      });
    }

    return {
      success: true,
      message: 'membership_admin.plan_retrieved',
      data: { plan },
    };
  }

  async adminCancelSubscription(userId: string) {
    const active = await this.prisma.userSubscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });

    if (!active) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'membership_admin.active_subscription_not_found',
      });
    }

    const canceled = await this.prisma.userSubscription.update({
      where: { id: active.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        autoRenew: false,
        subscriptionEndDate: new Date(),
      },
    });

    return {
      success: true,
      message: 'membership_admin.subscription_canceled',
      data: { subscriptionId: canceled.id },
    };
  }

  async adminMembershipReport() {
    const [
      plansTotal,
      activePlans,
      subscriptionsActive,
      subscriptionsCanceled,
      subscriptionsExpired,
      revenue,
      transactionsTotal,
      transactionsCompleted,
      transactionsFailed,
      lastTransaction,
    ] = await Promise.all([
      this.prisma.subscriptionPlan.count(),
      this.prisma.subscriptionPlan.count({ where: { Status: Status.ACTIVE } }),
      this.prisma.userSubscription.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
      this.prisma.userSubscription.count({
        where: { status: SubscriptionStatus.CANCELED },
      }),
      this.prisma.userSubscription.count({
        where: { status: SubscriptionStatus.EXPIRED },
      }),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          PaymentStatus: PaymentStatus.SUCCESS,
        },
      }),
      this.prisma.transaction.count(),
      this.prisma.transaction.count({
        where: {
          PaymentStatus: PaymentStatus.SUCCESS,
        },
      }),
      this.prisma.transaction.count({
        where: { PaymentStatus: PaymentStatus.FAILED },
      }),
      this.prisma.transaction.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { id: true, amount: true, PaymentStatus: true, createdAt: true },
      }),
    ]);

    return {
      success: true,
      message: 'membership_admin.report_generated',
      transactions: {
        total: transactionsTotal,
        success: transactionsCompleted,
        failed: transactionsFailed,
        last: lastTransaction,
      },
      data: {
        plans: {
          total: plansTotal,
          active: activePlans,
        },
        subscriptions: {
          active: subscriptionsActive,
          canceled: subscriptionsCanceled,
          expired: subscriptionsExpired,
        },
        revenue: {
          total: revenue._sum.amount ?? 0,
        },
      },
    };
  }

  async getSubscription(userId: string) {
    const subscription = await this.prisma.userSubscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      include: {
        plan: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!subscription) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'membership.active_subscription_not_found',
      });
    }

    return {
      success: true,
      message: 'membership.subscription_retrieved',
      data: { subscription },
    };
  }
}
