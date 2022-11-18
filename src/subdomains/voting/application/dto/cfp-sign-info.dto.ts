export interface CfpSignInfoDto {
  name: string;
  votes: { accountIndex: number; address: string; message: string }[];
}
