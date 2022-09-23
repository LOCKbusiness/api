import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { KycStatus } from '../enums';
import { Country } from './country.entity';
import { Wallet } from './wallet.entity';

@Entity()
export class User extends IEntity {
  @Column({ length: 256, nullable: true })
  kycId: string;

  @Column({ length: 256, nullable: true })
  mail: string;

  @Column({ length: 256, nullable: true })
  firstName: string;

  @Column({ length: 256, nullable: true })
  lastName: string;

  @Column({ length: 256, nullable: true })
  street: string;

  @Column({ length: 256, nullable: true })
  houseNumber: string;

  @Column({ length: 256, nullable: true })
  city: string;

  @Column({ length: 256, nullable: true })
  zip: string;

  @ManyToOne(() => Country, { eager: true })
  country: Country;

  @Column({ length: 256, nullable: true })
  phone: string;

  @Column({ length: 256, nullable: true })
  language: string;

  @Column({ length: 256, default: KycStatus.NA })
  kycStatus: KycStatus;

  @Column({ length: 256, nullable: true })
  kycHash: string;

  @OneToMany(() => Wallet, (wallet) => wallet.user)
  wallets: Wallet[];
}
