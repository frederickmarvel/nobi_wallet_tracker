import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhitelistService } from './whitelist.service';
import { WhitelistController } from './whitelist.controller';
import { WhitelistToken } from './entities/whitelist-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WhitelistToken])],
  controllers: [WhitelistController],
  providers: [WhitelistService],
  exports: [WhitelistService],
})
export class WhitelistModule {}