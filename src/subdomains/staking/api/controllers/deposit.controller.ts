import { Controller, UseGuards, Body, Post, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { StakingDepositService } from '../../application/services/staking-deposit.service';
import { CreateDepositDto } from '../../application/dto/input/create-deposit.dto';
import { StakingOutputDto } from '../../application/dto/output/staking.output.dto';

@ApiTags('Deposit')
@Controller('staking/:stakingId/deposit')
export class DepositController {
  constructor(private readonly stakingDepositService: StakingDepositService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiResponse({ status: 201, type: StakingOutputDto })
  async createDeposit(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Body() dto: CreateDepositDto,
  ): Promise<StakingOutputDto> {
    return this.stakingDepositService.createDeposit(jwt.userId, jwt.walletId, +stakingId, dto);
  }
}
