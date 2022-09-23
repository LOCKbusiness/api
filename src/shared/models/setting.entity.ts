import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Setting {
  @PrimaryColumn({ unique: true })
  key: string;

  @Column({ length: 'MAX' })
  value: string;
}
