import { Injectable } from '@nestjs/common';
import { verify } from 'bitcoinjs-message';
import { MainNet } from '@defichain/jellyfish-network';
import { isEthereumAddress } from 'class-validator';

import { Config } from 'src/config/config';
import { Blockchain } from 'src/shared/enums/blockchain.enum';

@Injectable()
export class CryptoService {
  public verifySignature(message: string, address: string, signature: string): boolean {
    const blockchains = this.getBlockchainsBasedOn(address);

    let isValid = false;
    try {
      isValid = this.verify(message, address, signature, blockchains);
    } catch (e) {}

    if (!isValid && !blockchains.includes(Blockchain.ETHEREUM)) {
      isValid = this.fallbackVerify(message, address, signature, blockchains);
    }
    return isValid;
  }

  public getBlockchainsBasedOn(address: string): Blockchain[] {
    if (isEthereumAddress(address)) return [Blockchain.ETHEREUM, Blockchain.BINANCE_SMART_CHAIN];
    if (this.isBitcoinAddress(address)) return [Blockchain.BITCOIN];
    return [Blockchain.DEFICHAIN];
  }

  private isBitcoinAddress(address: string): boolean {
    return address.match(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/)?.length > 1 ?? false;
  }

  private fallbackVerify(message: string, address: string, signature: string, blockchains: Blockchain[]) {
    let isValid = false;
    const flags = [...Array(12).keys()].map((i) => i + 31);
    for (const flag of flags) {
      const flagByte = Buffer.alloc(1);
      flagByte.writeInt8(flag);
      let sigBuffer = Buffer.from(signature, 'base64').slice(1);
      sigBuffer = Buffer.concat([flagByte, sigBuffer]);
      const candidateSig = sigBuffer.toString('base64');
      try {
        isValid = this.verify(message, address, candidateSig, blockchains);
        if (isValid) break;
      } catch (e) {}
    }
    return isValid;
  }

  private verify(message: string, address: string, signature: string, blockchains: Blockchain[]): boolean {
    return this.verifyDefichain(message, address, signature);
  }

  private verifyDefichain(message: string, address: string, signature: string): boolean {
    let isValid = verify(message, address, signature, MainNet.messagePrefix);
    if (!isValid) {
      // TODO - make configurable for different signature messages
      const fallbackMessage = Config.auth.signMessage + address;
      isValid = verify(fallbackMessage, address, signature, MainNet.messagePrefix);
    }
    return isValid;
  }
}
