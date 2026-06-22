import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { centToYuan, centToYuanNullable } from '../../common/utils/money';

@Injectable()
export class CouponService {
  constructor(private prisma: PrismaService) {}

  async getMyCoupons(userId: string) {
    const userCoupons = await this.prisma.userCoupon.findMany({
      where: { userId, status: 'usable' },
      include: { coupon: true },
      orderBy: { createdAt: 'desc' },
    });

    return userCoupons.map((uc) => ({
      id: uc.id,
      name: uc.coupon.name,
      type: uc.coupon.type,
      // 输出边界：分→元（discountValue 为折扣率，原样返回）
      value: centToYuanNullable(uc.coupon.value),
      discountValue: uc.coupon.discountValue,
      minAmount: centToYuan(uc.coupon.minAmount),
      scopeType: uc.coupon.scopeType,
      expireTime: uc.coupon.expireTime,
      status: uc.status,
    }));
  }

  async getCount(userId: string) {
    const count = await this.prisma.userCoupon.count({
      where: { userId, status: 'usable' },
    });
    return { count };
  }
}
