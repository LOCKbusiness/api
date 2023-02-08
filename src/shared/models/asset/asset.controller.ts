import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { AssetDto } from './asset.dto';
import { Asset } from './asset.entity';
import { AssetService } from './asset.service';

@ApiTags('asset')
@Controller('asset')
export class AssetController {
  constructor(private assetService: AssetService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiCreatedResponse({ type: AssetDto, isArray: true })
  async getAllAsset(@GetJwt() jwt?: JwtPayload): Promise<AssetDto[]> {
    return this.assetService.getAllAssetsForBlockchain(jwt?.blockchain).then(this.toDto);
  }

  toDto(assets: Asset[]): AssetDto[] {
    return assets.map((asset) => ({
      name: asset.name,
      displayName: asset.displayName,
      type: asset.type,
      category: asset.category,
      blockchain: asset.blockchain,
    }));
  }
}
