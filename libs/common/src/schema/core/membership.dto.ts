import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import { BillingPeriod, Status } from 'generated/prisma/enums';

export class MembershipSubscribeDto {
  @ApiProperty({ description: 'Target subscription plan id' })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiPropertyOptional({ description: 'Whether to auto-renew the plan' })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

export class MembershipChangePlanDto {
  @ApiProperty({ description: 'New subscription plan id' })
  @IsString()
  @IsNotEmpty()
  targetPlanId: string;
}

export class MembershipCancelDto {
  // Intentionally empty; userId is injected from token in gateway.
}

export class MembershipPlanCreateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @ApiProperty({ description: 'Unique slug for the plan' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 9.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiProperty({ enum: BillingPeriod, default: BillingPeriod.MONTHLY })
  @IsEnum(BillingPeriod)
  billingPeriod: BillingPeriod;

  @ApiProperty({ description: 'Duration of the plan in months', example: 1 })
  @IsNumber()
  @IsPositive()
  planDuration: number;

  @ApiPropertyOptional({ enum: Status, description: 'Plan status' })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class MembershipPlanUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional({ description: 'Unique slug for the plan' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 9.99 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({ enum: BillingPeriod })
  @IsOptional()
  @IsEnum(BillingPeriod)
  billingPeriod?: BillingPeriod;

  @ApiPropertyOptional({
    description: 'Duration of the plan in months',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  planDuration?: number;

  @ApiPropertyOptional({ enum: Status, description: 'Plan status' })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

export class MembershipPlanParamsDto {
  @ApiProperty({ description: 'Plan identifier' })
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class MembershipCancelSubscriptionByAdminDto {
  @ApiProperty({ description: 'Target user id' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
