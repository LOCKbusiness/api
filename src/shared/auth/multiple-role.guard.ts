import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';

@Injectable()
export class MultipleRoleGuard implements CanActivate {
  constructor(private readonly entryRole: WalletRole[]) {}

  canActivate(context: ExecutionContext): boolean {
    const userRole = context.switchToHttp().getRequest().user.role;
    return this.entryRole.includes(userRole);
  }
}
