export enum StakingStatus {
  CREATED = 'Created',
  ACTIVE = 'Active',
  BLOCKED = 'Blocked',
}

export enum WithdrawalStatus {
  // be careful changing the value of Draft enum -> withdrawal.entity.ts -> Entity Index
  DRAFT = 'Draft',
  PENDING = 'Pending',
  PAYING_OUT = 'PayingOut',
  CONFIRMED = 'Confirmed',
  FAILED = 'Failed',
}

export enum DepositStatus {
  OPEN = 'Open',
  PENDING = 'Pending',
  FAILED = 'Failed',
  CONFIRMED = 'Confirmed',
}

export enum RewardStatus {
  CREATED = 'Created',
  READY = 'Ready',
  PAYING_OUT = 'PayingOut',
  CONFIRMED = 'Confirmed',
}

export enum StakingAddressPurposes {
  DEPOSIT = 'Deposit',
  WITHDRAWAL = 'Withdrawal',
  REWARD_PAYOUT = 'RewardPayout',
}

export enum MasternodeState {
  IDLE = 'Idle',
  ENABLING = 'Enabling',
  PRE_ENABLED = 'PreEnabled',
  ENABLED = 'Enabled',
  RESIGNING = 'Resigning',
  PRE_RESIGNED = 'PreResigned',
  MOVING_COLLATERAL = 'MovingCollateral',
  RESIGNED = 'Resigned',
}

export enum MasternodeTimeLock {
  NONE = 0,
  FIVE_YEAR_FREEZER = 260,
  TEN_YEAR_FREEZER = 520,
}

export enum StakingStrategy {
  MASTERNODE = 'Masternode',
  LIQUIDITY_MINING = 'LiquidityMining',
}

export enum MasternodeVote {
  YES = 0x01,
  NO = 0x02,
  NEUTRAL = 0x03,
}
