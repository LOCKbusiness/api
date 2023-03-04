import { Controller, UseGuards, Get, Query } from '@nestjs/common';
import { Body, Post } from '@nestjs/common/decorators';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { DbQueryDto } from 'src/subdomains/support/application/dto/db-query.dto';
import { SupportDataQuery, SupportReturnData } from '../../application/dto/support-data.dto';
import { SupportService } from '../../application/services/support.service';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('db')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async getRawDataDeprecated(
    @Query()
    query: DbQueryDto,
  ): Promise<{ keys: any; values: any }> {
    return this.supportService.getRawDataDeprecated(query);
  }

  @Post('db')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async getRawData(
    @Body()
    query: DbQueryDto,
  ): Promise<{ keys: string[]; values: any }> {
    return this.supportService.getRawData(query);
  }

  @Get()
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.SUPPORT))
  async getSupportData(@Query() query: SupportDataQuery): Promise<SupportReturnData> {
    return this.supportService.getSupportData(query);
  }
}
