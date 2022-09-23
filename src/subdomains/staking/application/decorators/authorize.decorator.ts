import { UnauthorizedException } from '@nestjs/common';
import { StakingRepository } from '../repositories/staking.repository';

interface AuthorizeStaking {
  repository: StakingRepository;
}

export function Authorize(target: AuthorizeStaking, propertyKey: string, descriptor: PropertyDescriptor): void {
  const method = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const userId: number = args['userId'] ?? args['_userId'];

    if (!userId) throw new UnauthorizedException();

    const staking = await target.repository.findOne({ userId });

    if (!staking) throw new UnauthorizedException();

    return method.apply(this, args);
  };
}
