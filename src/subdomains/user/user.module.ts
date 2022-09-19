import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { UserRepository } from './application/repositories/user.repository';
import { UserService } from './application/services/user.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserRepository]), SharedModule],
  controllers: [],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
