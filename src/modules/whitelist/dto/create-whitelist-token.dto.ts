import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, Length, IsEthereumAddress, Min } from 'class-validator';

export class CreateWhitelistTokenDto {
  @ApiProperty({
    description: 'Token contract address (null for native tokens)',
    example: '0xa0b86a33e6ba23340b2b5b58c9634a4412ccdd0d',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEthereumAddress()
  tokenAddress?: string;

  @ApiProperty({
    description: 'Network where the token exists',
    example: 'eth-mainnet',
  })
  @IsString()
  @Length(1, 50)
  network: string;

  @ApiProperty({
    description: 'Token symbol',
    example: 'USDC',
  })
  @IsString()
  @Length(1, 20)
  symbol: string;

  @ApiProperty({
    description: 'Token name',
    example: 'USD Coin',
  })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    description: 'Token decimals',
    example: 18,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  decimals?: number;

  @ApiProperty({
    description: 'Token logo URL',
    example: 'https://example.com/logo.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({
    description: 'Token category',
    example: 'stablecoin',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  category?: string;

  @ApiProperty({
    description: 'Minimum balance to track (to filter dust)',
    example: '0.01',
    required: false,
  })
  @IsOptional()
  @IsString()
  minBalance?: string;

  @ApiProperty({
    description: 'Token description',
    example: 'USD Coin (USDC) is a stablecoin pegged to the US dollar',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Whether the token is active in whitelist',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}