import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { WithdrawalOutputDto } from '../../application/dto/output/withdrawal.output.dto';
import { StakingWithdrawalService } from '../../application/services/staking-withdrawal.service';

@ApiTags('Withdrawal')
@Controller('withdrawal')
export class WithdrawalController {
  constructor(private readonly withdrawalService: StakingWithdrawalService) {}

  @Get('/pending')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.TRANSACTION_CHECKER))
  async getPendingWithdrawals(): Promise<WithdrawalOutputDto[]> {
    return this.withdrawalService.getPendingWithdrawalDtos();
  }
}
