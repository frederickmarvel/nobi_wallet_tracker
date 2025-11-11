import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { TrackerService } from './tracker.service';

@ApiTags('tracker')
@Controller('tracker')
export class TrackerController {
  constructor(private readonly trackerService: TrackerService) {}

  @Post('track-all')
  @ApiOperation({ summary: 'Manually trigger tracking for all active wallets' })
  @ApiResponse({ status: 200, description: 'Tracking started' })
  async trackAllWallets() {
    await this.trackerService.trackAllWallets();
    return { message: 'Wallet tracking completed successfully' };
  }

  @Post('track/:walletId')
  @ApiOperation({ summary: 'Manually trigger tracking for a specific wallet' })
  @ApiParam({ name: 'walletId', description: 'Wallet UUID' })
  @ApiResponse({ status: 200, description: 'Wallet tracked successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async trackWallet(@Param('walletId', ParseUUIDPipe) walletId: string) {
    return this.trackerService.forceTrackWallet(walletId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get tracking statistics' })
  @ApiResponse({ status: 200, description: 'Tracking statistics' })
  async getStats() {
    return this.trackerService.getTrackingStats();
  }
}