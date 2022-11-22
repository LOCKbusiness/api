export enum Vote {
  YES = 'Yes',
  NO = 'No',
  NEUTRAL = 'Neutral',
}

export interface Votes {
  [cfpId: string]: Vote;
}
