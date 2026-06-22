import { Controller, Get } from '@nestjs/common';
import { HomeService } from './home.service';
import { Public } from '../../common/guards/public.decorator';

@Public() // 首页聚合数据公开访问（未登录可看）
@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  async getHome() {
    const data = await this.homeService.getHomeData();
    return { code: 0, message: 'success', data };
  }
}
