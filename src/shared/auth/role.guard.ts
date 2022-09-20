import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';

@Injectable()
export class RoleGuard implements CanActivate {
  // additional allowed roles
  private readonly additionalRoles = {
    [WalletRole.USER]: [WalletRole.ADMIN],
  };

  constructor(private readonly entryRole: WalletRole) {}

  canActivate(context: ExecutionContext): boolean {
    const userRole = context.switchToHttp().getRequest().user.role;
    return this.entryRole === userRole || this.additionalRoles[this.entryRole]?.includes(userRole);
  }
}
