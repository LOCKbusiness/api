export class NoTransactionIdException extends Error {
  constructor(message?: string) {
    super(message);
  }
}
