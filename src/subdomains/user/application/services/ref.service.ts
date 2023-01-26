import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Util } from 'src/shared/util';
import { IsNull, LessThan } from 'typeorm';
import { Ref } from '../../domain/entities/ref.entity';
import { RefRepository } from '../repositories/ref-repository';

@Injectable()
export class RefService {
  constructor(private refRepo: RefRepository) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkRefs(): Promise<void> {
    try {
      // registered refs expire after 3 days
      const expirationDate = Util.daysBefore(3);

      const expiredRefs = await this.refRepo.findBy({ updated: LessThan(expirationDate), origin: IsNull() });
      await this.refRepo.remove(expiredRefs);
    } catch (e) {
      console.error('Exception during ref check:', e);
    }
  }

  async addOrUpdate(ip: string, ref?: string, origin?: string): Promise<Ref | undefined> {
    try {
      return await this.refRepo.addOrUpdate(ip, ref, origin);
    } catch (e) {
      console.log('Exception during ref update:', e);
    }
  }

  async get(ip: string): Promise<Ref | undefined> {
    return await this.refRepo.getAndRemove(ip);
  }
}
