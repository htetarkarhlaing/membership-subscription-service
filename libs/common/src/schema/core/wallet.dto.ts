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
import { TopUpStatus } from 'generated/prisma/enums';

export class PaymentMethodCreateDto {
  @ApiProperty({ description: 'Display name for the payment method' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @ApiPropertyOptional({ description: 'Optional description or instruction' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the method is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PaymentMethodUpdateDto {
  @ApiProperty({ description: 'Payment method id' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class WalletTopUpRequestDto {
  @ApiProperty({
    description: 'Amount to top up (base amount, before tax)',
    example: 50,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Selected payment method id' })
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @ApiProperty({
    description: 'Payment reference / transaction id provided by user',
  })
  @IsString()
  @IsNotEmpty()
  transactionId: string;
}

export class WalletTopUpIdDto {
  @ApiProperty({ description: 'Top-up request id' })
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class WalletTopUpRejectDto extends WalletTopUpIdDto {
  @ApiPropertyOptional({ description: 'Reason for rejection' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;
}

export class WalletTopUpFilterDto {
  @ApiPropertyOptional({ enum: TopUpStatus })
  @IsOptional()
  @IsEnum(TopUpStatus)
  status?: TopUpStatus;
}
