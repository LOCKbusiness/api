import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiCreatedResponse, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { GetJwt } from 'src/shared/auth/get-jwt.decorator';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { AssetDtoMapper } from '../mappers/asset-dto.mapper';
import { AssetDto } from '../__tests__/asset.dto';
import { Asset } from '../entities/asset.entity';
import { AssetService } from '../services/asset.service';
import { UpdateAssetDto } from '../dto/update-asset.dto';

@ApiTags('Asset')
@Controller('asset')
export class AssetController {
  constructor(private assetService: AssetService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.USER))
  @ApiCreatedResponse({ type: AssetDto, isArray: true })
  async getAllAsset(@GetJwt() jwt: JwtPayload): Promise<AssetDto[]> {
    return this.assetService
      .getAllAssetsForBlockchain(jwt.blockchain)
      .then((assets) => assets.map((a) => AssetDtoMapper.entityToDto(a)));
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async updateAsset(@Param('id') id: string, @Body() dto: UpdateAssetDto): Promise<Asset> {
    return this.assetService.updateAsset(+id, dto);
  }
}
