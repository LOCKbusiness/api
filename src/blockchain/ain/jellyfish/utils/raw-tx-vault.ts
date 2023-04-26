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
  async create(owner: string, lockUtxo: boolean): Promise<RawTxDto> {
    return this.handle(() => this.createTx(owner, lockUtxo));
  }

  async deposit(from: string, vault: string, token: number, amount: BigNumber, lockUtxo: boolean): Promise<RawTxDto> {
    return this.handle(() => this.generateTx(from, vault, token, amount, RawTxUtil.createVoutDepositToVault, lockUtxo));
  }

  async withdraw(
    to: string,
    executingAddress: string,
    vault: string,
    token: number,
    amount: BigNumber,
    lockUtxo: boolean,
  ): Promise<RawTxDto> {
    return this.handle(() =>
      this.generateTx(to, vault, token, amount, RawTxUtil.createVoutWithdrawFromVault, lockUtxo, executingAddress),
    );
  }

  async takeLoan(
    to: string,
    executingAddress: string,
    vault: string,
    token: number,
    amount: BigNumber,
    lockUtxo: boolean,
  ): Promise<RawTxDto> {
    return this.handle(() =>
      this.generateTx(to, vault, token, amount, RawTxUtil.createVoutTakeLoan, lockUtxo, executingAddress),
    );
  }

  async paybackLoan(
    from: string,
    vault: string,
    token: number,
    amount: BigNumber,
    lockUtxo: boolean,
  ): Promise<RawTxDto> {
    return this.handle(() => this.generateTx(from, vault, token, amount, RawTxUtil.createVoutPaybackLoan, lockUtxo));
  }

  private async createTx(owner: string, lockUtxo: boolean): Promise<RawTxDto> {
    const [ownerScript, ownerPubKeyHash] = RawTxUtil.parseAddress(owner);
    const vaultFee = this.vaultFee();

    const utxo = await this.utxoProvider.provideUntilAmount(owner, vaultFee, lockUtxo, {
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
    lockUtxo: boolean,
    executingAddress?: string,
  ): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);
    const [executingScript, executingPubKeyHash] = executingAddress
      ? RawTxUtil.parseAddress(executingAddress)
      : [undefined];

    const utxo = await this.utxoProvider.provideForDefiTx(executingAddress ?? from, lockUtxo);
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
