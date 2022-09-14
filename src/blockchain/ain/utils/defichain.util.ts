import { Injectable } from '@nestjs/common';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';

@Injectable()
export class DeFiChainUtil {

  async getAvailableTokenAmount(asset: string, client: DeFiClient): Promise<number> {
    const tokens = await client.getToken();
    const token = tokens.map((t) => client.parseAmount(t.amount)).find((pt) => pt.asset === asset);

    return token ? token.amount : 0;
  }
}
