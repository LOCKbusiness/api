export interface CfpDto {
  number: number;
  title: string;
  type: 'cfp' | 'dfip';
  startDate: string;
  endDate: string;
}

export interface CfpInfo {
  id: number;
  name: string;
}
