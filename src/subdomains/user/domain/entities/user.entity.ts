import { IEntity } from 'src/shared/models/entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { KycStatus } from '../enums';
import { Country } from './country.entity';
import { Wallet } from './wallet.entity';

@Entity()
export class User extends IEntity {
  @Column({ nullable: true })
  kycId: string;

  @Column({ nullable: true })
  mail: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  street: string;

  @Column({ nullable: true })
  houseNumber: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  zip: string;

  @ManyToOne(() => Country, { eager: true })
  country: Country;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  language: string;

  @Column({ default: KycStatus.NA })
  kycStatus: KycStatus;

  @Column({ nullable: true })
  kycHash: string;

  @Column({ nullable: true, length: 'MAX' })
  votes: string;

  @OneToMany(() => Wallet, (wallet) => wallet.user)
  wallets: Wallet[];
}
