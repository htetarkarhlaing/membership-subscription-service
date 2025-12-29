import 'dotenv/config';
import { PrismaClient, Prisma } from '../generated/prisma/client';
import {
  BillingPeriod,
  SubscriptionStatus,
  PaymentStatus,
  TopUpStatus,
} from '../generated/prisma/enums';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = `${process.env.DATABASE_URL}`;
const SALT_ROUNDS = 12;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const addMonths = (date: Date, months: number) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const dec = (value: string | number) => new Prisma.Decimal(value);

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.$transaction([
    prisma.transaction.deleteMany(),
    prisma.walletTopUp.deleteMany(),
    prisma.userSubscription.deleteMany(),
    prisma.wallet.deleteMany(),
    prisma.subscriptionPlan.deleteMany(),
    prisma.paymentMethod.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  await prisma.paymentMethod.createMany({
    data: [
      { name: 'Bank Transfer', description: 'Manual bank transfer' },
      { name: 'Credit Card', description: 'Instant card payment' },
      { name: 'Cash', description: 'Cash at counter' },
    ],
  });

  await prisma.subscriptionPlan.createMany({
    data: [
      {
        name: 'Basic Monthly',
        slug: 'basic-monthly',
        description: 'Entry-level access billed monthly.',
        price: dec('19.99'),
        billingPeriod: BillingPeriod.MONTHLY,
        planDuration: 1,
      },
      {
        name: 'Pro Monthly',
        slug: 'pro-monthly',
        description: 'Full access billed monthly.',
        price: dec('39.99'),
        billingPeriod: BillingPeriod.MONTHLY,
        planDuration: 1,
      },
      {
        name: 'Business Annual',
        slug: 'business-annual',
        description: 'Best value annual plan for teams.',
        price: dec('399.99'),
        billingPeriod: BillingPeriod.YEARLY,
        planDuration: 12,
      },
    ],
  });

  const plainUsers = [
    {
      email: 'admin@example.com',
      password: 'Password123!',
      firstName: 'Ada',
      lastName: 'Admin',
      UserRole: 'ADMIN' as const,
      UserStatus: 'ACTIVE' as const,
    },
    {
      email: 'casey.consumer@example.com',
      password: 'Password123!',
      firstName: 'Casey',
      lastName: 'Consumer',
      UserRole: 'CONSUMER' as const,
      UserStatus: 'ACTIVE' as const,
    },
    {
      email: 'sasha.suspended@example.com',
      password: 'Password123!',
      firstName: 'Sasha',
      lastName: 'Suspended',
      UserRole: 'CONSUMER' as const,
      UserStatus: 'SUSPENDED' as const,
    },
  ];

  const hashed = await Promise.all(
    plainUsers.map(async (u) => ({
      ...u,
      password: await bcrypt.hash(u.password, SALT_ROUNDS),
    })),
  );

  const [admin, casey, sasha] = await Promise.all(
    hashed.map((u) => prisma.user.create({ data: u })),
  );

  const bankTransfer = await prisma.paymentMethod.findFirst({
    where: { name: 'Bank Transfer' },
  });
  if (!bankTransfer) {
    throw new Error('Bank Transfer payment method not seeded');
  }

  const [basicPlan] = await prisma.subscriptionPlan.findMany({
    where: { slug: 'basic-monthly' },
    take: 1,
  });
  if (!basicPlan) {
    throw new Error('Basic plan not seeded');
  }

  await prisma.wallet.create({
    data: {
      userId: admin.id,
      balance: dec('0'),
    },
  });

  const caseyWallet = await prisma.wallet.create({
    data: {
      userId: casey.id,
      balance: dec('180.01'),
    },
  });

  const sashaWallet = await prisma.wallet.create({
    data: {
      userId: sasha.id,
      balance: dec('0'),
    },
  });

  const now = new Date();
  const endDate = addMonths(now, basicPlan.planDuration);

  const subscription = await prisma.userSubscription.create({
    data: {
      userId: casey.id,
      planId: basicPlan.id,
      status: SubscriptionStatus.ACTIVE,
      subscriptionStartDate: now,
      subscriptionEndDate: endDate,
      autoRenew: true,
    },
  });

  await prisma.transaction.create({
    data: {
      userId: casey.id,
      subscriptionId: subscription.id,
      amount: dec('19.99'),
      PaymentStatus: PaymentStatus.SUCCESS,
    },
  });

  const processedAt = new Date(now.getTime() - 1000 * 60 * 60);

  if (bankTransfer) {
    await prisma.walletTopUp.createMany({
      data: [
        {
          userId: casey.id,
          walletId: caseyWallet.id,
          paymentMethodId: bankTransfer.id,
          amount: dec('200'),
          status: TopUpStatus.APPROVED,
          transactionRef: 'TOPUP-APPROVED-200',
          processedAt,
        },
        {
          userId: casey.id,
          walletId: caseyWallet.id,
          paymentMethodId: bankTransfer.id,
          amount: dec('50'),
          status: TopUpStatus.PENDING,
          transactionRef: 'TOPUP-PENDING-50',
        },
        {
          userId: sasha.id,
          walletId: sashaWallet.id,
          paymentMethodId: bankTransfer.id,
          amount: dec('75'),
          status: TopUpStatus.REJECTED,
          transactionRef: 'TOPUP-REJECTED-75',
          adminNote: 'Account suspended',
          processedAt,
        },
      ],
    });
  }

  console.log('✅ Seeded users, wallets, plans, top-ups, and subscriptions');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
