export interface CfpSignMessageDto {
  name: string;
  votes: { accountIndex: number; address: string; message: string }[];
}
