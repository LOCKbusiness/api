import { Controller, Get, StreamableFile, Response, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TypedHistoryDto } from '../../application/dto/output/history.dto';
import { StakingHistoryService } from '../../application/services/staking-history.service';

export enum ExportType {
  CSV = 'csv',
  JSON = 'json',
}

@ApiTags('Analytics')
@Controller('analytics/history')
export class HistoryController {
  constructor(private readonly historyService: StakingHistoryService) {}

  @Get('/raw')
  @ApiResponse({ status: 200, type: TypedHistoryDto, isArray: true })
  async getCsv(
    @Query('userAddress') userAddress: string,
    @Query('depositAddress') depositAddress: string,
    @Query('type') type: ExportType,
    @Response({ passthrough: true }) res,
  ): Promise<StreamableFile | TypedHistoryDto[]> {
    switch (type) {
      case ExportType.CSV:
        const csvFile = new StreamableFile(await this.historyService.getHistoryCsv(userAddress, depositAddress));

        res.set({
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="LOCK_history_${this.formatDate()}.csv"`,
        });
        return csvFile;

      case ExportType.JSON:
        return userAddress
          ? await this.historyService.getUserHistory(userAddress)
          : await this.historyService.getDepositAddressHistory(depositAddress);
    }
  }

  // --- HELPER METHODS --- //
  private formatDate(date: Date = new Date()): string {
    return date.toISOString().split('-').join('').split(':').join('').split('T').join('_').split('.')[0];
  }
}
