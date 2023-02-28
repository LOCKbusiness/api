import { Injectable } from '@nestjs/common';
import { verify, sign } from 'bitcoinjs-message';
import { MainNet } from '@defichain/jellyfish-network';
import { isEthereumAddress } from 'class-validator';
import { verifyMessage } from 'ethers/lib/utils';
import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { JellyfishService } from 'src/blockchain/ain/jellyfish/services/jellyfish.service';

@Injectable()
export class CryptoService {
  private readonly EthereumBasedChains = [Blockchain.ETHEREUM, Blockchain.BINANCE_SMART_CHAIN];

  // --- ADDRESSES --- //
  public getBlockchainsBasedOn(address: string): Blockchain[] {
    if (isEthereumAddress(address)) return this.EthereumBasedChains;
    if (this.isBitcoinAddress(address)) return [Blockchain.BITCOIN];
    return [Blockchain.DEFICHAIN];
  }

  private getDefaultBlockchainBasedOn(address: string): Blockchain {
    return this.getBlockchainsBasedOn(address)[0];
  }

  private isBitcoinAddress(address: string): boolean {
    return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/.test(address);
  }

  // --- SIGNATURE VERIFICATION --- //
  public verifySignature(message: string, address: string, signature: string): boolean {
    const blockchain = this.getDefaultBlockchainBasedOn(address);

    try {
      if (this.EthereumBasedChains.includes(blockchain)) return this.verifyEthereumBased(message, address, signature);
      if (blockchain === Blockchain.BITCOIN) return this.verifyBitcoinBased(message, address, signature, null);
      if (blockchain === Blockchain.DEFICHAIN)
        return this.verifyBitcoinBased(message, address, signature, MainNet.messagePrefix);
    } catch {}

    return false;
  }

  private verifyEthereumBased(message: string, address: string, signature: string): boolean {
    // there are signatures out there, which do not have '0x' in the beginning, but for verification this is needed
    const signatureToUse = signature.startsWith('0x') ? signature : '0x' + signature;
    return verifyMessage(message, signatureToUse) === address;
  }

  private verifyBitcoinBased(message: string, address: string, signature: string, prefix: string | null): boolean {
    let isValid = false;
    try {
      isValid = verify(message, address, signature, prefix, true);
    } catch {}

    if (!isValid) isValid = verify(message, address, signature, prefix);

    return isValid;
  }

  // --- SIGNATURE CREATION --- //
  public async signMessage(privKey: Buffer, message: string): Promise<string> {
    return sign(message, privKey, true, JellyfishService.getNetwork().messagePrefix).toString('base64');
  }
}
