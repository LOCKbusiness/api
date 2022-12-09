import { Injectable } from '@nestjs/common';
import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';
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
  SendToLiqData,
  SplitData,
  DepositToVaultData,
  WithdrawFromVaultData,
  TakeLoanData,
  PaybackLoanData,
  AddPoolLiquidityData,
  RemovePoolLiquidityData,
  CompositeSwapData,
  SendTokenWithdrawalData,
  SendCoinWithdrawalData,
} from '../types/creation-data';
import { TransactionService } from './transaction.service';
import { WIF } from '@defichain/jellyfish-crypto';
import { CryptoService } from 'src/blockchain/shared/services/crypto.service';
import { TransactionType } from '../../domain/enums';
import { UtxoSizePriority } from 'src/blockchain/ain/jellyfish/domain/enums';
import { RawTxService } from 'src/blockchain/ain/jellyfish/services/raw-tx.service';
import { TransactionCacheService } from './transaction-cache.service';
import { AssetType } from 'src/shared/models/asset/asset.entity';

@Injectable()
export class TransactionExecutionService {
  private nodeClient: DeFiClient;
  private whaleClient: WhaleClient;

  private privKey?: Buffer;

  constructor(
    private readonly transactionService: TransactionService,
    private readonly transactionCache: TransactionCacheService,
    private readonly rawTxService: RawTxService,
    private readonly cryptoService: CryptoService,
    whaleService: WhaleService,
    nodeService: NodeService,
  ) {
    whaleService.getClient().subscribe((client) => (this.whaleClient = client));
    nodeService.getConnectedNode(NodeType.INPUT).subscribe((client) => (this.nodeClient = client));
  }

  async createMasternode(data: CreateMasternodeData): Promise<string> {
    const rawTx = await this.rawTxService.Masternode.create(data.masternode);
    console.info(`Create masternode tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.CREATE_MASTERNODE));
  }

  async resignMasternode(data: ResignMasternodeData): Promise<string> {
    const rawTx = await this.rawTxService.Masternode.resign(data.masternode);
    console.info(`Resign masternode tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.RESIGN_MASTERNODE));
  }

  async sendFromLiq(data: SendFromLiqData): Promise<string> {
    const rawTx = await this.rawTxService.Utxo.sendWithChange(
      Config.staking.liquidity.address,
      data.to,
      data.amount,
      data.sizePriority,
    );
    console.info(`Send from liq tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.SEND_FROM_LIQ));
  }

  async sendToLiq(data: SendToLiqData): Promise<string> {
    const rawTx = await this.rawTxService.Utxo.forward(data.from, Config.staking.liquidity.address, data.amount);
    console.info(`Send to liq tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.SEND_TO_LIQ));
  }

  async sendWithdrawal(data: SendCoinWithdrawalData | SendTokenWithdrawalData): Promise<string> {
    const rawTx = await this.useCache(TransactionType.WITHDRAWAL, data.withdrawalId.toString(), () =>
      data.type === AssetType.TOKEN
        ? this.rawTxService.Account.send(Config.yieldMachine.liquidity.address, data.to, data.tokenId, data.amount)
        : this.rawTxService.Utxo.sendWithChange(
            Config.staking.liquidity.address,
            data.to,
            data.amount,
            UtxoSizePriority.FITTING,
          ),
    );
    console.info(`Send withdrawal tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, { id: data.withdrawalId, type: TransactionType.WITHDRAWAL }, false);
  }

  async splitBiggestUtxo(data: SplitData): Promise<string> {
    const rawTx = await this.rawTxService.Utxo.split(data.address, data.split);
    console.info(`Split tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, { type: TransactionType.UTXO_SPLIT });
  }

  async mergeSmallestUtxos(data: MergeData): Promise<string> {
    const rawTx = await this.rawTxService.Utxo.merge(data.address, data.merge);
    console.info(`Merge tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, { type: TransactionType.UTXO_MERGE });
  }

  async sendToken(data: SendTokenData): Promise<string> {
    const rawTx = await this.rawTxService.Account.send(data.from, data.to, data.balance.token, data.balance.amount);
    console.info(`Send account tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.ACCOUNT_TO_ACCOUNT));
  }

  async createVault(data: CreateVaultData): Promise<string> {
    const rawTx = await this.rawTxService.Vault.create(data.owner);
    console.info(`Create vault tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.CREATE_VAULT));
  }

  async depositToVault(data: DepositToVaultData): Promise<string> {
    const rawTx = await this.rawTxService.Vault.deposit(data.from, data.vault, data.token, data.amount);
    console.info(`Deposit to vault tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.DEPOSIT_TO_VAULT));
  }

  async withdrawFromVault(data: WithdrawFromVaultData): Promise<string> {
    const rawTx = await this.rawTxService.Vault.withdraw(data.to, data.vault, data.token, data.amount);
    console.info(`Withdraw from vault tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.WITHDRAW_FROM_VAULT));
  }

  async takeLoan(data: TakeLoanData): Promise<string> {
    const rawTx = await this.rawTxService.Vault.takeLoan(data.to, data.vault, data.token, data.amount);
    console.info(`Take loan tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.TAKE_LOAN));
  }

  async paybackLoan(data: PaybackLoanData): Promise<string> {
    const rawTx = await this.rawTxService.Vault.paybackLoan(data.from, data.vault, data.token, data.amount);
    console.info(`Payback loan tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.PAYBACK_LOAN));
  }

  async addPoolLiquidity(data: AddPoolLiquidityData): Promise<string> {
    const rawTx = await this.rawTxService.Pool.add(
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
    const rawTx = await this.rawTxService.Pool.remove(data.from, data.token, data.amount);
    console.info(`Remove pool liquidity tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.POOL_REMOVE_LIQUIDITY));
  }

  async compositeSwap(data: CompositeSwapData): Promise<string> {
    const rawTx = await this.rawTxService.Account.swap(
      data.source.from,
      data.source.token,
      data.source.amount,
      data.destination.token,
    );
    console.info(`Composite swap tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data, TransactionType.COMPOSITE_SWAP));
  }

  // --- HELPER METHODS --- //
  private async useCache(
    type: TransactionType,
    correlationId: string,
    create: () => Promise<RawTxDto>,
  ): Promise<RawTxDto> {
    const existingTx = await this.transactionCache.get(type, correlationId);
    if (existingTx) return existingTx;

    return await this.transactionCache.set(type, correlationId, await create());
  }

  private createPayloadFor(data: WalletBaseData, type: TransactionType): any {
    return {
      type,
      ownerWallet: data.ownerWallet,
      accountIndex: data.accountIndex,
    };
  }

  private async signAndBroadcast(rawTx: RawTxDto, payload: any, unlockUtxoOnFail = true): Promise<string> {
    try {
      const signature = await this.receiveSignatureFor(rawTx);
      const hex = await this.transactionService.sign(rawTx, signature, payload);
      console.info(`${rawTx.id} broadcasting`);
      return await this.whaleClient.sendRaw(hex);
    } catch (e) {
      if (unlockUtxoOnFail) await this.rawTxService.unlockUtxosOf(rawTx);
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
