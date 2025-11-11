import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean, Length, IsEthereumAddress } from 'class-validator';

export class CreateWalletDto {
  @ApiProperty({
    description: 'Ethereum wallet address',
    example: '0x455e53cbb86018ac2b8092fdcd39d8444affc3f6',
  })
  @IsString()
  @IsEthereumAddress()
  address: string;

  @ApiProperty({
    description: 'Optional wallet name',
    example: 'My Main Wallet',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiProperty({
    description: 'Optional wallet description',
    example: 'Primary wallet for DeFi activities',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Networks to track for this wallet',
    example: ['eth-mainnet', 'polygon-mainnet'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  networks: string[];

  @ApiProperty({
    description: 'Whether the wallet is active for tracking',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}