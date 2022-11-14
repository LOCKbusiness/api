# LOCK API

API for LOCK.space international staking service

## Documentation

- [Registration](#registration)
- [KYC](#kyc)
- [Staking](#staking)
  - [Deposit](#deposit)
  - [Withdrawal](#withdrawal)
- [Analytics](#analytics)
- [Voting](#voting)
- [Integration Example](#integration-example)

## Registration

1. Contact [support](mailto:support@lock.space) to registrate your wallet name
2. Create an address on selected blockchain (e.g. DeFiChain)
3. Get the sign message from [sign-message endpoint](https://api.lock.space/swagger/#/Authentication/AuthController_getSignMessage) and sign it with the corresponding private key
4. Register the user with the [sign-up endpoint](https://api.lock.space/swagger/#/Authentication/AuthController_signUp)
5. Now you can get your access token (with address & signature) with the [sign-in endpoint](https://api.lock.space/swagger/#/Authentication/AuthController_signIn)

## KYC

Before the user can stake he has to proceed a KYC.

1.  Trigger the [KYC endpoint](https://api.lock.space/swagger/#/KYC/KycController_startKyc) for KYC registration

2.  User has to do KYC

    a) If the user is already verified (kycStatus = `Completed`) at DFX.swiss with the same address you can transfer the KYC data after [sign-in](https://api.dfx.swiss/swagger/#/auth/AuthController_signIn) with the [transfer endpoint](https://api.dfx.swiss/swagger/#/kyc/KycController_transferKycData) at DFX API (use wallet name `LOCK.space`)

    b) If not, the user can do KYC at LOCK. Get and open the KYC Link which you can get from [KYC endpoint](https://api.lock.space/swagger/#/KYC/KycController_startKyc) or [user endpoint](https://api.lock.space/swagger/#/User/UserController_getUser)

3.  Check with the [user endpoint](https://api.lock.space/swagger/#/User/UserController_getUser) if KYC is finished (KYC status `Light` or `Full`)

## Staking

- Get the staking deposit address, id, information about fee, balance, min deposit, pending deposits, pending withdrawals etc. with the [staking endpoint](https://api.lock.space/swagger/#/Staking/StakingController_getStaking)

### Deposit

1. To deposit you have to send the asset to the deposit address

2. Optional you can create a pending Deposit to improve the UX for the user with the [deposit endpoint](https://api.lock.space/swagger/#/Deposit/DepositController_createDeposit)

### Withdrawal

1. Create a withdrawal with [withdrawal endpoint](https://api.lock.space/swagger/#/Withdrawal/StakingWithdrawalController_createWithdrawalDraft) to get the id and the signMessage

   You can get all open drafts with the [drafts endpoint](https://api.lock.space/swagger/#/Withdrawal/StakingWithdrawalController_getDraftWithdrawals)

   You can change the amount of the withdrawal with the [amount endpoint](https://api.lock.space/swagger/#/Withdrawal/StakingWithdrawalController_changeAmount) and you get also a signMessage

2. Sign the signMessage to get a signature to approve the withdrawal

3. Sign the withdrawal (with the generated signature) with the [sign endpoint](https://api.lock.space/swagger/#/Withdrawal/StakingWithdrawalController_signWithdrawal)

## Analytics

- You can get the current APR/APY with the [analytics/staking endpoint](https://api.lock.space/swagger/#/Analytics/StakingAnalyticsController_getStakingAnalytics)

- You can get a compact history (json or csv) of transactions (withdrawals, deposits & rewards) with the [compact endpoint](https://api.lock.space/swagger/#/Analytics/HistoryController_getCsvCompact)

- You can get a cointracking CSV of transactions (withdrawals, deposits & rewards) with the [CT endpoint](https://api.lock.space/swagger/#/Analytics/HistoryController_getCsvCT)

## Voting

- You can get the user votes with the [voting/votes endpoint](https://api.lock.space/swagger/#/Voting/VotingController_getVotes)

- You can submit the user votes with the [voting/votes endpoint](https://api.lock.space/swagger/#/Voting/VotingController_updateVotes)

## Integration Example

- LOCK.space is fully integrated in the [DFX.swiss wallet](https://github.com/DFXswiss/wallet)
