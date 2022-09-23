import { UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/subdomains/user/application/services/user.service';

interface KycCheckStaking {
  userService: UserService;
}

export function CheckKyc(target: KycCheckStaking, propertyKey: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const userId: number = args[0];

    if (typeof userId !== 'number') throw new UnauthorizedException();

    const isKycSuccessful = await target.userService.isKycSuccessful(userId);

    if (!isKycSuccessful) throw new UnauthorizedException();

    return method.apply(this, args);
  };
}
