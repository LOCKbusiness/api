import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Lock } from 'src/shared/lock';
import { BlockchainAddressService } from 'src/shared/models/blockchain-address/blockchain-address.service';
import { Staking } from '../../domain/entities/staking.entity';
import { StakingDeFiChainService } from '../../infrastructre/staking-defichain.service';
import { Authorize } from '../decorators/authorize.decorator';
import { CheckKyc } from '../decorators/check-kyc.decorator';
import { CreateDepositDto } from '../dto/input/create-deposit.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingDepositService {
  private readonly lock = new Lock(7200);

  constructor(
    private readonly factory: StakingFactory,
    private readonly repository: StakingRepository,
    private readonly blockchainAddressService: BlockchainAddressService,
    private readonly deFiChainStakingService: StakingDeFiChainService,
  ) {}

  //*** PUBLIC API ***//

  @Authorize()
  @CheckKyc()
  async createDeposit(userId: number, stakingId: string, dto: CreateDepositDto): Promise<Staking> {
    // TODO - make sure to overwrite the amount with actual amount from BC transaction
    const staking = await this.repository.findOne(stakingId);

    const deposit = this.factory.createDeposit(staking, dto);

    staking.addDeposit(deposit);

    await this.repository.save(staking);

    return staking;
  }

  //*** JOBS ***//

  @Interval(300000)
  async checkBlockchainDepositInputs(): Promise<void> {
    if (!this.lock.acquire()) return;

    try {
      await this.recordDepositTransactions();
      await this.forwardDepositsToStaking();
    } catch (e) {
      console.error('Exception during DeFiChain input checks:', e);
    } finally {
      this.lock.release();
    }
  }

  //*** HELPER METHODS ***//
  private async recordDepositTransactions(): Promise<void> {
    // get all new input transactions
    const newDepositTransactions = this.deFiChainStakingService.getNewDepositTransactions();

    // loop through deposit addresses and find staking by this address

    // OPTIONAL - if staking is not found create new Staking with deposit

    // if this is first deposit - verify if source address is a user address (check with withdrawal asset)
  }

  private async _saveInputs(): Promise<void> {
    const { blocks: currentHeight } = await this.checkNodeInSync(this.client);

    // get block heights
    const lastHeight = await this.cryptoInputRepo
      .findOne({ order: { blockHeight: 'DESC' } })
      .then((input) => input?.blockHeight ?? 0);

    const utxos = await this.client.getUtxo();

    const newInputs = await this.getAddressesWithFunds(utxos, tokens)
      .then((i) => i.filter((e) => e != Config.blockchain.default.utxoSpenderAddress))
      // get receive history
      .then((a) => this.client.getHistories(a, lastHeight + 1, currentHeight))
      .then((i) => i.filter((h) => [...this.utxoTxTypes].includes(h.type)))
      .then((i) => i.filter((h) => h.blockHeight > lastHeight))
      // map to entities
      .then((i) => this.createEntities(i))
      .then((i) => i.filter((h) => h != null))
      // check required balance
      .then((i) => i.filter((h) => this.hasMatchingBalance(h, utxos, tokens)));

    newInputs.length > 0 && console.log(`New DeFiChain inputs (${newInputs.length}):`, newInputs);

    // side effect, assuming that cryptoStakingRepo and stakingRepo are faultless on save
    for (const input of newInputs) {
      await this.cryptoInputRepo.save(input);

      switch (input?.type) {
        case CryptoInputType.CRYPTO_STAKING:
          if (input.amlCheck === AmlCheck.PASS) {
            await this.cryptoStakingService.create(input);
          }
          break;
      }
    }
  }

  private async createEntities(histories: AccountHistory[]): Promise<CryptoInput[]> {
    const inputs = [];

    for (const history of histories) {
      try {
        const amounts = this.getAmounts(history);
        for (const amount of amounts) {
          inputs.push(await this.createEntity(history, amount));
        }
      } catch (e) {
        console.error(`Failed to create DeFiChain input ${history.txid}:`, e);

        if (e instanceof NodeNotAccessibleError) {
          // abort the process until next interval cycle
          throw e;
        }
      }
    }

    return inputs;
  }

  private async createEntity(history: AccountHistory, { amount, asset, isToken }: HistoryAmount): Promise<CryptoInput> {
    // get asset
    const assetEntity = await this.assetService.getAssetByQuery({
      dexName: asset,
      blockchain: Blockchain.DEFICHAIN,
      isToken,
    });
    if (!assetEntity) {
      console.error(`Failed to process DeFiChain input. No asset ${asset} found. History entry:`, history);
      return null;
    }

    // only sellable
    if (!assetEntity.sellable || assetEntity.category === AssetCategory.POOL_PAIR) {
      console.log(`Ignoring unsellable DeFiChain input (${amount} ${asset}). History entry:`, history);
      return null;
    }

    const { btcAmount, usdtAmount } = await this.getReferenceAmounts(asset, amount);

    // min. deposit
    if (
      (asset === 'DFI' && amount < Config.blockchain.default.minDeposit.DeFiChain.DFI) ||
      (asset !== 'DFI' && usdtAmount < Config.blockchain.default.minDeposit.DeFiChain.USD * 0.4)
    ) {
      console.log(`Ignoring too small DeFiChain input (${amount} ${asset}). History entry:`, history);
      return null;
    }

    // get deposit route
    const route = await this.getDepositRoute(history.owner);
    if (!route) {
      console.error(
        `Failed to process DeFiChain input. No matching route for ${history.owner} found. History entry:`,
        history,
      );
      return null;
    }

    // ignore AccountToUtxos for sell
    if (route.type === RouteType.SELL && history.type === 'AccountToUtxos') {
      console.log('Ignoring AccountToUtxos DeFiChain input on sell route. History entry:', history);
      return null;
    }

    // only DFI for staking
    if (route.type === RouteType.STAKING && assetEntity.name != 'DFI') {
      console.log(`Ignoring non-DFI DeFiChain input (${amount} ${asset}) on staking route. History entry:`, history);
      return null;
    }

    return this.cryptoInputRepo.create({
      inTxId: history.txid,
      blockHeight: history.blockHeight,
      amount: amount,
      asset: assetEntity,
      route: route,
      btcAmount: btcAmount,
      usdtAmount: usdtAmount,
      isConfirmed: false,
      amlCheck: route.user.userData.kycStatus === KycStatus.REJECTED ? AmlCheck.FAIL : AmlCheck.PASS,
      type:
        route.type === RouteType.SELL
          ? route.id == this.cryptoCryptoRouteId
            ? CryptoInputType.CRYPTO_CRYPTO
            : CryptoInputType.BUY_FIAT
          : route.type === RouteType.STAKING
          ? CryptoInputType.CRYPTO_STAKING
          : CryptoInputType.UNKNOWN,
    });
  }

  private async forwardDepositsToStaking(): Promise<void> {
    // find all stakings where one of deposits cas status PENDING_FORWARD

    // get those deposits -> run the forwarding

    // change deposits state, set status to confirmed

    // save the stakings

    const inputs = await this.cryptoInputRepo.find({
      where: {
        outTxId: IsNull(),
        amlCheck: AmlCheck.PASS,
        route: { deposit: { blockchain: Blockchain.DEFICHAIN } },
      },
      relations: ['route'],
    });

    for (const input of inputs) {
      try {
        const targetAddress =
          input.route.type === RouteType.SELL
            ? Config.blockchain.default.dexWalletAddress
            : Config.blockchain.default.stakingWalletAddress;

        input.asset.type === AssetType.COIN
          ? await this.forwardUtxo(input, targetAddress)
          : await this.forwardToken(input, targetAddress);
      } catch (e) {
        console.error(`Failed to forward DeFiChain input ${input.id}:`, e);
      }
    }
  }

  private async forwardUtxo(input: CryptoInput, address: string): Promise<void> {
    const outTxId = await this.client.sendCompleteUtxo(input.route.deposit.address, address, input.amount);
    await this.cryptoInputRepo.update({ id: input.id }, { outTxId });
  }

  private async confirmDeposit(userId: number, stakingId: string, depositId: string, txId: string): Promise<Staking> {
    const staking = await this.repository.findOne(stakingId);

    const deposit = staking.getDeposit(depositId);

    deposit.confirmDeposit(txId);

    await this.repository.save(staking);

    return staking;
  }
}
