import { Controller, Get, StreamableFile, Response, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ExportDataType, HistoryQueryCompact, HistoryQueryCT } from '../../application/dto/input/history-query.dto';
import { CoinTrackingCsvHistoryDto } from '../../application/dto/output/coin-tracking-history.dto';
import { CompactHistoryDto } from '../../application/dto/output/history.dto';
import { ExportType, StakingHistoryService } from '../../application/services/staking-history.service';

@ApiTags('Analytics')
@Controller('analytics/history')
export class HistoryController {
  constructor(private readonly historyService: StakingHistoryService) {}

  @Get('compact')
  @ApiOkResponse({ type: CompactHistoryDto, isArray: true })
  async getCsvCompact(
    @Query() query: HistoryQueryCompact,
    @Response({ passthrough: true }) res,
  ): Promise<CompactHistoryDto[] | StreamableFile> {
    switch (query.type) {
      case ExportDataType.CSV:
        const csvFile = await this.historyService.getHistoryCsv(
          query.userAddress,
          query.depositAddress,
          ExportType.COMPACT,
        );
        res.set({
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="LOCK_history_${this.formatDate()}.csv"`,
        });
        return csvFile;

      case ExportDataType.JSON:
        return await this.historyService.getHistory(query.userAddress, query.depositAddress, ExportType.COMPACT);
    }
  }

  @Get('CT')
  @ApiOkResponse({ type: CoinTrackingCsvHistoryDto, isArray: true })
  async getCsvCT(@Query() query: HistoryQueryCT, @Response({ passthrough: true }) res): Promise<StreamableFile> {
    const csvFile = await this.historyService.getHistoryCsv(query.userAddress, query.depositAddress, ExportType.CT);
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
