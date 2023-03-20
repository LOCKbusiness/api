import { IEntity } from 'src/shared/entities/entity';
import { Column, Entity } from 'typeorm';
import { KycStatus } from '../enums';

@Entity()
export class WalletProvider extends IEntity {
  @Column({ unique: true })
  name: string;

  @Column({ default: KycStatus.LIGHT })
  minStakingKycStatus: KycStatus;
}
