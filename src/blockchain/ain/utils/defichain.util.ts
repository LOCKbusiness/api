import { Injectable } from '@nestjs/common';
import { DeFiClient } from '../node/defi-client';

@Injectable()
export class DeFiChainUtil {
  async getHistoryEntryForTx(
    txId: string,
    client: DeFiClient,
    address: string,
  ): Promise<{ txId: string; blockHeight: number; amounts: string[] }> {
    const transaction = await client.getTx(txId);

    if (transaction && transaction.blockhash && transaction.confirmations > 0) {
      const { height } = await client.getBlock(transaction.blockhash);

      return client
        .listHistory(height, height + 1, address)
        .then((histories) =>
          histories
            .map((h) => ({ txId: h.txid, blockHeight: h.blockHeight, amounts: h.amounts }))
            .find((t) => t.txId === txId),
        );
    }
  }

  async getAvailableTokenAmount(assetName: string, client: DeFiClient, address: string): Promise<number> {
    const tokens = await client.getToken();
    const token = tokens
      .filter((t) => t.owner === address)
      .map((t) => client.parseAmount(t.amount))
      .find((pt) => pt.asset === assetName);

    return token ? token.amount : 0;
  }
}
