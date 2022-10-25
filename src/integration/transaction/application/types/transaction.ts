export type Transaction = {
  signed: (hex: string) => void;
  invalidated: (reason: string) => void;
};
