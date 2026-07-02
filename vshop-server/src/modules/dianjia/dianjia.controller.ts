import { Controller, Post, Body } from '@nestjs/common';
import { DianjiaService } from './dianjia.service';
import { Public } from '../../common/guards/public.decorator';

/**
 * 店管家控制器。路由前缀 /v1/dianjia。
 * - send-notify：@Public，店管家服务器回调发货通知（all.order.send），无 JWT。
 *   返回 { status:'SUCCESS' }（HttpStatus 200 视为成功，失败店管家会重试）。
 */
@Controller('dianjia')
export class DianjiaController {
  constructor(private readonly dianjiaService: DianjiaService) {}

  /** 发货回调（@Public，店管家服务器不带 JWT）。 */
  @Public()
  @Post('send-notify')
  async sendNotify(@Body() body: any) {
    return this.dianjiaService.handleSendNotify(body);
  }
}
