export enum StakingStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export enum WithdrawalStatus {
  PENDING = 'Pending',
}

export enum DepositStatus {
  PENDING = 'Pending',
}

export enum RewardStatus {
  CREATED = 'Created',
  COMPLETE = 'Complete',
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
