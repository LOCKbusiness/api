import { Controller, UseGuards, Body, Post, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { Staking } from '../../domain/entities/staking.entity';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { CreateDepositDto } from '../../application/dto/create-deposit.dto';
import { StakingDepositService } from '../../application/services/staking-deposit.service';

@ApiTags('deposit')
@Controller('staking/:stakingId/deposit')
export class DepositController {
  constructor(private readonly stakingDepositService: StakingDepositService) {}

  @Post()
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async addDeposit(
    @GetJwt() jwt: JwtPayload,
    @Param('stakingId') stakingId: string,
    @Body() dto: CreateDepositDto,
  ): Promise<Staking> {
    return this.stakingDepositService.createDeposit(jwt.id, stakingId, dto);
  }
}
