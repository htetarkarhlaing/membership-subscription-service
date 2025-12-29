import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@app/prisma';
import {
  BillingPeriod,
  PaymentStatus,
  SubscriptionStatus,
} from 'generated/prisma/enums';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class SubscriptionScheduler {
  private readonly logger = new Logger(SubscriptionScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleRenewalsAndExpirations() {
    const now = new Date();
    try {
      const candidates = await this.prisma.userSubscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          subscriptionEndDate: { lte: now },
        },
        include: {
          plan: true,
          user: { select: { id: true } },
        },
      });

      for (const sub of candidates) {
        // Process each subscription in its own transaction to isolate failures
        await this.prisma.$transaction(async (tx) => {
          const current = await tx.userSubscription.findUnique({
            where: { id: sub.id },
            include: { plan: true },
          });

          if (!current || current.status !== SubscriptionStatus.ACTIVE) return;
          if (current.subscriptionEndDate > now) return; // already renewed elsewhere

          if (!current.autoRenew) {
            await tx.userSubscription.update({
              where: { id: current.id },
              data: { status: SubscriptionStatus.EXPIRED },
            });
            return;
          }

          const plan = current.plan;
          if (!plan) {
            await tx.userSubscription.update({
              where: { id: current.id },
              data: { status: SubscriptionStatus.EXPIRED },
            });
            return;
          }

          const wallet = await tx.wallet.findUnique({
            where: { userId: current.userId },
            select: { id: true, balance: true },
          });

          if (!wallet || wallet.balance.lt(new Prisma.Decimal(plan.price))) {
            await tx.userSubscription.update({
              where: { id: current.id },
              data: { status: SubscriptionStatus.EXPIRED },
            });
            return;
          }

          const amount = new Prisma.Decimal(plan.price);
          const months =
            plan.billingPeriod === BillingPeriod.YEARLY
              ? plan.planDuration * 12
              : plan.planDuration;
          const newEndDate = this.addMonths(
            current.subscriptionEndDate,
            months,
          );

          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: wallet.balance.minus(amount) },
          });

          await tx.userSubscription.update({
            where: { id: current.id },
            data: {
              subscriptionEndDate: newEndDate,
              status: SubscriptionStatus.ACTIVE,
            },
          });

          await tx.transaction.create({
            data: {
              userId: current.userId,
              subscriptionId: current.id,
              amount,
              PaymentStatus: PaymentStatus.SUCCESS,
            },
          });
        });
      }
    } catch (error) {
      this.logger.error('Subscription renewal job failed', error as Error);
    }
  }

  private addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }
}
