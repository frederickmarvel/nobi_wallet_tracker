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

export enum TransactionCategory {
  EXTERNAL = 'external',
  INTERNAL = 'internal',
  ERC20 = 'erc20',
  ERC721 = 'erc721',
  ERC1155 = 'erc1155',
}

export enum TransactionDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
}

@Entity('transaction_history')
@Index(['walletId', 'network', 'timestamp'])
@Index(['hash', 'network'], { unique: true })
@Index(['blockNum', 'network'])
export class TransactionHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 66 })
  @Index()
  hash: string;

  @Column({ type: 'varchar', length: 42 })
  @Index()
  fromAddress: string;

  @Column({ type: 'varchar', length: 42 })
  @Index()
  toAddress: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  network: string; // e.g., 'eth-mainnet', 'polygon-mainnet', 'arbitrum-mainnet'

  @Column({ type: 'varchar', length: 20 })
  blockNum: string; // Stored as hex string

  @Column({ type: 'bigint' })
  @Index()
  blockNumDecimal: number; // Decimal version for easier querying

  @Column({ type: 'timestamp' })
  @Index()
  timestamp: Date;

  @Column({
    type: 'enum',
    enum: TransactionCategory,
  })
  category: TransactionCategory;

  @Column({
    type: 'enum',
    enum: TransactionDirection,
  })
  @Index()
  direction: TransactionDirection; // Relative to the wallet

  @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
  value: string; // Decimal value

  @Column({ type: 'varchar', length: 10, nullable: true })
  asset: string; // Token symbol (ETH, USDC, etc.)

  @Column({ type: 'varchar', length: 42, nullable: true })
  tokenAddress: string; // Token contract address (null for native tokens)

  @Column({ type: 'varchar', length: 255, nullable: true })
  tokenId: string; // For NFTs (ERC721/ERC1155)

  @Column({ type: 'json', nullable: true })
  erc721TokenId: any; // Original ERC721 token ID data

  @Column({ type: 'json', nullable: true })
  erc1155Metadata: any; // Array of {tokenId, value} for ERC1155

  @Column({ type: 'json', nullable: true })
  rawContract: any; // Raw contract data from Alchemy

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  usdValue: string; // USD value at time of transaction (if available)

  @Column({ type: 'text', nullable: true })
  metadata: string; // Additional metadata as JSON string

  @Column({ type: 'boolean', default: false })
  isWhitelisted: boolean; // Whether the token is whitelisted

  @Column({ type: 'varchar', length: 36 })
  @Index()
  walletId: string;

  @Column({ type: 'varchar', length: 42 })
  @Index()
  walletAddress: string; // The wallet address being tracked (for direct filtering)

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
