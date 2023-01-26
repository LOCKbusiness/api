export enum TransactionType {
  // staking
  CREATE_MASTERNODE = 'CreateMasternode',
  RESIGN_MASTERNODE = 'ResignMasternode',
  VOTE_MASTERNODE = 'VoteMasternode',
  SEND_FROM_LIQ = 'SendFromLiq',
  SEND_TO_LIQ = 'SendToLiq',
  WITHDRAWAL = 'Withdrawal',

  // utxo management
  UTXO_MERGE = 'UtxoMerge',
  UTXO_SPLIT = 'UtxoSplit',

  // yield machine
  CREATE_VAULT = 'CreateVault',
  DEPOSIT_TO_VAULT = 'DepositToVault',
  TAKE_LOAN = 'TakeLoan',
  POOL_ADD_LIQUIDITY = 'PoolAddLiquidity',
  PAYBACK_LOAN = 'PaybackLoan',
  WITHDRAW_FROM_VAULT = 'WithdrawFromVault',
  POOL_REMOVE_LIQUIDITY = 'PoolRemoveLiquidity',

  // general
  ACCOUNT_TO_ACCOUNT = 'AccountToAccount',
  COMPOSITE_SWAP = 'CompositeSwap',
}
