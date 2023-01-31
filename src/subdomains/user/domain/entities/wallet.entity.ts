import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { IEntity } from 'src/shared/models/entity';
import { User } from 'src/subdomains/user/domain/entities/user.entity';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { WalletProvider } from './wallet-provider.entity';

@Entity()
@Index((w: Wallet) => [w.address.address], { unique: true })
export class Wallet extends IEntity {
  @Column(() => BlockchainAddress)
  address: BlockchainAddress;

  @Column()
  signature: string;

  @ManyToOne(() => WalletProvider, { nullable: false })
  walletProvider: WalletProvider;

  @Column({ unique: true })
  ref: string;

  @Column({ default: WalletRole.USER })
  role: WalletRole;

  @Column({ default: '0.0.0.0' })
  ip: string;

  @Column({ nullable: true })
  ipCountry: string;

  @ManyToOne(() => User, { nullable: false })
  user: User;
}
