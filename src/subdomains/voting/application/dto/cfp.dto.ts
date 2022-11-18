export class CfpDto {
  name: string;
  votes: { accountIndex: number; address: string; message: string };
}
