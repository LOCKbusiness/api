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
  CREATED = 'Created',
  COMPLETE = 'Complete',
}

export enum StakingAddressPurposes {
  DEPOSIT = 'Deposit',
  WITHDRAWAL = 'Withdrawal',
  REWARD_PAYOUT = 'RewardPayout',
}
