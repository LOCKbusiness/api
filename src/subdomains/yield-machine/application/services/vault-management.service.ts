import { AddressToken } from '@defichain/whale-api-client/dist/api/address';
import { CollateralToken, LoanVaultActive } from '@defichain/whale-api-client/dist/api/loan';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Config, Process } from 'src/config/config';
import { VaultService } from 'src/integration/vault/application/services/vault.service';
import { Vault } from 'src/integration/vault/domain/entities/vault.entity';
import { Lock } from 'src/shared/lock';
import { YieldMachineService } from './yield-machine.service';

@Injectable()
export class VaultManagementService {
  private readonly emergencyVaultCheckLock = new Lock(600);

  private whaleClient: WhaleClient;
  constructor(
    private readonly vaultService: VaultService,
    private readonly yieldMachineService: YieldMachineService,
    readonly whaleService: WhaleService,
  ) {
    whaleService.getClient().subscribe((client) => (this.whaleClient = client));
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkVaultsForEmergency() {
    if (Config.processDisabled(Process.VAULT_MANAGEMENT)) return;
    if (!this.emergencyVaultCheckLock.acquire()) return;

    try {
      const vaults = await this.vaultService.getAll();
      const vaultInfos = await Promise.all(
        vaults.filter((v) => v.vault).map((v) => this.whaleClient.getVault(v.vault)),
      );
      const collateralTokens = await this.whaleClient.getAllCollateralTokens();
      const allEmergencyProcesses: Promise<unknown>[] = [];

      for (const vault of vaultInfos) {
        const dbVault = vaults.find((v) => v.vault === vault.vaultId);

        const nextCollateralRatio = this.calculateNextCollateralRatio(vault, collateralTokens);
        const collateralRatioToUse = nextCollateralRatio
          ? Math.min(+vault.collateralRatio, nextCollateralRatio.toNumber())
          : +vault.collateralRatio;

        if (dbVault.emergencyCollateralRatio > collateralRatioToUse) {
          const logId = `${dbVault.address} (${dbVault.vault})`;
          console.warn(`Starting emergency payback for ${logId}`);

          allEmergencyProcesses.push(
            this.executeEmergencyFor(dbVault, logId).catch((e) =>
              console.error(`Exception during vault emergency check:`, e),
            ),
          );
        }
      }
      await Promise.all(allEmergencyProcesses);
    } catch (e) {
      console.error('Exception during vault emergency check:', e);
    } finally {
      this.emergencyVaultCheckLock.release();
    }
  }

  private async executeEmergencyFor(vault: Vault, logId: string): Promise<string[]> {
    let tokens = await this.whaleClient.getTokenBalances(vault.address);

    // remove liquidity mining pool tokens to have pair token A and pair token B available
    const amountToRemoveFromPool = this.amountOf(vault.blockchainPairId, tokens);
    if (!amountToRemoveFromPool) throw new Error(`${logId}: No pool liquidity found for vault: ${vault.vault}`);

    console.info(`${logId}: Removing ${amountToRemoveFromPool} of pool ${vault.blockchainPairId}`);
    const removePoolTx = await this.yieldMachineService.removePoolLiquidity(vault, {
      amount: +amountToRemoveFromPool,
      address: vault.address,
    });
    await this.whaleClient.waitForTx(removePoolTx);

    // pay back as many pair token A tokens as possible
    tokens = await this.whaleClient.getTokenBalances(vault.address);
    const savingTxs: Promise<string>[] = [];
    const amountToPayback = this.amountOf(vault.blockchainPairTokenAId, tokens);
    if (amountToPayback) {
      console.info(`${logId}: Paying back ${amountToPayback} of ${vault.blockchainPairTokenAId}`);
      const paybackTx = await this.yieldMachineService.paybackLoan(vault, {
        amount: +amountToPayback,
        address: vault.address,
        vault: vault.vault,
      });
      savingTxs.push(this.whaleClient.waitForTx(paybackTx));
    }

    // deposit as many pair token B tokens as possible
    const amountToDeposit = this.amountOf(vault.blockchainPairTokenBId, tokens);
    if (amountToDeposit) {
      console.info(`${logId}: Depositing ${amountToDeposit} of ${vault.blockchainPairTokenBId}`);
      const depositTx = await this.yieldMachineService.depositToVault(
        vault,
        {
          amount: +amountToDeposit,
          address: vault.address,
          vault: vault.vault,
          token: '', // only being used for receiving token on endpoint
        },
        vault.blockchainPairTokenBId,
      );
      savingTxs.push(this.whaleClient.waitForTx(depositTx));
    }

    return Promise.all(savingTxs);
  }

  private amountOf(tokenId: number, tokens: AddressToken[]): string {
    return tokens.find((token) => +token.id === tokenId)?.amount;
  }

  private calculateNextCollateralRatio(
    vault: LoanVaultActive,
    collateralTokens: CollateralToken[],
  ): BigNumber | undefined {
    const nextLoan = this.nextLoanValueFor(vault);
    if (nextLoan.lte(0)) return undefined;
    return this.nextCollateralValue(vault, collateralTokens)
      .dividedBy(nextLoan)
      .multipliedBy(100)
      .decimalPlaces(2, BigNumber.ROUND_FLOOR);
  }

  private nextLoanValueFor(vault: LoanVaultActive): BigNumber {
    return BigNumber.sum(
      ...vault.loanAmounts.map((loan) => new BigNumber(loan.amount).multipliedBy(loan.activePrice?.next?.amount ?? 1)),
    );
  }

  private nextCollateralValue(vault: LoanVaultActive, collateralTokens: CollateralToken[]): BigNumber {
    return BigNumber.sum(
      ...vault.collateralAmounts.map((collateral) =>
        new BigNumber(collateralTokens?.find((token) => token.token.id == collateral.id)?.factor ?? 1)
          .multipliedBy(collateral.activePrice?.next?.amount ?? 1)
          .multipliedBy(collateral.amount),
      ),
    );
  }
}
