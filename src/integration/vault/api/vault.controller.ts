import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { VaultService } from '../application/services/vault.service';

@ApiTags('Vault')
@Controller('vault')
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get()
  @ApiOkResponse({ type: String, isArray: true })
  getVaults(): Promise<string[]> {
    return this.vaultService.getAllIds();
  }
}
