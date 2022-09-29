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
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
}

export enum RewardStatus {
  CONFIRMED = 'Confirmed',
}

export enum StakingAddressPurposes {
  DEPOSIT = 'Deposit',
  WITHDRAWAL = 'Withdrawal',
  REWARD_PAYOUT = 'RewardPayout',
}

export enum MasternodeState {
  IDLE = 'Idle',
  CREATING = 'Creating',
  CREATED = 'Created',
  RESIGN_REQUESTED = 'ResignRequested',
  RESIGN_CONFIRMED = 'ResignConfirmed',
  RESIGNING = 'Resigning',
  RESIGNED = 'Resigned',

  ERROR_CREATE_RAW = 'ErrorCreateRaw',
  ERROR_CREATE = 'ErrorCreate',
}
