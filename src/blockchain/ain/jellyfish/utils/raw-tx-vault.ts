import { TestNet } from '@defichain/jellyfish-network';
import { Vout, Script } from '@defichain/jellyfish-transaction';
import BigNumber from 'bignumber.js';
import { Config } from 'src/config/config';
import { UtxoSizePriority } from '../domain/enums';
import { RawTxDto } from '../dto/raw-tx.dto';
import { JellyfishService } from '../services/jellyfish.service';
import { RawTxBase } from './raw-tx-base';
import { RawTxUtil } from './raw-tx-util';

export class RawTxVault extends RawTxBase {
  async create(owner: string): Promise<RawTxDto> {
    return this.handle(() => this.createTx(owner));
  }

  async deposit(from: string, vault: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    return this.handle(() => this.generateTx(from, vault, token, amount, RawTxUtil.createVoutDepositToVault));
  }

  async withdraw(
    to: string,
    executingAddress: string,
    vault: string,
    token: number,
    amount: BigNumber,
  ): Promise<RawTxDto> {
    return this.handle(() =>
      this.generateTx(to, vault, token, amount, RawTxUtil.createVoutWithdrawFromVault, executingAddress),
    );
  }

  async takeLoan(
    to: string,
    exeuctingAddress: string,
    vault: string,
    token: number,
    amount: BigNumber,
  ): Promise<RawTxDto> {
    return this.handle(() => this.generateTx(to, vault, token, amount, RawTxUtil.createVoutTakeLoan, exeuctingAddress));
  }

  async paybackLoan(from: string, vault: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    return this.handle(() => this.generateTx(from, vault, token, amount, RawTxUtil.createVoutPaybackLoan));
  }

  private async createTx(owner: string): Promise<RawTxDto> {
    const [ownerScript, ownerPubKeyHash] = RawTxUtil.parseAddress(owner);
    const vaultFee = this.vaultFee();

    const utxo = await this.utxoProvider.provideUntilAmount(owner, vaultFee, {
      useFeeBuffer: true,
      sizePriority: UtxoSizePriority.FITTING,
      customFeeBuffer: Config.blockchain.minDefiTxFeeBuffer,
    });
    return RawTxUtil.generateDefiTx(
      ownerScript,
      ownerPubKeyHash,
      utxo,
      RawTxUtil.createVoutCreateVault(ownerScript, vaultFee),
      vaultFee,
    );
  }

  private async generateTx(
    from: string,
    vault: string,
    token: number,
    amount: BigNumber,
    createVout: (vault: string, script: Script, token: number, amount: BigNumber) => Vout,
    executingAddress?: string,
  ): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);
    const [executingScript, executingPubKeyHash] = executingAddress
      ? RawTxUtil.parseAddress(executingAddress)
      : [undefined];

    const utxo = await this.utxoProvider.provideForDefiTx(executingAddress ?? from);
    return RawTxUtil.generateDefiTx(
      executingScript ?? fromScript,
      executingPubKeyHash ?? fromPubKeyHash,
      utxo,
      createVout(vault, fromScript, token, amount),
    );
  }

  private vaultFee(): BigNumber {
    return new BigNumber(JellyfishService.getNetwork() === TestNet ? 1 : 2);
  }
}
