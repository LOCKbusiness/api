import { Controller, Get, StreamableFile, Response, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ExportDataType, HistoryQuery } from '../../application/dto/input/history-query.dto';
import { ChainReportCsvHistoryDto } from '../../application/dto/output/chain-report-history.dto';
import { CoinTrackingCsvHistoryDto } from '../../application/dto/output/coin-tracking-history.dto';
import { CompactHistoryDto } from '../../application/dto/output/history.dto';
import { ExportType, HistoryDto, StakingHistoryService } from '../../application/services/staking-history.service';

@ApiTags('Analytics')
@Controller('analytics/history')
export class HistoryController {
  constructor(private readonly historyService: StakingHistoryService) {}

  @Get('compact')
  @ApiOkResponse({ type: CompactHistoryDto, isArray: true })
  async getCsvCompact(
    @Query() query: HistoryQuery,
    @Response({ passthrough: true }) res,
  ): Promise<CompactHistoryDto[] | StreamableFile> {
    return this.getHistoryData(query, ExportType.COMPACT, res);
  }

  @Get('CoinTracking')
  @ApiOkResponse({ type: CoinTrackingCsvHistoryDto, isArray: true })
  async getCsvCT(
    @Query() query: HistoryQuery,
    @Response({ passthrough: true }) res,
  ): Promise<CoinTrackingCsvHistoryDto[] | StreamableFile> {
    return this.getHistoryData(query, ExportType.COIN_TRACKING, res);
  }

  @Get('ChainReport')
  @ApiOkResponse({ status: 200, type: ChainReportCsvHistoryDto, isArray: true })
  async getCsvChainReport(
    @Query() query: HistoryQuery,
    @Response({ passthrough: true }) res,
  ): Promise<ChainReportCsvHistoryDto[] | StreamableFile> {
    return this.getHistoryData(query, ExportType.CHAIN_REPORT, res);
  }

  // --- HELPER METHODS --- //
  private formatDate(date: Date = new Date()): string {
    return date.toISOString().split('-').join('').split(':').join('').split('T').join('_').split('.')[0];
  }

  private async getHistoryData<T extends ExportType>(
    query: HistoryQuery,
    exportType: T,
    res: any,
  ): Promise<HistoryDto<T>[] | StreamableFile> {
    const tx = await this.historyService.getHistory(query, exportType, query.type);
    if (query.type === ExportDataType.CSV)
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="LOCK_${exportType}_history_${this.formatDate()}.csv"`,
      });
    return tx;
  }
}
