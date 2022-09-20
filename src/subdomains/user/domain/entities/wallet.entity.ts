import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { IEntity } from 'src/shared/entities/entity';
import { User } from 'src/subdomains/user/domain/entities/user.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { WalletProvider } from './wallet-provider.entity';

@Entity()
export class Wallet extends IEntity {
  @Column({ length: 256, unique: true })
  address: string;

  @Column({ length: 256 })
  signature: string;

  @ManyToOne(() => WalletProvider)
  walletProvider: WalletProvider;

  @Column({ length: 256, unique: true })
  ref: string;

  @Column({ length: 256, default: '000-000' })
  usedRef: string;

  @Column({ length: 256, default: WalletRole.USER })
  role: WalletRole;

  @Column({ length: 256, default: '0.0.0.0' })
  ip: string;

  @Column({ length: 256, nullable: true })
  ipCountry: string;

  @Column({ length: 'MAX', nullable: true })
  cfpVotes: string;

  @Column({ type: 'float', nullable: true })
  stakingFee: number;

  @Column({ type: 'datetime2', nullable: true })
  stakingStart: Date;

  @ManyToOne(() => User, { nullable: false })
  user: User;
}
