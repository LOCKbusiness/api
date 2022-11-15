import { TestNet } from '@defichain/jellyfish-network';
import { Vout, Script } from '@defichain/jellyfish-transaction';
import BigNumber from 'bignumber.js';
import { UtxoSizePriority } from '../domain/enums';
import { RawTxDto } from '../dto/raw-tx.dto';
import { JellyfishService } from '../services/jellyfish.service';
import { UtxoProviderService } from '../services/utxo-provider.service';
import { RawTxUtil } from './raw-tx-util';

export class RawTxVault {
  static async create(owner: string, utxoProvider: UtxoProviderService): Promise<RawTxDto> {
    const [ownerScript, ownerPubKeyHash] = RawTxUtil.parseAddress(owner);
    const vaultFee = this.vaultFee();

    const utxo = await utxoProvider.provideUntilAmount(owner, vaultFee, UtxoSizePriority.FITTING, true);
    return RawTxUtil.generateDefiTx(
      ownerScript,
      ownerPubKeyHash,
      utxo,
      RawTxUtil.createVoutCreateVault(ownerScript, vaultFee),
      vaultFee,
    );
  }

  static async deposit(
    from: string,
    vault: string,
    token: number,
    amount: BigNumber,
    utxoProvider: UtxoProviderService,
  ): Promise<RawTxDto> {
    return RawTxVault.generateTx(from, vault, token, amount, RawTxUtil.createVoutDepositToVault, utxoProvider);
  }

  static async withdraw(
    to: string,
    vault: string,
    token: number,
    amount: BigNumber,
    utxoProvider: UtxoProviderService,
  ): Promise<RawTxDto> {
    return RawTxVault.generateTx(to, vault, token, amount, RawTxUtil.createVoutWithdrawFromVault, utxoProvider);
  }

  static async takeLoan(
    to: string,
    vault: string,
    token: number,
    amount: BigNumber,
    utxoProvider: UtxoProviderService,
  ): Promise<RawTxDto> {
    return RawTxVault.generateTx(to, vault, token, amount, RawTxUtil.createVoutTakeLoan, utxoProvider);
  }

  static async paybackLoan(
    from: string,
    vault: string,
    token: number,
    amount: BigNumber,
    utxoProvider: UtxoProviderService,
  ): Promise<RawTxDto> {
    return RawTxVault.generateTx(from, vault, token, amount, RawTxUtil.createVoutPaybackLoan, utxoProvider);
  }

  private static async generateTx(
    from: string,
    vault: string,
    token: number,
    amount: BigNumber,
    createVout: (vault: string, script: Script, token: number, amount: BigNumber) => Vout,
    utxoProvider: UtxoProviderService,
  ): Promise<RawTxDto> {
    const [fromScript, fromPubKeyHash] = RawTxUtil.parseAddress(from);

    const utxo = await utxoProvider.provideForDefiTx(from);
    return RawTxUtil.generateDefiTx(fromScript, fromPubKeyHash, utxo, createVout(vault, fromScript, token, amount));
  }

  private static vaultFee(): BigNumber {
    return new BigNumber(JellyfishService.getNetwork() === TestNet ? 1 : 2);
  }
}
