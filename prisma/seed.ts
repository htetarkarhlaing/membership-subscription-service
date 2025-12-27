import 'dotenv/config';
import { PrismaClient, Prisma } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = `${process.env.DATABASE_URL}`;
const SALT_ROUNDS = 12;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter: adapter });

const addMonths = (date: Date, months: number) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.$transaction([
    prisma.transaction.deleteMany(),
    prisma.userSubscription.deleteMany(),
    prisma.subscriptionPlan.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const planDefinitions: Prisma.SubscriptionPlanCreateInput[] = [
    {
      name: 'Basic Monthly',
      slug: 'basic-monthly',
      description: 'Entry-level access billed monthly.',
      price: new Prisma.Decimal('19.99'),
      billingPeriod: 'MONTHLY',
      planDuration: 1,
    },
    {
      name: 'Pro Monthly',
      slug: 'pro-monthly',
      description: 'Full access billed monthly.',
      price: new Prisma.Decimal('39.99'),
      billingPeriod: 'MONTHLY',
      planDuration: 1,
    },
    {
      name: 'Business Annual',
      slug: 'business-annual',
      description: 'Best value annual plan for teams.',
      price: new Prisma.Decimal('399.99'),
      billingPeriod: 'YEARLY',
      planDuration: 12,
    },
  ];

  const plans = await Promise.all(
    planDefinitions.map((plan) =>
      prisma.subscriptionPlan.create({
        data: plan,
      }),
    ),
  );

  // Hash passwords before creating users
  const plainPasswords = [
    { email: 'admin@example.com', password: 'Password123!' },
    { email: 'casey.consumer@example.com', password: 'Password123!' },
    { email: 'sasha.suspended@example.com', password: 'Password123!' },
  ];

  const hashedPasswords = await Promise.all(
    plainPasswords.map(async (p) => ({
      email: p.email,
      hashedPassword: await bcrypt.hash(p.password, SALT_ROUNDS),
    })),
  );

  const userDefinitions: Prisma.UserCreateInput[] = [
    {
      email: 'admin@example.com',
      password: hashedPasswords[0].hashedPassword,
      firstName: 'Ada',
      lastName: 'Admin',
      UserRole: 'ADMIN',
      UserStatus: 'ACTIVE',
    },
    {
      email: 'casey.consumer@example.com',
      password: hashedPasswords[1].hashedPassword,
      firstName: 'Casey',
      lastName: 'Consumer',
      UserRole: 'CONSUMER',
      UserStatus: 'ACTIVE',
    },
    {
      email: 'sasha.suspended@example.com',
      password: hashedPasswords[2].hashedPassword,
      firstName: 'Sasha',
      lastName: 'Suspended',
      UserRole: 'CONSUMER',
      UserStatus: 'SUSPENDED',
    },
  ];

  const users = await Promise.all(
    userDefinitions.map((user) =>
      prisma.user.create({
        data: user,
      }),
    ),
  );

  console.log('👤 Created users with hashed passwords');

  const now = new Date();

  const subscriptions = await Promise.all(
    [
      {
        userId: users[1].id,
        planId: plans[1].id,
        status: 'ACTIVE' as const,
        subscriptionEndDate: addMonths(now, plans[1].planDuration),
        autoRenew: true,
      },
      {
        userId: users[1].id,
        planId: plans[2].id,
        status: 'CANCELED' as const,
        subscriptionEndDate: addMonths(now, plans[2].planDuration),
        autoRenew: false,
      },
      {
        userId: users[2].id,
        planId: plans[0].id,
        status: 'EXPIRED' as const,
        subscriptionEndDate: addMonths(now, plans[0].planDuration),
        autoRenew: false,
      },
    ].map((subscription) =>
      prisma.userSubscription.create({
        data: {
          ...subscription,
          subscriptionStartDate: now,
        },
      }),
    ),
  );

  const transactionsSeed: Prisma.TransactionCreateInput[] = [
    {
      user: { connect: { id: users[1].id } },
      subscription: { connect: { id: subscriptions[0].id } },
      amount: new Prisma.Decimal('39.99'),
      status: 'COMPLETED',
      processedAt: now,
    },
    {
      user: { connect: { id: users[1].id } },
      subscription: { connect: { id: subscriptions[1].id } },
      amount: new Prisma.Decimal('399.99'),
      status: 'REFUNDED',
      processedAt: addMonths(now, -1),
      failureReason: 'User canceled before renewal.',
    },
    {
      user: { connect: { id: users[2].id } },
      subscription: { connect: { id: subscriptions[2].id } },
      amount: new Prisma.Decimal('19.99'),
      status: 'FAILED',
      failureReason: 'Issuing bank declined the charge.',
    },
  ];

  await Promise.all(
    transactionsSeed.map((tx) =>
      prisma.transaction.create({
        data: tx,
      }),
    ),
  );

  console.log('✅ Database seeded.');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
