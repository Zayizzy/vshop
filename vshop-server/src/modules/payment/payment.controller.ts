import { Controller, Post, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { Public } from '../../common/guards/public.decorator';
import { UnifiedOrderDto } from '../../common/dto';

interface AuthedRequest extends Request {
  user: { userId: string };
}

/**
 * 支付控制器。路由前缀 /v1/payment。
 * - unified-order：C 端 JWT 鉴权，前端 payment/result.js 调用。
 * - notify / refund-notify：@Public，微信服务器回调，无 JWT。
 */
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('unified-order')
  async unifiedOrder(@Req() req: AuthedRequest, @Body() body: UnifiedOrderDto) {
    const data = await this.paymentService.unifiedOrder(
      req.user.userId,
      body.orderId,
    );
    return { code: 0, message: 'success', data };
  }

  /** 微信支付回调（@Public，微信服务器不带 JWT）。
   *  返回 { code:'SUCCESS' } 告知微信已处理（非 app 的 {code:0}）。 */
  @Public()
  @Post('notify')
  async notify(@Body() body: any, @Req() _req: Request) {
    return this.paymentService.handleNotify(body);
  }

  /** 微信退款回调（可选）。 */
  @Public()
  @Post('refund-notify')
  async refundNotify(@Body() body: any) {
    return this.paymentService.handleRefundNotify(body);
  }
}
