import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletBalance } from './entities/wallet-balance.entity';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletBalance)
    private readonly walletBalanceRepository: Repository<WalletBalance>,
  ) {}

  async create(createWalletDto: CreateWalletDto): Promise<Wallet> {
    const existingWallet = await this.walletRepository.findOne({
      where: { address: createWalletDto.address.toLowerCase() },
    });

    if (existingWallet) {
      throw new ConflictException(`Wallet with address ${createWalletDto.address} already exists`);
    }

    const wallet = this.walletRepository.create({
      ...createWalletDto,
      address: createWalletDto.address.toLowerCase(),
      active: createWalletDto.active ?? true,
    });

    const savedWallet = await this.walletRepository.save(wallet);
    this.logger.log(`Created wallet ${savedWallet.address} with ID ${savedWallet.id}`);
    
    return savedWallet;
  }

  async findAll(activeOnly: boolean = false): Promise<Wallet[]> {
    const whereCondition = activeOnly ? { active: true } : {};
    
    return this.walletRepository.find({
      where: whereCondition,
      order: { createdAt: 'DESC' },
      relations: ['balances'],
    });
  }

  async findOne(id: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id },
      relations: ['balances'],
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${id} not found`);
    }

    return wallet;
  }

  async findByAddress(address: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { address: address.toLowerCase() },
      relations: ['balances'],
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with address ${address} not found`);
    }

    return wallet;
  }

  async update(id: string, updateWalletDto: UpdateWalletDto): Promise<Wallet> {
    const wallet = await this.findOne(id);

    if (updateWalletDto.address) {
      const existingWallet = await this.walletRepository.findOne({
        where: { 
          address: updateWalletDto.address.toLowerCase(),
          id: { $ne: id } as any, // Exclude current wallet from check
        },
      });

      if (existingWallet) {
        throw new ConflictException(`Wallet with address ${updateWalletDto.address} already exists`);
      }

      updateWalletDto.address = updateWalletDto.address.toLowerCase();
    }

    Object.assign(wallet, updateWalletDto);
    const updatedWallet = await this.walletRepository.save(wallet);
    
    this.logger.log(`Updated wallet ${updatedWallet.address} with ID ${updatedWallet.id}`);
    return updatedWallet;
  }

  async remove(id: string): Promise<void> {
    const wallet = await this.findOne(id);
    await this.walletRepository.remove(wallet);
    this.logger.log(`Deleted wallet ${wallet.address} with ID ${wallet.id}`);
  }

  async getActiveWallets(): Promise<Wallet[]> {
    return this.walletRepository.find({
      where: { active: true },
      order: { lastTracked: 'ASC' },
    });
  }

  async updateLastTracked(walletId: string): Promise<void> {
    await this.walletRepository.update(walletId, {
      lastTracked: new Date(),
    });
  }

  async getWalletBalances(
    walletId: string,
    options: {
      network?: string;
      whitelistedOnly?: boolean;
      excludeDust?: boolean;
    } = {},
  ): Promise<WalletBalance[]> {
    const queryBuilder = this.walletBalanceRepository
      .createQueryBuilder('balance')
      .where('balance.walletId = :walletId', { walletId });

    if (options.network) {
      queryBuilder.andWhere('balance.network = :network', { network: options.network });
    }

    if (options.whitelistedOnly) {
      queryBuilder.andWhere('balance.isWhitelisted = true');
    }

    if (options.excludeDust) {
      queryBuilder.andWhere('balance.isDust = false');
    }

    return queryBuilder
      .orderBy('balance.usdValue', 'DESC', 'NULLS LAST')
      .addOrderBy('balance.symbol', 'ASC')
      .getMany();
  }

  async getTotalUsdValue(walletId: string): Promise<number> {
    const result = await this.walletBalanceRepository
      .createQueryBuilder('balance')
      .select('SUM(balance.usdValue)', 'total')
      .where('balance.walletId = :walletId', { walletId })
      .andWhere('balance.usdValue IS NOT NULL')
      .andWhere('balance.isDust = false')
      .getRawOne();

    return parseFloat(result.total) || 0;
  }
}