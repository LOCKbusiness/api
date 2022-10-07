import { NotFoundException } from '@nestjs/common';
import { createCustomRawTxDto } from 'src/blockchain/ain/jellyfish/dto/__mocks__/raw-tx.dto.mock';
import { createDefaultMasternode } from 'src/integration/masternode/domain/entities/__mocks__/masternode.entity.mock';
import { TransactionService } from '../transaction.service';

enum TestSetup {
  EMPTY,
  CREATE_MASTERNODE,
}

const rawTxCreateMasternode = createCustomRawTxDto({ hex: 'create-masternode' });

describe('TransactionService', () => {
  let service: TransactionService;

  beforeEach(() => {
    service = new TransactionService();
  });

  async function setup(testSetup: TestSetup) {
    switch (testSetup) {
      case TestSetup.EMPTY:
        break;
      case TestSetup.CREATE_MASTERNODE:
        const masternode = createDefaultMasternode();
        await service.sign(rawTxCreateMasternode, 'create-masternode-signed-message', {
          ownerWallet: masternode.ownerWallet,
          accountIndex: masternode.accountIndex,
        });
        break;
    }
  }

  it('should return an empty array for open, if no tx is created', () => {
    setup(TestSetup.EMPTY);
    expect(service.getOpen()).toStrictEqual([]);
  });

  it('should return a tx for open, if a tx got created', () => {
    setup(TestSetup.CREATE_MASTERNODE);
    expect(service.getOpen()).toMatchObject([
      {
        issuerSignature: 'create-masternode-signed-message',
        rawTx: {
          hex: 'create-masternode',
          scriptHex: '0',
          prevouts: [],
        },
        payload: {
          ownerWallet: 'cold-wallet-a',
          accountIndex: 1,
        },
      },
    ]);
  });

  it('should return an empty array for open, if a tx got created and verified', () => {
    setup(TestSetup.CREATE_MASTERNODE);
    const txId = service.getOpen()[0].id;
    service.verified(txId, 'verifier-signed-message');
    expect(service.getOpen()).toStrictEqual([]);
  });

  it('should return an empty array for open, if a tx got created, verified and signed', () => {
    setup(TestSetup.CREATE_MASTERNODE);
    const txId = service.getOpen()[0].id;
    service.verified(txId, 'verifier-signed-message');
    service.signed(txId, 'signed-raw-tx-hex');
    expect(service.getOpen()).toStrictEqual([]);
  });

  it('should return an empty array for verified, if no tx is created', () => {
    setup(TestSetup.EMPTY);
    expect(service.getVerified()).toStrictEqual([]);
  });

  it('should return an empty array for verified, if a tx got created', () => {
    setup(TestSetup.CREATE_MASTERNODE);
    expect(service.getVerified()).toStrictEqual([]);
  });

  it('should return a tx for verified, if a tx got created and verified', () => {
    setup(TestSetup.CREATE_MASTERNODE);
    const txId = service.getOpen()[0].id;
    service.verified(txId, 'verifier-signed-message');
    expect(service.getVerified()).toMatchObject([
      {
        issuerSignature: 'create-masternode-signed-message',
        verifierSignature: 'verifier-signed-message',
        rawTx: {
          hex: 'create-masternode',
          scriptHex: '0',
          prevouts: [],
        },
        payload: {
          ownerWallet: 'cold-wallet-a',
          accountIndex: 1,
        },
      },
    ]);
  });

  it('should return an empty array for verified, if a tx got created, verified and signed', () => {
    setup(TestSetup.CREATE_MASTERNODE);
    const txId = service.getOpen()[0].id;
    service.verified(txId, 'verifier-signed-message');
    service.signed(txId, 'signed-raw-tx-hex');
    expect(service.getVerified()).toStrictEqual([]);
  });

  it('should throw an exception (NotFoundException), if a tx can not be found on verified', () => {
    setup(TestSetup.CREATE_MASTERNODE);
    expect(() => service.verified('some-tx-which-is-not-found', 'some-signature')).toThrow(NotFoundException);
  });

  it('should throw an exception (NotFoundException), if a tx can not be found on signed', () => {
    setup(TestSetup.CREATE_MASTERNODE);
    expect(() => service.signed('some-tx-which-is-not-found', 'some-signed-raw-hex')).toThrow(NotFoundException);
  });
});
