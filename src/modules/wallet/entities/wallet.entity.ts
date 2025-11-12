import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { WalletBalance } from './wallet-balance.entity';
import { TransactionHistory } from '../../transaction-history/entities/transaction-history.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 42, unique: true })
  @Index()
  address: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  @Index()
  active: boolean;

  @Column({ type: 'json', nullable: true })
  networks: string[]; // e.g., ['eth-mainnet', 'polygon-mainnet']

  @Column({ type: 'timestamp', nullable: true })
  lastTracked: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => WalletBalance, (balance) => balance.wallet, {
    cascade: true,
  })
  balances: WalletBalance[];

  @OneToMany(() => TransactionHistory, (transaction) => transaction.wallet, {
    cascade: true,
  })
  transactions: TransactionHistory[];
}