import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhitelistToken } from './entities/whitelist-token.entity';
import { CreateWhitelistTokenDto } from './dto/create-whitelist-token.dto';
import { UpdateWhitelistTokenDto } from './dto/update-whitelist-token.dto';

@Injectable()
export class WhitelistService {
  private readonly logger = new Logger(WhitelistService.name);

  constructor(
    @InjectRepository(WhitelistToken)
    private readonly whitelistRepository: Repository<WhitelistToken>,
  ) {}

  async create(createDto: CreateWhitelistTokenDto): Promise<WhitelistToken> {
    const existing = await this.whitelistRepository.findOne({
      where: {
        tokenAddress: createDto.tokenAddress?.toLowerCase() || null,
        network: createDto.network,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Token ${createDto.tokenAddress || 'native'} already whitelisted for network ${createDto.network}`,
      );
    }

    const token = this.whitelistRepository.create({
      ...createDto,
      tokenAddress: createDto.tokenAddress?.toLowerCase() || null,
      active: createDto.active ?? true,
    });

    const savedToken = await this.whitelistRepository.save(token);
    this.logger.log(`Added token ${savedToken.symbol} to whitelist for ${savedToken.network}`);
    
    return savedToken;
  }

  async findAll(activeOnly: boolean = false): Promise<WhitelistToken[]> {
    const whereCondition = activeOnly ? { active: true } : {};
    
    return this.whitelistRepository.find({
      where: whereCondition,
      order: { symbol: 'ASC' },
    });
  }

  async findByNetwork(network: string, activeOnly: boolean = true): Promise<WhitelistToken[]> {
    const whereCondition = activeOnly 
      ? { network, active: true } 
      : { network };
    
    return this.whitelistRepository.find({
      where: whereCondition,
      order: { symbol: 'ASC' },
    });
  }

  async findOne(id: string): Promise<WhitelistToken> {
    const token = await this.whitelistRepository.findOne({ where: { id } });
    
    if (!token) {
      throw new NotFoundException(`Whitelist token with ID ${id} not found`);
    }
    
    return token;
  }

  async update(id: string, updateDto: UpdateWhitelistTokenDto): Promise<WhitelistToken> {
    const token = await this.findOne(id);

    if (updateDto.tokenAddress !== undefined || updateDto.network) {
      const tokenAddress = updateDto.tokenAddress?.toLowerCase() || token.tokenAddress;
      const network = updateDto.network || token.network;
      
      const existing = await this.whitelistRepository.findOne({
        where: {
          tokenAddress,
          network,
          id: { $ne: id } as any,
        },
      });

      if (existing) {
        throw new ConflictException(
          `Token ${tokenAddress || 'native'} already whitelisted for network ${network}`,
        );
      }
    }

    if (updateDto.tokenAddress !== undefined) {
      updateDto.tokenAddress = updateDto.tokenAddress?.toLowerCase() || null;
    }

    Object.assign(token, updateDto);
    const updatedToken = await this.whitelistRepository.save(token);
    
    this.logger.log(`Updated whitelist token ${updatedToken.symbol}`);
    return updatedToken;
  }

  async remove(id: string): Promise<void> {
    const token = await this.findOne(id);
    await this.whitelistRepository.remove(token);
    this.logger.log(`Removed token ${token.symbol} from whitelist`);
  }

  async isTokenWhitelisted(tokenAddress: string | null, network: string): Promise<boolean> {
    const token = await this.whitelistRepository.findOne({
      where: {
        tokenAddress: tokenAddress?.toLowerCase() || null,
        network,
        active: true,
      },
    });

    return !!token;
  }

  async getWhitelistedTokens(network?: string): Promise<WhitelistToken[]> {
    const whereCondition = network 
      ? { active: true, network } 
      : { active: true };
    
    return this.whitelistRepository.find({
      where: whereCondition,
      order: { network: 'ASC', symbol: 'ASC' },
    });
  }

  async createDefaultTokens(): Promise<void> {
    const defaultTokens = [
      // Ethereum Mainnet
      {
        tokenAddress: null,
        network: 'eth-mainnet',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        category: 'native',
        description: 'Native Ethereum token',
      },
      {
        tokenAddress: '0xa0b86a33e6ba23340b2b5b58c9634a4412ccdd0d',
        network: 'eth-mainnet',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        category: 'stablecoin',
        description: 'USD Coin stablecoin',
        minBalance: '0.01',
      },
      {
        tokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        network: 'eth-mainnet',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        category: 'stablecoin',
        description: 'Tether USD stablecoin',
        minBalance: '0.01',
      },
      {
        tokenAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
        network: 'eth-mainnet',
        symbol: 'WBTC',
        name: 'Wrapped Bitcoin',
        decimals: 8,
        category: 'btc',
        description: 'Wrapped Bitcoin',
        minBalance: '0.0001',
      },
      // Polygon Mainnet
      {
        tokenAddress: null,
        network: 'polygon-mainnet',
        symbol: 'MATIC',
        name: 'Polygon',
        decimals: 18,
        category: 'native',
        description: 'Native Polygon token',
        minBalance: '0.1',
      },
      {
        tokenAddress: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
        network: 'polygon-mainnet',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        category: 'stablecoin',
        description: 'USD Coin on Polygon',
        minBalance: '0.01',
      },
      {
        tokenAddress: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
        network: 'polygon-mainnet',
        symbol: 'WBTC',
        name: 'Wrapped Bitcoin',
        decimals: 8,
        category: 'btc',
        description: 'Wrapped Bitcoin on Polygon',
        minBalance: '0.0001',
      },
    ];

    for (const tokenData of defaultTokens) {
      try {
        const existing = await this.whitelistRepository.findOne({
          where: {
            tokenAddress: tokenData.tokenAddress,
            network: tokenData.network,
          },
        });

        if (!existing) {
          await this.whitelistRepository.save(
            this.whitelistRepository.create(tokenData),
          );
          this.logger.log(`Added default token ${tokenData.symbol} for ${tokenData.network}`);
        }
      } catch (error) {
        this.logger.error(`Failed to create default token ${tokenData.symbol}:`, error);
      }
    }
  }
}