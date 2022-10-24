import { Controller, UseGuards, Get, Query, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { RoleGuard } from 'src/shared/auth/role.guard';
import { WalletRole } from 'src/shared/auth/wallet-role.enum';
import { getConnection } from 'typeorm';

@Controller('admin')
export class AdminController {
  @Get('db')
  @ApiBearerAuth()
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard(), new RoleGuard(WalletRole.ADMIN))
  async getRawData(
    @Query()
    {
      table,
      min,
      updatedSince,
      maxLine,
      sorting = 'ASC',
    }: {
      table: string;
      min?: string;
      updatedSince?: string;
      maxLine?: string;
      sorting?: 'ASC' | 'DESC';
    },
  ): Promise<any> {
    const id = min ? +min : 1;
    const maxResult = maxLine ? +maxLine : undefined;
    const updated = updatedSince ? new Date(updatedSince) : new Date(0);

    const data = await getConnection()
      .createQueryBuilder()
      .from(table, table)
      .where('id >= :id', { id })
      .andWhere('updated >= :updated', { updated })
      .orderBy('id', sorting)
      .take(maxResult)
      .getRawMany()
      .catch((e: Error) => {
        throw new BadRequestException(e.message);
      });

    // transform to array
    return data.length > 0
      ? {
          keys: Object.keys(data[0]),
          values: data.map((e) => Object.values(e)),
        }
      : undefined;
  }
}
