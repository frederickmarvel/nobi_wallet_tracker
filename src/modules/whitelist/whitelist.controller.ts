import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { WhitelistService } from './whitelist.service';
import { CreateWhitelistTokenDto } from './dto/create-whitelist-token.dto';
import { UpdateWhitelistTokenDto } from './dto/update-whitelist-token.dto';

@ApiTags('whitelist')
@Controller('whitelist')
export class WhitelistController {
  constructor(private readonly whitelistService: WhitelistService) {}

  @Post()
  @ApiOperation({ summary: 'Add token to whitelist' })
  @ApiResponse({ status: 201, description: 'Token added to whitelist successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Token already whitelisted' })
  async create(@Body() createDto: CreateWhitelistTokenDto) {
    return this.whitelistService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all whitelisted tokens' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean, description: 'Filter active tokens only' })
  @ApiQuery({ name: 'network', required: false, description: 'Filter by network' })
  @ApiResponse({ status: 200, description: 'List of whitelisted tokens' })
  async findAll(
    @Query('activeOnly', new ParseBoolPipe({ optional: true })) activeOnly?: boolean,
    @Query('network') network?: string,
  ) {
    if (network) {
      return this.whitelistService.findByNetwork(network, activeOnly ?? true);
    }
    return this.whitelistService.findAll(activeOnly ?? false);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get whitelist token by ID' })
  @ApiParam({ name: 'id', description: 'Token UUID' })
  @ApiResponse({ status: 200, description: 'Token found' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.whitelistService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update whitelist token' })
  @ApiParam({ name: 'id', description: 'Token UUID' })
  @ApiResponse({ status: 200, description: 'Token updated successfully' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  @ApiResponse({ status: 409, description: 'Token already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateWhitelistTokenDto,
  ) {
    return this.whitelistService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove token from whitelist' })
  @ApiParam({ name: 'id', description: 'Token UUID' })
  @ApiResponse({ status: 200, description: 'Token removed successfully' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.whitelistService.remove(id);
    return { message: 'Token removed from whitelist successfully' };
  }

  @Post('initialize-defaults')
  @ApiOperation({ summary: 'Initialize default whitelisted tokens' })
  @ApiResponse({ status: 201, description: 'Default tokens initialized' })
  async initializeDefaults() {
    await this.whitelistService.createDefaultTokens();
    return { message: 'Default tokens initialized successfully' };
  }

  @Get('check/:network/:tokenAddress')
  @ApiOperation({ summary: 'Check if token is whitelisted' })
  @ApiParam({ name: 'network', description: 'Network name' })
  @ApiParam({ name: 'tokenAddress', description: 'Token address (use "native" for native tokens)' })
  @ApiResponse({ status: 200, description: 'Whitelist status' })
  async checkWhitelisted(
    @Param('network') network: string,
    @Param('tokenAddress') tokenAddress: string,
  ) {
    const address = tokenAddress === 'native' ? null : tokenAddress;
    const isWhitelisted = await this.whitelistService.isTokenWhitelisted(address, network);
    
    return {
      network,
      tokenAddress: address,
      isWhitelisted,
    };
  }
}