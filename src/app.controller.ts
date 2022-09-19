import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller('')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Redirect('swagger')
  @ApiExcludeEndpoint()
  async home(): Promise<any> {
    // nothing to do (redirect to Swagger UI)
  }

  @Get('app')
  getHello(): string {
    return this.appService.getHello();
  }
}
