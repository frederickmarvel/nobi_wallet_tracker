import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('whitelist_tokens')
@Index(['tokenAddress', 'network'], { unique: true })
export class WhitelistToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 42, nullable: true })
  @Index()
  tokenAddress: string; // null for native tokens

  @Column({ type: 'varchar', length: 50 })
  @Index()
  network: string; // e.g., 'eth-mainnet', 'polygon-mainnet'

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'int', nullable: true })
  decimals: number;

  @Column({ type: 'text', nullable: true })
  logo: string;

  @Column({ type: 'boolean', default: true })
  @Index()
  active: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  category: string; // e.g., 'stablecoin', 'defi', 'meme', etc.

  @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
  minBalance: string; // Minimum balance to track (to filter dust)

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}