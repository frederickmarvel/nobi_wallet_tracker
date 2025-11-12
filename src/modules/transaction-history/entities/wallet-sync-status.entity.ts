import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Wallet } from '../../wallet/entities/wallet.entity';

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('wallet_sync_status')
@Index(['walletId', 'network'], { unique: true })
export class WalletSyncStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  @Index()
  walletId: string;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  network: string;

  @Column({
    type: 'enum',
    enum: SyncStatus,
    default: SyncStatus.PENDING,
  })
  status: SyncStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  lastSyncedBlock: string; // Last block that was synced (hex)

  @Column({ type: 'bigint', nullable: true })
  lastSyncedBlockDecimal: number; // Decimal version for easier querying

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastAttemptAt: Date;

  @Column({ type: 'int', default: 0 })
  transactionCount: number; // Total transactions synced

  @Column({ type: 'text', nullable: true })
  lastError: string;

  @Column({ type: 'int', default: 0 })
  errorCount: number;

  @Column({ type: 'boolean', default: true })
  autoSync: boolean; // Whether to automatically sync this wallet

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
