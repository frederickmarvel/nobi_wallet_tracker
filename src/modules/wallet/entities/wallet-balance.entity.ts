import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { WhitelistToken } from '../../whitelist/entities/whitelist-token.entity';

@Entity('wallet_balances')
@Index(['walletId', 'tokenAddress', 'network'], { unique: true })
export class WalletBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  walletId: string;

  @Column({ type: 'varchar', length: 42, nullable: true })
  @Index()
  tokenAddress: string; // null for native tokens

  @Column({ type: 'varchar', length: 50 })
  @Index()
  network: string; // e.g., 'eth-mainnet', 'polygon-mainnet'

  @Column({ type: 'varchar', length: 78 }) // For large numbers as hex strings
  balance: string;

  @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
  balanceDecimal: string; // Human-readable balance

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  usdValue: number; // USD value if available

  @Column({ type: 'varchar', length: 20, nullable: true })
  symbol: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'int', nullable: true })
  decimals: number;

  @Column({ type: 'text', nullable: true })
  logo: string;

  @Column({ type: 'boolean', default: false })
  @Index()
  isWhitelisted: boolean;

  @Column({ type: 'boolean', default: false })
  @Index()
  isDust: boolean; // Flagged as dust/spam token

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Wallet, (wallet) => wallet.balances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;
}