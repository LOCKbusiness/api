import { UtxoSizePriority } from '../enums';

export interface UtxoConfig {
  useFeeBuffer?: boolean;
  sizePriority?: UtxoSizePriority;
}
