import { Controller, UseGuards, Body, Post, Param, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { Staking } from '../../domain/entities/staking.entity';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { StakingDepositService } from '../../application/services/staking-deposit.service';
import { CreateDepositDto } from '../../application/dto/input/create-deposit.dto';

@ApiTags('deposit')
@Controller('staking/:stakingId/deposit')
export class DepositController {
  constructor(private readonly stakingDepositService: StakingDepositService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  async createDeposit(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Body() dto: CreateDepositDto,
  ): Promise<Staking> {
    return this.stakingDepositService.createDeposit(jwt.id, stakingId, dto);
  }
}
