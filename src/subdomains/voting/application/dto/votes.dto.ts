import { VoteDecision } from '../../domain/enums';

export interface Votes {
  [cfpId: string]: VoteDecision;
}
