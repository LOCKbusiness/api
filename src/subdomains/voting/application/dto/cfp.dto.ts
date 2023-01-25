export interface CfpDto {
  number: string;
  title: string;
  type: 'cfp' | 'dfip';
  startDate: string;
  endDate: string;
}

export interface CfpInfo {
  id: string;
  name: string;
}
