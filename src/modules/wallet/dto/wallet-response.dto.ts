import { ApiProperty } from '@nestjs/swagger';

export class WalletResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '0x455e53cbb86018ac2b8092fdcd39d8444affc3f6' })
  address: string;

  @ApiProperty({ example: 'My Main Wallet' })
  name: string;

  @ApiProperty({ example: 'Primary wallet for DeFi activities' })
  description: string;

  @ApiProperty({ example: ['eth-mainnet', 'polygon-mainnet'] })
  networks: string[];

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ example: '2024-01-01T12:00:00Z' })
  lastTracked: Date;

  @ApiProperty({ example: '2024-01-01T10:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T12:00:00Z' })
  updatedAt: Date;
}