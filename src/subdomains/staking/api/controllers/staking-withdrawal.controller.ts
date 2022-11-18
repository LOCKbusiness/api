import { Controller, UseGuards, Body, Post, Param, Patch, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { StakingWithdrawalService } from '../../application/services/staking-withdrawal.service';
import { SignWithdrawalDto } from '../../application/dto/input/sign-withdrawal.dto';
import { StakingOutputDto } from '../../application/dto/output/staking.output.dto';
import { WithdrawalDraftOutputDto } from '../../application/dto/output/withdrawal-draft.output.dto';
import { CreateWithdrawalDraftDto } from '../../application/dto/input/create-withdrawal-draft.dto';
import { ChangeWithdrawalAmountDto } from '../../application/dto/input/change-withdrawal-amount.dto';

@ApiTags('Withdrawal')
@Controller('staking/:stakingId/withdrawal')
export class StakingWithdrawalController {
  constructor(private readonly stakingWithdrawalService: StakingWithdrawalService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiCreatedResponse({ type: WithdrawalDraftOutputDto })
  async createWithdrawalDraft(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Body() dto: CreateWithdrawalDraftDto,
  ): Promise<WithdrawalDraftOutputDto> {
    return this.stakingWithdrawalService.createWithdrawalDraft(jwt.userId, jwt.walletId, +stakingId, dto);
  }

  @Get('/drafts')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiOkResponse({ type: WithdrawalDraftOutputDto, isArray: true })
  async getDraftWithdrawals(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
  ): Promise<WithdrawalDraftOutputDto[]> {
    return this.stakingWithdrawalService.getDraftWithdrawals(jwt.userId, jwt.walletId, +stakingId);
  }

  @Patch(':id/sign')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiOkResponse({ type: StakingOutputDto })
  async signWithdrawal(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Param('id') withdrawalId: string,
    @Body() dto: SignWithdrawalDto,
  ): Promise<StakingOutputDto> {
    return this.stakingWithdrawalService.signWithdrawal(jwt.userId, jwt.walletId, +stakingId, +withdrawalId, dto);
  }

  @Patch(':id/amount')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiOkResponse({ type: WithdrawalDraftOutputDto })
  async changeAmount(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Param('id') withdrawalId: string,
    @Body() dto: ChangeWithdrawalAmountDto,
  ): Promise<WithdrawalDraftOutputDto> {
    return this.stakingWithdrawalService.changeAmount(jwt.userId, jwt.walletId, +stakingId, +withdrawalId, dto);
  }
}
