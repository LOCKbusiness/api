import { EntityRepository, Repository } from 'typeorm';
import { WalletProvider } from '../../domain/entities/wallet-provider.entity';

@EntityRepository(WalletProvider)
export class WalletProviderRepository extends Repository<WalletProvider> {}
