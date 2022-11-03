import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { VaultService } from 'src/subdomains/yield-machine/application/services/vault.service';
import { TransactionCommand } from '../../domain/enums';
import { TakeLoanInputDto } from '../dto/transaction.input.dto';
import { TransactionExecutionService } from './transaction-execution.service';

@Injectable()
export class TransactionCreationService {
  private client: WhaleClient;
  constructor(
    private readonly transactionExecutionService: TransactionExecutionService,
    private readonly vaultService: VaultService,
    whaleService: WhaleService,
  ) {
    whaleService.getClient().subscribe((client) => (this.client = client));
  }

  async create(command: TransactionCommand, parameters: any): Promise<void> {
    if (!this.areParameters(command, parameters))
      throw new BadRequestException(`Parameters are incomplete for ${command}`);

    const vault = await this.vaultService.get(parameters.address, parameters.vault);
    if (!vault) throw new NotFoundException('Vault not found');

    switch (command) {
      case TransactionCommand.TAKE_LOAN:
        const takeLoan = parameters as TakeLoanInputDto;
        this.transactionExecutionService.takeLoan({
          to: takeLoan.address,
          vault: takeLoan.vault,
          token: vault.blockchainPairTokenAId,
          amount: new BigNumber(takeLoan.amount),
          ownerWallet: vault.wallet,
          accountIndex: vault.accountIndex,
        });
    }
  }

  private areParameters(command: TransactionCommand, parameters: any): boolean {
    switch (command) {
      case TransactionCommand.TAKE_LOAN:
        return this.isParameterComplete(parameters, ['address', 'vault', 'amount']);
    }
  }

  private isParameterComplete(parameters: any, neededParameters: string[]): boolean {
    return neededParameters.every((p) => p in parameters);
  }
}
