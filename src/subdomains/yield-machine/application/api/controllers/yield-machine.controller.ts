import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { TransactionInputDto } from '../../dto/transaction.input.dto';
import { YieldMachineService } from '../../services/yield-machine.service';

@ApiTags('Yield Machine')
@Controller('yield-machine')
export class YieldMachineController {
  constructor(private readonly yieldMachineService: YieldMachineService) {}

  @Post('transaction')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  createTransaction(@Body() dto: TransactionInputDto): Promise<string> {
    return this.yieldMachineService.create(dto);
  }
}
