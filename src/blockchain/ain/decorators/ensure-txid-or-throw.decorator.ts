import { NoTransactionIdException } from '../exceptions/no-transaction-id.exception';

export function EnsureTxIdOrThrow() {
  return function (_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any) {
      const txId = await method.apply(this, args);

      if (!txId) throw new NoTransactionIdException(`No transaction ID returned from ${propertyKey} node call.`);

      return txId;
    };
  };
}
