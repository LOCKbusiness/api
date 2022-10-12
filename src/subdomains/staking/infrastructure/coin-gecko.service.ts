import { Injectable } from '@nestjs/common';
import { HttpService } from 'src/shared/services/http.service';

@Injectable()
export class CoinGeckoService {
  constructor(private readonly httpService: HttpService) {}
}
