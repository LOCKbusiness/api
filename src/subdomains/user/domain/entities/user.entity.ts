import { IEntity } from 'src/shared/models/entity';
import { Votes } from 'src/subdomains/voting/application/dto/votes.dto';
import { Column, Entity, Index, ManyToOne, OneToMany } from 'typeorm';
import { KycStatus } from '../enums';
import { KycCompleted, KycFulfills } from '../utils';
import { Country } from '../../../../shared/models/country.entity';
import { Wallet } from './wallet.entity';

@Entity()
export class User extends IEntity {
  @Column({ nullable: true })
  @Index({ unique: true, where: 'kycId IS NOT NULL' })
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

  get hasKyc(): boolean {
    return KycCompleted(this.kycStatus);
  }

  hasAtLeast(minKyc: KycStatus): boolean {
    return KycFulfills(this.kycStatus, minKyc);
  }

  get vote(): Votes {
    return this.votes ? JSON.parse(this.votes) : {};
  }
}
