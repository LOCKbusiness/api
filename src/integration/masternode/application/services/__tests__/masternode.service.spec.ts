import { MasternodeInfo } from '@defichain/jellyfish-api-core/dist/category/masternode';
import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { BehaviorSubject } from 'rxjs';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService } from 'src/blockchain/ain/node/node.service';
import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';
import { HttpService } from 'src/shared/services/http.service';
import { SettingService } from 'src/shared/services/setting.service';
import { MasternodeRepository } from '../../repositories/masternode.repository';
import { MasternodeOwnerService } from '../masternode-owner.service';
import { MasternodeService } from '../masternode.service';

describe('MasternodeService', () => {
  let service: MasternodeService;

  let repository: MasternodeRepository;
  let masternodeOwnerService: MasternodeOwnerService;
  let http: HttpService;
  let settingService: SettingService;
  let nodeService: NodeService;
  let nodeClient: DeFiClient;

  beforeEach(async () => {
    repository = createMock<MasternodeRepository>();
    masternodeOwnerService = createMock<MasternodeOwnerService>();
    http = createMock<HttpService>();
    settingService = createMock<SettingService>();
    nodeService = createMock<NodeService>();
    nodeClient = createMock<DeFiClient>();

    jest
      .spyOn(nodeService, 'getConnectedNode')
      .mockImplementation(() => new BehaviorSubject(nodeClient).asObservable());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: MasternodeRepository, useValue: repository },
        { provide: MasternodeOwnerService, useValue: masternodeOwnerService },
        { provide: HttpService, useValue: http },
        { provide: SettingService, useValue: settingService },
        { provide: NodeService, useValue: nodeService },
        MasternodeService,
      ],
    }).compile();

    service = module.get<MasternodeService>(MasternodeService);
  });

  const Setup = {
    MasternodesToResign: (masternodes: Partial<Masternode & { tms: number[] }>[]) => {
      jest.spyOn(repository, 'find').mockResolvedValue(masternodes as (Masternode & { tms: number[] })[]);
      jest.spyOn(nodeClient, 'getMasternodeInfo').mockImplementation((id) =>
        Promise.resolve({
          targetMultipliers: masternodes.find((mn) => mn.creationHash === id)?.tms ?? [0],
        } as MasternodeInfo),
      );
    },
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return masternodes ordered by server and TMs', async () => {
    Setup.MasternodesToResign([
      { id: 1, creationHash: 'hash1', server: 'serverA', tms: [5] },
      { id: 2, creationHash: 'hash2', server: 'serverC', tms: [0] },
      { id: 3, creationHash: 'hash3', server: 'serverB', tms: [0] },
      { id: 4, creationHash: 'hash4', server: 'serverA', tms: [1] },
      { id: 5, creationHash: 'hash5', server: 'serverA', tms: [3] },
    ]);

    const masternodes = await service.getOrderedForResigning();

    expect(masternodes.map((m) => m.id)).toMatchObject([4, 5, 1, 3, 2]);
  });
});
