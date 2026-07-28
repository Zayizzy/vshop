import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { PaymentModule } from '../payment/payment.module';
import { DianjiaModule } from '../dianjia/dianjia.module';

@Module({
  imports: [PaymentModule, DianjiaModule], // PaymentModule 复用 WechatPayClient（退款）；DianjiaModule 复用 DianjiaClient（店铺/厂家查询）
  controllers: [AdminController],
  providers: [AdminService, AdminAuthGuard],
})
export class AdminModule {}
