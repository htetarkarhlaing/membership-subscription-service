import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@app/prisma';
import { Status, TopUpStatus } from 'generated/prisma/enums';
import { Prisma } from 'generated/prisma/client';
import {
  PaymentMethodCreateDto,
  PaymentMethodUpdateDto,
  WalletTopUpFilterDto,
  WalletTopUpRejectDto,
  WalletTopUpRequestDto,
} from '@app/common/schema/core';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  private async getWalletOrThrow(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'wallet.not_found',
      });
    }

    return wallet;
  }

  async summary(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        topUps: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!wallet) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'wallet.not_found',
      });
    }

    return {
      success: true,
      message: 'wallet.summary_retrieved',
      data: { wallet },
    };
  }

  async listPaymentMethods(page = 1, limit = 10) {
    const normalizedPage = Math.floor(Number(page));
    const normalizedLimit = Math.floor(Number(limit));
    const safePage = Number.isFinite(normalizedPage) && normalizedPage > 0 ? normalizedPage : 1;
    const safeLimit = Number.isFinite(normalizedLimit) && normalizedLimit > 0
      ? Math.min(normalizedLimit, 50)
      : 10;
    const skip = (safePage - 1) * safeLimit;

    const [methods, total] = await this.prisma.$transaction([
      this.prisma.paymentMethod.findMany({
        where: { Status: Status.ACTIVE },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.paymentMethod.count({ where: { Status: Status.ACTIVE } }),
    ]);

    return {
      success: true,
      message: 'wallet.payment_methods_retrieved',
      data: {
        methods,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pageCount: total > 0 ? Math.ceil(total / safeLimit) : 0,
        },
      },
    };
  }

  async adminCreatePaymentMethod(dto: PaymentMethodCreateDto) {
    const method = await this.prisma.paymentMethod.create({
      data: {
        name: dto.name,
        description: dto.description,
        Status: dto.isActive === false ? Status.INACTIVE : Status.ACTIVE,
      },
    });

    return {
      success: true,
      message: 'wallet_admin.payment_method_created',
      data: { method },
    };
  }

  async adminUpdatePaymentMethod(id: string, dto: PaymentMethodUpdateDto) {
    let statusUpdate;
    if (dto.isActive === true) {
      statusUpdate = Status.ACTIVE;
    } else if (dto.isActive === false) {
      statusUpdate = Status.INACTIVE;
    }

    const method = await this.prisma.paymentMethod.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        Status: statusUpdate,
      } as any,
    });

    return {
      success: true,
      message: 'wallet_admin.payment_method_updated',
      data: { method },
    };
  }

  async adminListPaymentMethods() {
    const methods = await this.prisma.paymentMethod.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'wallet_admin.payment_methods_retrieved',
      data: { methods },
    };
  }

  async requestTopUp(userId: string, dto: WalletTopUpRequestDto) {
    const [wallet, paymentMethod] = await Promise.all([
      this.getWalletOrThrow(userId),
      this.prisma.paymentMethod.findFirst({
        where: { id: dto.paymentMethodId, Status: Status.ACTIVE },
      }),
    ]);

    if (!paymentMethod) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'wallet.payment_method_not_found',
      });
    }

    const amount = new Prisma.Decimal(dto.amount);
    const topUp = await this.prisma.walletTopUp.create({
      data: {
        userId,
        walletId: wallet.id,
        paymentMethodId: dto.paymentMethodId,
        amount,
        status: TopUpStatus.PENDING,
        transactionRef: dto.transactionId,
      },
    });

    return {
      success: true,
      message: 'wallet.topup_requested',
      data: { topUpId: topUp.id },
    };
  }

  async listTopUps(userId: string, page = 1, limit = 10) {
    const normalizedPage = Math.floor(Number(page));
    const normalizedLimit = Math.floor(Number(limit));
    const safePage = Number.isFinite(normalizedPage) && normalizedPage > 0 ? normalizedPage : 1;
    const safeLimit = Number.isFinite(normalizedLimit) && normalizedLimit > 0
      ? Math.min(normalizedLimit, 50)
      : 10;
    const skip = (safePage - 1) * safeLimit;

    const [topUps, total] = await this.prisma.$transaction([
      this.prisma.walletTopUp.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.walletTopUp.count({ where: { userId } }),
    ]);

    return {
      success: true,
      message: 'wallet.topups_retrieved',
      data: {
        topUps,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pageCount: total > 0 ? Math.ceil(total / safeLimit) : 0,
        },
      },
    };
  }

  async adminListTopUps(filter?: WalletTopUpFilterDto) {
    const topUps = await this.prisma.walletTopUp.findMany({
      where: {
        ...(filter?.status ? { status: filter.status } : {}),
      },
      include: {
        paymentMethod: true,
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'wallet_admin.topups_retrieved',
      data: { topUps },
    };
  }

  async adminApproveTopUp(id: string) {
    const topUp = await this.prisma.walletTopUp.findUnique({
      where: { id },
      include: { wallet: true },
    });

    if (!topUp) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'wallet_admin.topup_not_found',
      });
    }

    if (topUp.status !== TopUpStatus.PENDING) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'wallet_admin.topup_already_processed',
      });
    }

    const creditedAmount = new Prisma.Decimal(topUp.amount);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedTopUp = await tx.walletTopUp.update({
        where: { id },
        data: {
          status: TopUpStatus.APPROVED,
          processedAt: new Date(),
        },
      });

      const wallet = await tx.wallet.update({
        where: { id: topUp.walletId },
        data: { balance: topUp.wallet.balance.add(creditedAmount) },
      });

      return { updatedTopUp, wallet };
    });

    return {
      success: true,
      message: 'wallet_admin.topup_approved',
      data: {
        topUpId: result.updatedTopUp.id,
        balance: result.wallet.balance,
      },
    };
  }

  async adminRejectTopUp(
    id: string,
    _adminId: string,
    dto: WalletTopUpRejectDto,
  ) {
    const topUp = await this.prisma.walletTopUp.findUnique({ where: { id } });

    if (!topUp) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'wallet_admin.topup_not_found',
      });
    }

    if (topUp.status !== TopUpStatus.PENDING) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'wallet_admin.topup_already_processed',
      });
    }

    await this.prisma.walletTopUp.update({
      where: { id },
      data: {
        status: TopUpStatus.REJECTED,
        adminNote: dto.reason,
        processedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'wallet_admin.topup_rejected',
      data: { topUpId: id },
    };
  }
}
