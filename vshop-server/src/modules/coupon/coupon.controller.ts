import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { CouponService } from './coupon.service';

interface AuthedRequest extends Request {
  user: { userId: string };
}

@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Get('my')
  async getMyCoupons(@Req() req: AuthedRequest) {
    const data = await this.couponService.getMyCoupons(req.user.userId);
    return { code: 0, message: 'success', data };
  }

  @Get('count')
  async getCount(@Req() req: AuthedRequest) {
    const data = await this.couponService.getCount(req.user.userId);
    return { code: 0, message: 'success', data };
  }
}
