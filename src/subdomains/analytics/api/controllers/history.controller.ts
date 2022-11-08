import { Controller, Get, StreamableFile, Response, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { CoinTrackingCsvHistoryDto } from '../../application/dto/output/coin-tracking-history.dto';
import { CompactHistoryDto } from '../../application/dto/output/history.dto';
import { ExportType, StakingHistoryService } from '../../application/services/staking-history.service';

export enum ExportDataType {
  CSV = 'csv',
  JSON = 'json',
}

@ApiTags('Analytics')
@Controller('analytics/history')
export class HistoryController {
  constructor(private readonly historyService: StakingHistoryService) {}

  @Get('compact')
  @ApiResponse({ status: 200, type: CompactHistoryDto, isArray: true })
  async getCsvCompact(
    @Query('userAddress') userAddress: string,
    @Query('depositAddress') depositAddress: string,
    @Query('type') type: ExportDataType,
    @Response({ passthrough: true }) res,
  ): Promise<CompactHistoryDto[] | StreamableFile> {
    switch (type) {
      case ExportDataType.CSV:
        const csvFile = new StreamableFile(
          await this.historyService.getHistoryCsv(userAddress, depositAddress, ExportType.COMPACT),
        );

        res.set({
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="LOCK_history_${this.formatDate()}.csv"`,
        });
        return csvFile;

      case ExportDataType.JSON:
        return await this.historyService.getHistory(userAddress, depositAddress, ExportType.COMPACT);
    }
  }

  @Get('CT')
  @ApiResponse({ status: 200, type: CoinTrackingCsvHistoryDto, isArray: true })
  async getCsvCT(
    @Query('userAddress') userAddress: string,
    @Query('depositAddress') depositAddress: string,
    @Response({ passthrough: true }) res,
  ): Promise<StreamableFile> {
    const csvFile = new StreamableFile(
      await this.historyService.getHistoryCsv(userAddress, depositAddress, ExportType.CT),
    );

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="LOCK_CT_history_${this.formatDate()}.csv"`,
    });
    return csvFile;
  }

  // --- HELPER METHODS --- //
  private formatDate(date: Date = new Date()): string {
    return date.toISOString().split('-').join('').split(':').join('').split('T').join('_').split('.')[0];
  }
}
