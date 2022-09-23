import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { IEntity } from 'src/shared/models/entity';
import { User } from 'src/subdomains/user/domain/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { WalletBlockchainAddress } from './wallet-blockchain-address.entity';
import { WalletProvider } from './wallet-provider.entity';

@Entity()
export class Wallet extends IEntity {
  @OneToOne(() => WalletBlockchainAddress, { eager: true, nullable: false })
  @JoinColumn()
  address: WalletBlockchainAddress;

  @Column()
  signature: string;

  @ManyToOne(() => WalletProvider)
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
