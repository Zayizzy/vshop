import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WechatPayClient } from './wechatpay.client';
import { DianjiaService } from '../dianjia/dianjia.service';

/**
 * 支付服务：统一下单 + 支付回调（notify）+ 退款回调。
 *
 * 订单创建时（OrderService.createOrder）已建 Payment(status=pending) 记录，
 * 本服务在支付成功时更新 Payment(paid/transactionId) + Order pending→shipping。
 *
 * 幂等：微信会重试 notify，已 paid 的订单直接回 SUCCESS，不重复处理。
 *
 * 回调验签：开发期用 apiV3Key 解密成功作为弱验证（生产建议再用平台证书验 Wechatpay-Signature）。
 */
@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private wxPay: WechatPayClient,
    private dianjiaService: DianjiaService,
  ) {}

  /** 统一下单 → 前端 wx.requestPayment 参数 */
  async unifiedOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { openid: true } } },
    });
    if (!order) throw new BadRequestException('订单不存在');
    if (order.userId !== userId) throw new ForbiddenException('无权操作该订单');
    if (order.status !== 'pending') {
      throw new BadRequestException('订单当前状态不可支付');
    }

    const openid = order.user?.openid || '';
    // 真实模式下 openid 必须为真实值（mock 模式无所谓）
    if (!this.wxPay.mock && !openid) {
      throw new BadRequestException('用户 openid 缺失，无法发起支付');
    }

    const prepayId = await this.wxPay.unifiedOrder({
      outTradeNo: order.orderSn,
      amount: order.payAmount, // 分
      openid,
      description: `鲜到家订单 ${order.orderSn}`,
    });

    const paymentParams = this.wxPay.signPaymentParams(prepayId);

    // 记录 prepayId + 渠道
    await this.prisma.payment.updateMany({
      where: { orderId },
      data: { prepayId, provider: this.wxPay.mock ? 'mock' : 'wechatpay' },
    });

    // mock 模式：直接置已支付，前端跳过 wx.requestPayment
    if (this.wxPay.mock) {
      await this.markPaid(orderId, 'mock_transaction');
    }

    // paymentParams 为前端契约字段；mock 标志让前端跳过真实拉起
    return { paymentParams, mock: this.wxPay.mock };
  }

  /** 标记订单已支付（notify 或 mock 调用），幂等 */
  async markPaid(orderId: string, transactionId: string) {
    // 用 updateMany + 状态条件实现幂等，避免并发时重复处理
    const [paymentUpdated, orderUpdated] = await this.prisma.$transaction([
      this.prisma.payment.updateMany({
        where: { orderId, status: 'pending' },
        data: {
          status: 'paid',
          payTime: new Date(),
          transactionId,
          provider: this.wxPay.mock ? 'mock' : 'wechatpay',
        },
      }),
      // 待发货（pending→shipping）
      this.prisma.order.updateMany({
        where: { id: orderId, status: 'pending' },
        data: { status: 'shipping' },
      }),
    ]);

    // 未更新到任何行，说明已处理过或状态异常
    if (paymentUpdated.count === 0) {
      return;
    }

    // 异步上传店管家代发：fire-and-forget，不阻断支付主链路；失败仅记日志。
    // 受自动同步开关控制（AppSetting.dianjia_auto_sync，默认开）；幂等由 uploadOrder 内部保证。
    this.dianjiaService
      .getAutoSync()
      .then((on) =>
        on
          ? this.dianjiaService
              .uploadOrder(orderId)
              .catch((e) => console.error('[dianjia] uploadOrder failed', orderId, e))
          : null,
      )
      .catch(() => null);
  }

  /** 微信支付回调。返回 { code:'SUCCESS'|'FAIL' }（微信要求格式，非 app 的 {code:0}） */
  async handleNotify(body: any) {
    try {
      const resource = body?.resource;
      if (!resource) return { code: 'FAIL', message: '无 resource' };
      const decoded = this.wxPay.decodeNotify(resource);
      const orderSn = decoded.out_trade_no;
      const transactionId = decoded.transaction_id;
      // 非终态成功也回 SUCCESS（避免微信反复重试），业务不改动
      if (decoded.trade_state !== 'SUCCESS') {
        return { code: 'SUCCESS', message: '成功' };
      }
      const order = await this.prisma.order.findUnique({ where: { orderSn } });
      if (!order) return { code: 'SUCCESS', message: '成功' };
      await this.markPaid(order.id, transactionId);
      return { code: 'SUCCESS', message: '成功' };
    } catch (e) {
      console.error('[payment] notify 处理失败:', e);
      return { code: 'FAIL', message: '处理失败' };
    }
  }

  /** 微信退款回调（可选）：PROCESSING→SUCCESS 时售后置 4 已退款 */
  async handleRefundNotify(body: any) {
    try {
      const resource = body?.resource;
      if (!resource) return { code: 'FAIL', message: '无 resource' };
      const decoded = this.wxPay.decodeNotify(resource);
      const refundStatus = decoded.refund_status;
      const a = await this.prisma.aftersale.findFirst({
        where: { refundNo: decoded.out_refund_no },
      });
      if (a) {
        if (refundStatus === 'SUCCESS' && a.status === 3) {
          await this.prisma.aftersale.update({
            where: { id: a.id },
            data: {
              status: 4,
              refundId: decoded.refund_id || a.refundId,
              refundStatus: 'SUCCESS',
            },
          });
        } else if (refundStatus === 'CLOSED' || refundStatus === 'ABNORMAL') {
          await this.prisma.aftersale.update({
            where: { id: a.id },
            data: {
              refundId: decoded.refund_id || a.refundId,
              refundStatus,
            },
          });
        }
      }
      return { code: 'SUCCESS', message: '成功' };
    } catch (e) {
      console.error('[payment] refund-notify 处理失败:', e);
      return { code: 'FAIL', message: '处理失败' };
    }
  }
}
