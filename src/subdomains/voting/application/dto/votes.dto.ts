import { Vote } from '../../domain/enums';

export interface Votes {
  [cfpId: string]: Vote;
}
