import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/guards/public.decorator';
import { WechatLoginDto } from '../../common/dto';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wechat-login')
  async wechatLogin(@Body() body: WechatLoginDto) {
    const data = await this.authService.login(body.code);
    return { code: 0, message: 'success', data };
  }
}
