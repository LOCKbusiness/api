import { NotFoundException } from '@nestjs/common';
import { createCustomRawTxDto } from 'src/blockchain/ain/jellyfish/dto/__mocks__/raw-tx.dto.mock';
import { createDefaultMasternode } from 'src/integration/masternode/domain/entities/__mocks__/masternode.entity.mock';
import { TransactionService } from '../transaction.service';

enum TestSetup {
  EMPTY,
  CREATE_MASTERNODE,
}

const hex =
  '04000000000101a4f9f60d4a61750d4b75e3c21dd203ed38ce4077e2e29dd7c094a21f5ce9be230000000000ffffffff0200ca9a3b000000001e6a1c4466547843018d0781d01e84fa086c16d7e74729eec3831ef17600000000204aa9d10100001600143faf3d07e5fa516122195bacd67a7436180b75020002148d0781d01e84fa086c16d7e74729eec3831ef176143faf3d07e5fa516122195bacd67a7436180b750200000000';
const rawTxCreateMasternode = createCustomRawTxDto({ hex });

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
        try {
          await service.sign(rawTxCreateMasternode, 'create-masternode-signed-message', {
            ownerWallet: masternode.ownerWallet,
            accountIndex: masternode.accountIndex,
          });
        } catch (e) {}
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
          hex,
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

  it('should return an empty array for open, if a tx got created and invalidated', () => {
    setup(TestSetup.CREATE_MASTERNODE);
    const txId = service.getOpen()[0].id;
    service.invalidated(txId, 'invalidation-reason');
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
          hex,
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

  it('should throw an exception (NotFoundException), if a tx can not be found on invalidated', () => {
    setup(TestSetup.CREATE_MASTERNODE);
    expect(() => service.invalidated('some-tx-which-is-not-found', 'some-signed-raw-hex')).toThrow(NotFoundException);
  });

  it('should throw an exception (NotFoundException), if a tx can not be found on signed', () => {
    setup(TestSetup.CREATE_MASTERNODE);
    expect(() => service.signed('some-tx-which-is-not-found', 'some-signed-raw-hex')).toThrow(NotFoundException);
  });
});
