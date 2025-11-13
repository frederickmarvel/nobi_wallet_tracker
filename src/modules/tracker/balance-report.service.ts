import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

interface WalletBalanceReport {
  walletName: string;
  walletAddress: string;
  network: string;
  tokens: {
    symbol: string;
    name: string;
    balance: string;
    usdValue: number | null;
    isWhitelisted: boolean;
    isDust: boolean;
  }[];
  totalUsdValue: number;
}

@Injectable()
export class BalanceReportService {
  private readonly logger = new Logger(BalanceReportService.name);
  private readonly reportsDir = path.join(process.cwd(), 'reports');

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletBalance)
    private readonly walletBalanceRepository: Repository<WalletBalance>,
  ) {
    this.ensureReportsDirectory();
  }

  private async ensureReportsDirectory() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
      this.logger.log(`Reports directory ready: ${this.reportsDir}`);
    } catch (error) {
      this.logger.error('Failed to create reports directory:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyReport(): Promise<void> {
    this.logger.log('Starting daily balance report generation');
    
    try {
      const report = await this.generateReport();
      await this.saveReport(report);
      
      this.logger.log('Daily balance report generated successfully');
    } catch (error) {
      this.logger.error('Failed to generate daily balance report:', error);
    }
  }

  async generateReport(): Promise<WalletBalanceReport[]> {
    const wallets = await this.walletRepository.find({
      where: { active: true },
      order: { name: 'ASC' },
    });

    if (wallets.length === 0) {
      this.logger.warn('No active wallets found for report generation');
      return [];
    }

    const reports: WalletBalanceReport[] = [];

    for (const wallet of wallets) {
      const balances = await this.walletBalanceRepository.find({
        where: { walletId: wallet.id },
        order: { usdValue: 'DESC' },
      });

      // Group balances by network
      const networkGroups = this.groupByNetwork(balances);

      for (const [network, networkBalances] of Object.entries(networkGroups)) {
        const tokens = networkBalances.map((balance) => ({
          symbol: balance.symbol || 'UNKNOWN',
          name: balance.name || 'Unknown Token',
          balance: balance.balanceDecimal || '0',
          usdValue: balance.usdValue ? parseFloat(balance.usdValue.toString()) : null,
          isWhitelisted: balance.isWhitelisted,
          isDust: balance.isDust,
        }));

        const totalUsdValue = tokens.reduce(
          (sum, token) => sum + (token.usdValue || 0),
          0,
        );

        reports.push({
          walletName: wallet.name || wallet.address,
          walletAddress: wallet.address,
          network,
          tokens,
          totalUsdValue,
        });
      }
    }

    return reports;
  }

  private groupByNetwork(balances: WalletBalance[]): Record<string, WalletBalance[]> {
    return balances.reduce((acc, balance) => {
      if (!acc[balance.network]) {
        acc[balance.network] = [];
      }
      acc[balance.network].push(balance);
      return acc;
    }, {} as Record<string, WalletBalance[]>);
  }

  private async saveReport(reports: WalletBalanceReport[]): Promise<void> {
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().split('T')[0];
    const filename = `balance-report-${dateStr}.json`;
    const filepath = path.join(this.reportsDir, filename);

    const reportData = {
      generatedAt: timestamp.toISOString(),
      totalWallets: new Set(reports.map((r) => r.walletAddress)).size,
      totalNetworks: new Set(reports.map((r) => r.network)).size,
      grandTotalUsd: reports.reduce((sum, r) => sum + r.totalUsdValue, 0),
      wallets: reports,
    };

    await fs.writeFile(filepath, JSON.stringify(reportData, null, 2), 'utf-8');
    this.logger.log(`Report saved to: ${filepath}`);

    // Also save as CSV for easier viewing
    await this.saveCsvReport(reports, dateStr);

    // Also save a "latest" copy
    const latestPath = path.join(this.reportsDir, 'balance-report-latest.json');
    await fs.writeFile(latestPath, JSON.stringify(reportData, null, 2), 'utf-8');
  }

  private async saveCsvReport(
    reports: WalletBalanceReport[],
    dateStr: string,
  ): Promise<void> {
    const filename = `balance-report-${dateStr}.csv`;
    const filepath = path.join(this.reportsDir, filename);

    const lines: string[] = [
      'Wallet Name,Wallet Address,Network,Token Symbol,Token Name,Balance,USD Value,Whitelisted,Dust',
    ];

    for (const report of reports) {
      for (const token of report.tokens) {
        lines.push(
          [
            `"${report.walletName}"`,
            report.walletAddress,
            report.network,
            token.symbol,
            `"${token.name}"`,
            token.balance,
            token.usdValue?.toFixed(2) || '0',
            token.isWhitelisted ? 'Yes' : 'No',
            token.isDust ? 'Yes' : 'No',
          ].join(','),
        );
      }
    }

    await fs.writeFile(filepath, lines.join('\n'), 'utf-8');
    this.logger.log(`CSV report saved to: ${filepath}`);

    // Also save a "latest" copy
    const latestPath = path.join(this.reportsDir, 'balance-report-latest.csv');
    await fs.writeFile(latestPath, lines.join('\n'), 'utf-8');
  }

  async getLatestReport(): Promise<any> {
    const latestPath = path.join(this.reportsDir, 'balance-report-latest.json');
    
    try {
      const content = await fs.readFile(latestPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      this.logger.warn('No latest report found');
      return null;
    }
  }

  async listReports(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.reportsDir);
      return files
        .filter((file) => file.startsWith('balance-report-') && !file.includes('latest'))
        .sort()
        .reverse();
    } catch (error) {
      this.logger.error('Failed to list reports:', error);
      return [];
    }
  }

  async getReportByDate(dateStr: string): Promise<any> {
    const filename = `balance-report-${dateStr}.json`;
    const filepath = path.join(this.reportsDir, filename);
    
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      this.logger.warn(`Report not found for date: ${dateStr}`);
      return null;
    }
  }

  async generateReportNow(): Promise<any> {
    this.logger.log('Generating report on demand');
    const reports = await this.generateReport();
    await this.saveReport(reports);
    return this.getLatestReport();
  }
}
