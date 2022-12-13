import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { BlockchainAddressReservationRepository } from './application/repositories/blockchain-address-reservation.repository';
import { ReservableBlockchainAddressRepository } from './application/repositories/reservable-blockchain-address.repository';
import { ReservableBlockchainAddressService } from './application/services/reservable-blockchain-address.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReservableBlockchainAddressRepository, BlockchainAddressReservationRepository]),
    SharedModule,
  ],
  controllers: [],
  providers: [ReservableBlockchainAddressService],
  exports: [ReservableBlockchainAddressService],
})
export class AddressPoolModule {}
