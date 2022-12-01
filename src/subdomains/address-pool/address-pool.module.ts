import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { BlockchainAddressReservationRepository } from './application/repositories/blockchain-address-reservation.repository';
import { ReservedBlockchainAddressRepository } from './application/repositories/reserved-blockchain-address.repository';
import { ReservedBlockchainAddressService } from './application/services/reserved-blockchain-address.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReservedBlockchainAddressRepository, BlockchainAddressReservationRepository]),
    SharedModule,
  ],
  controllers: [],
  providers: [ReservedBlockchainAddressService],
  exports: [ReservedBlockchainAddressService],
})
export class AddressPoolModule {}
