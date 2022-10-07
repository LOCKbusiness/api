import { RawTxDto } from '../raw-tx.dto';

const defaultRawTxDto: Partial<RawTxDto> = {
  hex: '0',
  scriptHex: '0',
  prevouts: [],
};

export function createDefaultRawTxDto(): RawTxDto {
  return createCustomRawTxDto({});
}

export function createCustomRawTxDto(customValues: Partial<RawTxDto>): RawTxDto {
  return Object.assign(new RawTxDto(), { ...defaultRawTxDto, ...customValues });
}
