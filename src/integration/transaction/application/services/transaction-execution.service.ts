import { Injectable } from '@nestjs/common';
import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';
import { JellyfishService } from 'src/blockchain/ain/jellyfish/services/jellyfish.service';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Config } from 'src/config/config';
import {
  CreateMasternodeData,
  CreateVaultData,
  WalletBaseData,
  MergeData,
  ResignMasternodeData,
  SendTokenData,
  SendFromLiqData,
  SendFromLiqToCustomerData,
  SendToLiqData,
  SplitData,
  DepositToVaultData,
  WithdrawFromVaultData,
  TakeLoanData,
  PaybackLoanData,
  AddPoolLiquidityData,
  RemovePoolLiquidityData,
  CompositeSwapData,
} from '../types/creation-data';
import { TransactionService } from './transaction.service';
import { WIF } from '@defichain/jellyfish-crypto';
import { CryptoService } from 'src/blockchain/shared/services/crypto.service';
import { TransactionType } from '../../domain/enums';
import { UtxoSizePriority } from 'src/blockchain/ain/jellyfish/domain/enums';

@Injectable()
export class TransactionExecutionService {
  private nodeClient: DeFiClient;
  private whaleClient: WhaleClient;

  private privKey?: Buffer;

  constructor(
    private readonly transactionService: TransactionService,
    private readonly jellyfishService: JellyfishService,
    private readonly cryptoService: CryptoService,
    whaleService: WhaleService,
    nodeService: NodeService,
  ) {
    whaleService.getClient().subscribe((client) => (this.whaleClient = client));
    nodeService.getConnectedNode(NodeType.INPUT).subscribe((client) => (this.nodeClient = client));
  }

  async createMasternode(data: CreateMasternodeData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForCreate(data.masternode);
    console.info(`Create masternode tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.CREATE_MASTERNODE));
  }

  async resignMasternode(data: ResignMasternodeData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForResign(data.masternode);
    console.info(`Resign masternode tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.RESIGN_MASTERNODE));
  }

  async sendFromLiq(data: SendFromLiqData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForSendFromLiq(data.to, data.amount, data.sizePriority);
    console.info(`Send from liq tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.SEND_FROM_LIQ));
  }

  async sendFromLiqToCustomer(data: SendFromLiqToCustomerData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForSendFromLiq(data.to, data.amount, UtxoSizePriority.FITTING);
    console.info(`Send from liq to customer tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, { id: data.withdrawalId, type: TransactionType.WITHDRAWAL });
  }

  async sendToLiq(data: SendToLiqData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForSendToLiq(data.from, data.amount);
    console.info(`Send to liq tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.SEND_TO_LIQ));
  }

  async splitBiggestUtxo(data: SplitData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForSplitUtxo(data.address, data.split);
    console.info(`Split tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, { type: TransactionType.UTXO_SPLIT });
  }

  async mergeSmallestUtxos(data: MergeData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForMergeUtxos(data.address, data.merge);
    console.info(`Merge tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, { type: TransactionType.UTXO_MERGE });
  }

  async sendToken(data: SendTokenData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForSendAccount(
      data.from,
      data.to,
      data.balance.token,
      data.balance.amount,
    );
    console.info(`Send account tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.ACCOUNT_TO_ACCOUNT));
  }

  async createVault(data: CreateVaultData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForCreateVault(data.owner);
    console.info(`Create vault tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.CREATE_VAULT));
  }

  async depositToVault(data: DepositToVaultData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForDepositToVault(data.from, data.vault, data.token, data.amount);
    console.info(`Deposit to vault tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.DEPOSIT_TO_VAULT));
  }

  async withdrawFromVault(data: WithdrawFromVaultData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForWithdrawFromVault(data.to, data.vault, data.token, data.amount);
    console.info(`Withdraw from vault tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.WITHDRAW_FROM_VAULT));
  }

  async takeLoan(data: TakeLoanData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForTakeLoan(data.to, data.vault, data.token, data.amount);
    console.info(`Take loan tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.TAKE_LOAN));
  }

  async paybackLoan(data: PaybackLoanData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForPaybackLoan(data.from, data.vault, data.token, data.amount);
    console.info(`Payback loan tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.PAYBACK_LOAN));
  }

  async addPoolLiquidity(data: AddPoolLiquidityData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForAddPoolLiquidity(
      data.from,
      data.partA.token,
      data.partA.amount,
      data.partB.token,
      data.partB.amount,
    );
    console.info(`Add pool liquidity tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.POOL_ADD_LIQUIDITY));
  }

  async removePoolLiquidity(data: RemovePoolLiquidityData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForRemovePoolLiquidity(data.from, data.token, data.amount);
    console.info(`Remove pool liquidity tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.POOL_REMOVE_LIQUIDITY));
  }

  async compositeSwap(data: CompositeSwapData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForCompositeSwap(
      data.source.from,
      data.source.token,
      data.source.amount,
      data.destination.token,
    );
    console.info(`Composite swap tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.COMPOSITE_SWAP));
  }

  private createPayloadFor(data: WalletBaseData, type: TransactionType): any {
    return {
      type,
      ownerWallet: data.ownerWallet,
      accountIndex: data.accountIndex,
    };
  }

  private async signAndBroadcast(rawTx: RawTxDto, payload?: any): Promise<string> {
    try {
      const signature = await this.receiveSignatureFor(rawTx);
      const hex = await this.transactionService.sign(rawTx, signature, payload);
      console.info(`${rawTx.id} broadcasting`);
      return await this.whaleClient.sendRaw(hex);
    } catch (e) {
      await this.jellyfishService.unlock(rawTx);
      throw e;
    }
  }

  private async receiveSignatureFor(rawTx: RawTxDto): Promise<string> {
    if (!this.privKey) {
      const key = await this.nodeClient.dumpPrivKey(Config.staking.signature.address);
      this.privKey = await WIF.asEllipticPair(key).privateKey();
    }
    return this.cryptoService.signMessage(this.privKey, rawTx.hex);
  }
}
