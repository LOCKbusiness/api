export enum StakingStatus {
  CREATED = 'Created',
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export enum WithdrawalStatus {
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
  CREATED = 'Created',
  RESIGN_REQUESTED = 'ResignRequested',
  RESIGN_CONFIRMED = 'ResignConfirmed',
  RESIGNING = 'Resigning',
  RESIGNED = 'Resigned',
}
