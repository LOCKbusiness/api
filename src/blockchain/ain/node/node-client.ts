import { ApiClient } from '@defichain/jellyfish-api-core';
import { Block, BlockchainInfo } from '@defichain/jellyfish-api-core/dist/category/blockchain';
import { MasternodeInfo } from '@defichain/jellyfish-api-core/dist/category/masternode';
import { InWalletTransaction, UTXO } from '@defichain/jellyfish-api-core/dist/category/wallet';
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc';
import { ServiceUnavailableException } from '@nestjs/common';
import { Config } from 'src/config/config';
import { QueueHandler } from 'src/shared/queue-handler';
import { HttpService } from 'src/shared/services/http.service';
import { Util } from 'src/shared/util';
import { EnsureTxIdOrThrow } from '../decorators/ensure-txid-or-throw.decorator';

export enum NodeCommand {
  UNLOCK = 'walletpassphrase',
  SEND_UTXO = 'sendutxosfrom',
  TEST_POOL_SWAP = 'testpoolswap',
  SEND = 'send',
}

export enum NodeMode {
  ACTIVE = 'active',
  PASSIVE = 'passive',
}

export class NodeClient {
  protected chain = Config.network;
  private readonly client: ApiClient;
  private readonly queue: QueueHandler;

  readonly #mode: NodeMode;

  constructor(private readonly http: HttpService, private readonly url: string, mode: NodeMode) {
    this.client = this.createJellyfishClient();
    this.queue = new QueueHandler(180000, 60000);
    this.#mode = mode;

    this.getInfo().catch((e) => console.error('Failed to get chain info: ', e));
  }

  clearRequestQueue() {
    this.queue.clear();
  }

  // common
  async getInfo(): Promise<BlockchainInfo> {
    return this.callNode((c) => c.blockchain.getBlockchainInfo());
  }

  async checkSync(): Promise<{ headers: number; blocks: number }> {
    const { blocks, headers } = await this.getInfo();

    if (blocks < headers - 1) throw new Error(`Node ${this.mode} not in sync by ${headers - blocks} block(s)`);

    return { headers, blocks };
  }

  async getBlock(hash: string): Promise<Block<string>> {
    if (!hash) throw new Error('Hash is undefined');
    return this.callNode((c) => c.blockchain.getBlock(hash, 1));
  }

  async waitForTx(txId: string, timeout = 600000): Promise<InWalletTransaction> {
    const tx = await Util.poll(
      () => this.callNode((c) => c.wallet.getTransaction(txId)),
      (t) => t?.confirmations > 0,
      5000,
      timeout,
    );

    if (!(tx?.confirmations > 0)) throw new ServiceUnavailableException('Wait for TX timed out');
    return tx;
  }

  async getTx(txId: string): Promise<InWalletTransaction> {
    if (!txId) throw new Error('TxId is undefined');
    return this.callNode((c) => c.wallet.getTransaction(txId));
  }

  @EnsureTxIdOrThrow()
  async sendUtxoToMany(payload: { addressTo: string; amount: number }[]): Promise<string> {
    if (payload.length > 100) {
      throw new Error('Too many addresses in one transaction batch, allowed max 100 for UTXO');
    }

    const batch = payload.reduce((acc, p) => ({ ...acc, [p.addressTo]: `${p.amount}` }), {});

    return this.callNode((c) => c.wallet.sendMany(batch), true);
  }

  async getMasternodeInfo(id: string): Promise<MasternodeInfo> {
    if (!id) throw new Error('Id is undefined');
    return this.callNode((c) => c.masternode.getMasternode(id).then((r) => r[id]));
  }

  async signMessage(address: string, message: string): Promise<string> {
    if (!address || !message) throw new Error('Address, message or both are undefined');
    return this.callNode((c) => c.call('signmessage', [address, message], 'number'), true);
  }

  async dumpPrivKey(address: string): Promise<string> {
    if (!address) throw new Error('Address is undefined!');
    return this.callNode((c) => c.call('dumpprivkey', [address], 'number'), true);
  }

  async signTx(hex: string): Promise<{ hex: string; completed: boolean }> {
    if (!hex) throw new Error('Hex is undefined!');
    return this.callNode((c) => c.call('signrawtransactionwithwallet', [hex], 'number'), true);
  }

  async sendRawTx(hex: string): Promise<string> {
    if (!hex) throw new Error('Hex is undefined!');
    return this.callNode((c) => c.call('sendrawtransaction', [hex], 'number'), false);
  }

  // UTXO
  async getUtxo(): Promise<UTXO[]> {
    return this.callNode((c) => c.wallet.listUnspent());
  }

  // forwarding
  async sendRpcCommand(command: string): Promise<any> {
    return this.http.post(this.url, command, {
      headers: { ...this.createHeaders(), 'Content-Type': 'text/plain' },
    });
  }

  async sendCliCommand(command: string, noAutoUnlock?: boolean): Promise<any> {
    const cmdParts = command.split(' ');

    const method = cmdParts.shift();
    const params = cmdParts.map((p) => JSON.parse(p));

    return this.callNode((c) => c.call(method, params, 'number'), !noAutoUnlock);
  }

  // generic
  parseAmount(amount: string): { amount: number; asset: string } {
    return {
      amount: +amount.split('@')[0],
      asset: amount.split('@')[1],
    };
  }

  // --- HELPER METHODS --- //
  protected async callNode<T>(call: (client: ApiClient) => Promise<T>, unlock = false): Promise<T> {
    try {
      if (unlock) await this.unlock();
      return await this.call(call);
    } catch (e) {
      console.log('Exception during node call:', e);
      throw new ServiceUnavailableException(e);
    }
  }

  private async unlock(timeout = 60): Promise<any> {
    return this.call((client: ApiClient) =>
      client.call(NodeCommand.UNLOCK, [Config.blockchain.default.walletPassword, timeout], 'number'),
    );
  }

  private async call<T>(call: (client: ApiClient) => Promise<T>, tryCount = 3): Promise<T> {
    try {
      return await this.queue.handle(() => call(this.client));
    } catch (e) {
      if (e instanceof SyntaxError && tryCount > 1) {
        console.log('Retrying node call ...');
        return this.call<T>(call, tryCount - 1);
      }

      throw e;
    }
  }

  private createJellyfishClient(): ApiClient {
    return new JsonRpcClient(this.url, { headers: this.createHeaders() });
  }

  private createHeaders(): { [key: string]: string } {
    const passwordHash = Buffer.from(
      `${Config.blockchain.default.user}:${Config.blockchain.default.password}`,
    ).toString('base64');
    return { Authorization: 'Basic ' + passwordHash };
  }

  protected roundAmount(amount: number): number {
    return Util.round(amount, 8);
  }

  get mode(): NodeMode {
    return this.#mode;
  }
}
