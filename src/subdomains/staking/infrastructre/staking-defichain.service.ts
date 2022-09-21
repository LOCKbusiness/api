import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { CryptoService } from 'src/blockchain/shared/services/crypto.service';
import { Config } from 'src/config/config';
import { Staking } from '../domain/entities/staking.entity';

@Injectable()
export class StakingDeFiChainService {
  private client: DeFiClient;

  constructor(nodeService: NodeService, private readonly cryptoService: CryptoService) {
    nodeService.getConnectedNode(NodeType.INPUT).subscribe((client) => (this.client = client));
  }

  //*** PUBLIC API ***//

  verifySignature(signature: string, amount: number, staking: Staking): void {
    const message = this.generateWithdrawalSignatureMessage(
      amount,
      staking.asset.name,
      staking.withdrawalAddress.address,
    );

    const isValid = this.cryptoService.verifySignature(message, staking.withdrawalAddress.address, signature);

    if (!isValid) throw new UnauthorizedException();
  }

  //*** HELPER METHODS **//

  private generateWithdrawalSignatureMessage(amount: number, asset: string, address: string): string {
    const message = Config.staking.signatureTemplates.signWithdrawalMessage;

    message.replace('${AMOUNT}', amount.toString());
    message.replace('${ASSET}', asset);
    message.replace('${ADDRESS}', address);

    return message;
  }

  /*

  private async forwardUtxo(input: CryptoInput, address: string): Promise<void> {
    const outTxId = await this.client.sendCompleteUtxo(input.route.deposit.address, address, input.amount);
    await this.cryptoInputRepo.update({ id: input.id }, { outTxId });
  }

  */
}
