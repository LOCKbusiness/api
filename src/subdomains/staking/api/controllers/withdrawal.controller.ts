import { Controller, UseGuards, Body, Post, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { StakingWithdrawalService } from '../../application/services/staking-withdrawal.service';
import { CreateWithdrawalDto } from '../../application/dto/input/create-withdrawal.dto';
import { StakingOutputDto } from '../../application/dto/output/staking.output.dto';

@ApiTags('withdrawal')
@Controller('staking/:stakingId/withdrawal')
export class WithdrawalController {
  constructor(private readonly stakingWithdrawalService: StakingWithdrawalService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiResponse({ status: 201, type: StakingOutputDto })
  async createWithdrawal(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Body() dto: CreateWithdrawalDto,
  ): Promise<StakingOutputDto> {
    return this.stakingWithdrawalService.createWithdrawal(jwt.userId, jwt.walletId, +stakingId, dto);
  }
}
