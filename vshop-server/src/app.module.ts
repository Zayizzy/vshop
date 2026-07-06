import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { GoodsModule } from './modules/goods/goods.module';
import { CartModule } from './modules/cart/cart.module';
import { OrderModule } from './modules/order/order.module';
import { UserModule } from './modules/user/user.module';
import { HomeModule } from './modules/home/home.module';
import { CouponModule } from './modules/coupon/coupon.module';
import { ChannelModule } from './modules/channel/channel.module';
import { KocModule } from './modules/koc/koc.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadModule } from './modules/upload/upload.module';
import { SupportModule } from './modules/support/support.module';
import { AftersaleModule } from './modules/aftersale/aftersale.module';
import { PaymentModule } from './modules/payment/payment.module';
import { DianjiaModule } from './modules/dianjia/dianjia.module';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 1000, // 默认缓存 60 秒
      max: 100,       // 最多 100 条
    }),
    PrismaModule,
    AuthModule, GoodsModule, CartModule, OrderModule, UserModule,
    HomeModule, CouponModule, ChannelModule, KocModule,
    AdminModule,
    UploadModule,
    SupportModule,
    AftersaleModule,
    PaymentModule,
    DianjiaModule,
  ],
})
export class AppModule {}
