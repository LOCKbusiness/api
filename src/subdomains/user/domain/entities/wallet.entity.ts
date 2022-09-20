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

  @Column({ length: 256, default: WalletRole.USER })
  role: WalletRole;

  @Column({ length: 256, default: '0.0.0.0' })
  ip: string;

  @Column({ length: 256, nullable: true })
  ipCountry: string;

  @ManyToOne(() => User, { nullable: false })
  user: User;
}
