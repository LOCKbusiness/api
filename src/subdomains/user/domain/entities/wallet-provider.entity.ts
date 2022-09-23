import { IEntity } from 'src/shared/models/entity';
import { Column, Entity } from 'typeorm';
import { KycStatus } from '../enums';

@Entity()
export class WalletProvider extends IEntity {
  @Column({ unique: true, length: 256 })
  name: string;

  @Column({ length: 256, default: KycStatus.LIGHT })
  minStakingKycStatus: KycStatus;
}
