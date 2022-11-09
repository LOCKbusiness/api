# LOCK API

API for LOCK.space international staking service

# Documentation

- [Registration](#registration)
- [KYC](#kyc)
- [Staking](#staking)
- [Deposit](#deposit)
- [Withdrawal](#withdrawal)
- [Analytics](#analytics)
- [Voting](#voting)
- [Integration Example](#integration-example)

# Registration

1. Contact [support](support@lock.space) to registrate your wallet name
2. Create an address on selected blockchain (eg. DeFiChain)
3. Get and sign message from sign-message endpoint: https://dev.api.lock.space/swagger/#/Authentication/AuthController_getSignMessage
4. Register the user with the sign-up endpoint: https://dev.api.lock.space/swagger/#/Authentication/AuthController_signUp
5. Now you can get your access token (with address & signature) with the sign-in endpoint: https://dev.api.lock.space/swagger/#/Authentication/AuthController_signIn

# KYC

Before the user can stake he has to proceed a KYC.

1.  Trigger the kyc endpoint for KYC registration: https://dev.api.lock.space/swagger/#/KYC/KycController_startKyc

2.  User has to do KYC

        a) If the address is already registered and the user processed the KYC process at DFX.swiss you can transfer the KYC data with the transfer endpoint at DFX API:

    https://api.dfx.swiss/swagger/#/auth/AuthController_signIn
    https://api.dfx.swiss/swagger/#/kyc/KycController_transferKycData

        b) Get and open the KYC Link which you can get from kyc endpoint after register KYC or from user endpoint ("kycLink"):
        https://dev.api.lock.space/swagger/#/User/UserController_getUser

3.  Check with the user endpoint if KYC is finished (kycStatus = 'Light'):
    https://dev.api.lock.space/swagger/#/User/UserController_getUser

# Staking

Get the staking deposit address, id, information about fee, balance, min deposit, pending deposits, pending withdrawals etc. with the staking endpoint: https://dev.api.lock.space/swagger/#/Staking/StakingController_getStaking

# Deposit

1. To deposit you have to send the asset to the deposit address

2. Optional you can create a pending Deposit to improve the UX for the user with the deposit endpoint: https://dev.api.lock.space/swagger/#/Deposit/DepositController_createDeposit

# Withdrawal

1. Create a withdrawal with withdrawal endpoint to get the id and the signMessage: https://api.lock.space/swagger/#/Withdrawal/StakingWithdrawalController_createWithdrawalDraft

   You can get all open drafts with the drafts endpoint: https://api.lock.space/swagger/#/Withdrawal/StakingWithdrawalController_getDraftWithdrawals

   You can change the amount of the withdrawal with the amount endpoint and you get also a signMessage: https://api.lock.space/swagger/#/Withdrawal/StakingWithdrawalController_changeAmount

2. Sign the signMessage to get a signature to approve the withdrawal

3. Sign the withdrawal (with the generated signature) with the sign endpoint: https://api.lock.space/swagger/#/Withdrawal/StakingWithdrawalController_signWithdrawal

# Analytics

- You can get the current APR/APY with the analytics/staking endpoint: https://api.lock.space/swagger/#/Analytics/StakingAnalyticsController_getStakingAnalytics

- You can get a compact history (json or csv) of transactions (withdrawals, deposits & rewards) with the compact endpoint: https://api.lock.space/swagger/#/Analytics/HistoryController_getCsvCompact

- You can get a cointracking CSVC of transactions (withdrawals, deposits & rewards) with the CT endpoint: https://dev.api.lock.space/swagger/#/Analytics/HistoryController_getCsvCT

# Voting

- You can get the user votes with the voting/votes endpoint:
  https://dev.api.lock.space/swagger/#/Voting/VotingController_getVotes

- You can submit the user votes with the voting/votes endpoint:
  https://dev.api.lock.space/swagger/#/Voting/VotingController_updateVotes

# Integration Example

LOCK.space is fully integrated in the DFX.swiss wallet: https://github.com/DFXswiss/wallet
