import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { BlockchainAddressReservationRepository } from './application/repositories/blockchain-address-reservation.repository';
import { ReservableBlockchainAddressRepository } from './application/repositories/reservable-blockchain-address.repository';
import { ReservableBlockchainAddressService } from './application/services/reservable-blockchain-address.service';
import { BlockchainAddressReservation } from './domain/entities/blockchain-address-reservation.entity';
import { ReservableBlockchainAddress } from './domain/entities/reservable-blockchain-address.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReservableBlockchainAddress, BlockchainAddressReservation]), SharedModule],
  controllers: [],
  providers: [
    BlockchainAddressReservationRepository,
    ReservableBlockchainAddressRepository,
    ReservableBlockchainAddressService,
  ],
  exports: [ReservableBlockchainAddressService],
})
export class AddressPoolModule {}
