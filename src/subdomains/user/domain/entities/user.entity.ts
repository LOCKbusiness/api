import { IEntity } from 'src/shared/entities/entity';
import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { KycStatus } from '../enums';
import { Country } from './country.entity';
import { Wallet } from './wallet.entity';

@Entity()
export class User extends IEntity {
  @Column({ length: 256, nullable: true })
  mail: string;

  @Column({ length: 256, nullable: true })
  firstname: string;

  @Column({ length: 256, nullable: true })
  surname: string;

  @Column({ length: 256, nullable: true })
  street: string;

  @Column({ length: 256, nullable: true })
  houseNumber: string;

  @Column({ length: 256, nullable: true })
  location: string;

  @Column({ length: 256, nullable: true })
  zip: string;

  @ManyToOne(() => Country, { eager: true })
  country: Country;

  @Column({ length: 256, nullable: true })
  phone: string;

  @Column({ length: 256, nullable: true })
  language: string;

  @OneToMany(() => Wallet, (wallet) => wallet.user)
  wallets: Wallet[];

  @Column({ length: 256, default: KycStatus.NA })
  kycStatus: KycStatus;

  @Column()
  @Index({ unique: true })
  kycHash: string;
}
