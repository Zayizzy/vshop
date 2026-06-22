import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { centToYuan } from '../../common/utils/money';

/**
 * KOC（推手）服务。金额库内为「分」(Int)，输出 API 时转「元」。
 *
 * KOC 身份闭环：小程序提交申请(KocProfile.status=pending) → 后台审核
 * (approved 时 user.isKoc=true) → 小程序可见工作台。后台可随时关闭
 * (user.isKoc=false) 或调整佣金率。
 */
@Injectable()
export class KocService {
  constructor(private prisma: PrismaService) {}

  /** 默认佣金阶梯：按累计成单数 */
  private defaultCommissionRate(orderCount: number): number {
    return orderCount > 50 ? 0.1 : orderCount > 20 ? 0.07 : 0.05;
  }

  private defaultLevel(orderCount: number): string {
    return orderCount > 50 ? '金牌推手' : orderCount > 20 ? '银牌推手' : '铜牌推手';
  }

  /** 提交/重新提交分销员申请 */
  async register(
    userId: string,
    body: { realName: string; phone: string; socialAccount?: string; introduction?: string },
  ) {
    if (!body.realName?.trim()) throw new BadRequestException('请输入真实姓名');
    if (!body.phone || !/^1[3-9]\d{9}$/.test(body.phone)) {
      throw new BadRequestException('手机号格式不正确');
    }

    const data = {
      realName: body.realName.trim(),
      phone: body.phone.trim(),
      socialAccount: body.socialAccount?.trim() || null,
      introduction: body.introduction?.trim() || null,
      status: 'pending',
      rejectReason: null,
      reviewedAt: null,
    };

    // upsert：已存在则重新提交（置 pending），不存在则新建
    const profile = await this.prisma.kocProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    // 重新申请时若曾通过，需撤销 isKoc 身份
    await this.prisma.user.update({
      where: { id: userId },
      data: { isKoc: false, kocApprovedAt: null },
    });

    return { id: profile.id, status: profile.status };
  }

  /**
   * 推手状态：返回前端两套消费者都能用的结构。
   * status: -1=未申请, 0=审核中, 1=已通过(或被停用), 2=已驳回
   * isKoc:  true 仅当已通过且未被后台关闭
   */
  async getStatus(userId: string) {
    const profile = await this.prisma.kocProfile.findUnique({
      where: { userId },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isKoc: true },
    });

    if (!profile) {
      return { isKoc: false, status: -1, level: '', commissionRate: 0 };
    }

    const orderCount = await this.prisma.order.count({ where: { kocId: userId } });
    const commissionRate =
      profile.commissionRate != null
        ? profile.commissionRate
        : this.defaultCommissionRate(orderCount);
    const level = this.defaultLevel(orderCount);

    if (profile.status === 'pending') {
      return { isKoc: false, status: 0, level: '', commissionRate: 0 };
    }
    if (profile.status === 'rejected') {
      return { isKoc: false, status: 2, reason: profile.rejectReason || '', level: '', commissionRate: 0 };
    }
    // approved 或 disabled
    if (profile.status === 'approved' && user?.isKoc) {
      return { isKoc: true, status: 1, level, commissionRate, orderCount };
    }
    // approved 但被后台关闭（isKoc=false），或 status=disabled
    return { isKoc: false, status: 1, level: '', commissionRate: 0, disabled: true };
  }

  async getDashboard(userId: string) {
    const profile = await this.prisma.kocProfile.findUnique({
      where: { userId },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isKoc: true },
    });
    // 未开通或被停用：返回空看板
    if (!profile || profile.status !== 'approved' || !user?.isKoc) {
      return {
        monthly: { orderCount: 0, amount: '0.00', commission: '0.00' },
        total: { orderCount: 0, amount: '0.00', commission: '0.00' },
        reportCount: 0,
        rank: '',
        balance: '0.00',
        pendingAmount: '0.00',
      };
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthlyOrders, totalOrders, totalReports] = await Promise.all([
      this.prisma.order.findMany({
        where: { kocId: userId, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.order.findMany({ where: { kocId: userId } }),
      this.prisma.channelReport.count({ where: { kocId: userId } }),
    ]);

    const totalOrderCount = totalOrders.length;
    const rate =
      profile.commissionRate != null
        ? profile.commissionRate
        : this.defaultCommissionRate(totalOrderCount);

    const monthlyAmountCent = monthlyOrders.reduce((sum, o) => sum + o.payAmount, 0);
    const totalAmountCent = totalOrders.reduce((sum, o) => sum + o.payAmount, 0);
    const monthlyCommissionCent = Math.round(monthlyAmountCent * rate);
    const totalCommissionCent = Math.round(totalAmountCent * rate);

    return {
      monthly: {
        orderCount: monthlyOrders.length,
        amount: centToYuan(monthlyAmountCent),
        commission: centToYuan(monthlyCommissionCent),
      },
      total: {
        orderCount: totalOrderCount,
        amount: centToYuan(totalAmountCent),
        commission: centToYuan(totalCommissionCent),
      },
      reportCount: totalReports,
      rank: totalOrderCount > 50 ? '金牌' : totalOrderCount > 20 ? '银牌' : '铜牌',
      balance: centToYuan(totalCommissionCent),
      pendingAmount: '0.00',
    };
  }
}
