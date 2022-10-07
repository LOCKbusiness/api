import { Masternode } from '../masternode.entity';

const defaultMasternode: Partial<Masternode> = {
  owner: 'owner-address',
  ownerWallet: 'cold-wallet-a',
  accountIndex: 1,
};

export function createDefaultMasternode(): Masternode {
  return createCustomMasternode({});
}

export function createCustomMasternode(customValues: Partial<Masternode>): Masternode {
  return Object.assign(new Masternode(), { ...defaultMasternode, ...customValues });
}
