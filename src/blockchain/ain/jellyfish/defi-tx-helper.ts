import { MasternodeTimeLock } from 'src/subdomains/staking/domain/enums';
import {
  OP_CODES,
  OP_DEFI_TX,
  PoolSwap,
  PoolId,
  Script,
  ScriptBalances,
  TokenBalanceUInt32,
  TokenBalanceVarInt,
} from '@defichain/jellyfish-transaction';
import { JellyfishService } from './jellyfish.service';
import { TestNet } from '@defichain/jellyfish-network';
import BigNumber from 'bignumber.js';

export class DefiTxHelper {
  // --- MASTERNODE --- //
  static createMasternode(operatorType: number, operatorPubKeyHash: string, timeLock: MasternodeTimeLock): OP_DEFI_TX {
    return OP_CODES.OP_DEFI_TX_CREATE_MASTER_NODE({
      operatorType,
      operatorPubKeyHash,
      timelock: timeLock,
    });
  }

  static resignMasternode(creationTxId: string): OP_DEFI_TX {
    return OP_CODES.OP_DEFI_TX_RESIGN_MASTER_NODE({
      nodeId: creationTxId,
    });
  }

  // --- TOKEN --- //
  static anyAccountToAccount(from: Script, to: Script, balances: TokenBalanceUInt32[]): OP_DEFI_TX {
    return OP_CODES.OP_DEFI_TX_ANY_ACCOUNT_TO_ACCOUNT({
      from: [
        {
          script: from,
          balances,
        },
      ],
      to: [
        {
          script: to,
          balances,
        },
      ],
    });
  }

  // --- VAULT --- //
  static createVault(ownerAddress: Script): OP_DEFI_TX {
    const schemeId = JellyfishService.getNetwork() === TestNet ? 'C150' : 'MIN150';
    return OP_CODES.OP_DEFI_TX_CREATE_VAULT({
      ownerAddress,
      schemeId,
    });
  }

  static depositToVault(vaultId: string, from: Script, tokenAmount: TokenBalanceVarInt): OP_DEFI_TX {
    return OP_CODES.OP_DEFI_TX_DEPOSIT_TO_VAULT({
      vaultId,
      from,
      tokenAmount,
    });
  }

  static withdrawFromVault(vaultId: string, to: Script, tokenAmount: TokenBalanceVarInt): OP_DEFI_TX {
    return OP_CODES.OP_DEFI_TX_WITHDRAW_FROM_VAULT({
      vaultId,
      to,
      tokenAmount,
    });
  }

  static takeLoan(vaultId: string, to: Script, tokenAmounts: TokenBalanceUInt32[]): OP_DEFI_TX {
    return OP_CODES.OP_DEFI_TX_TAKE_LOAN({
      vaultId,
      to,
      tokenAmounts,
    });
  }

  static paybackLoan(vaultId: string, from: Script, tokenAmounts: TokenBalanceUInt32[]): OP_DEFI_TX {
    return OP_CODES.OP_DEFI_TX_PAYBACK_LOAN({
      vaultId,
      from,
      tokenAmounts,
    });
  }

  // --- POOL --- //
  static addPoolLiquidity(from: ScriptBalances[], shareAddress: Script): OP_DEFI_TX {
    return OP_CODES.OP_DEFI_TX_POOL_ADD_LIQUIDITY({
      from,
      shareAddress,
    });
  }

  static removePoolLiquidity(from: Script, tokenId: number, amount: BigNumber): OP_DEFI_TX {
    return OP_CODES.OP_DEFI_TX_POOL_REMOVE_LIQUIDITY({
      script: from,
      tokenId,
      amount,
    });
  }

  // --- SWAP --- //
  static compositeSwap(poolSwap: PoolSwap, pools: PoolId[]): OP_DEFI_TX {
    return OP_CODES.OP_DEFI_TX_COMPOSITE_SWAP({
      poolSwap,
      pools,
    });
  }
}
