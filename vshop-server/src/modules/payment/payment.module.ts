import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { WechatPayClient } from './wechatpay.client';
import { DianjiaModule } from '../dianjia/dianjia.module';

@Module({
  imports: [DianjiaModule], // 复用 DianjiaService（订单支付成功后上传代发）
  controllers: [PaymentController],
  providers: [PaymentService, WechatPayClient],
  // 导出 WechatPayClient 供 AdminService（退款）复用
  exports: [WechatPayClient],
})
export class PaymentModule {}
