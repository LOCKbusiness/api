export type Transaction = {
  signed: (hex: string) => void;
  invalidated: () => void;
};
