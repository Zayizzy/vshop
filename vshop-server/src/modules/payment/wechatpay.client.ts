import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { wechatPayConfig } from './payment.config';

/**
 * 微信支付 V3 客户端（JSAPI 支付）。
 *
 * 全手撸，不依赖第三方 SDK（避免版本/API 漂移、免安装）。用 node crypto 完成：
 *  - V3 请求头 Authorization 签名（RSA-SHA256）
 *  - 前端 wx.requestPayment 参数签名
 *  - 回调 resource 解密（AES-256-GCM）
 * 统一下单、退款走全局 fetch 调微信 V3 接口。
 *
 * - mock 模式（WX_PAY_ENABLED!==true）：所有方法短路返回模拟值，开发期跑通下单→支付 UI。
 * - 真实模式：需配齐商户号/私钥/证书序列号/APIv3 密钥/notify_url。
 *
 * 真实模式未经端到端实测（开发用 mock）；配置商户号后需联调验证。
 * V3 签名规范见：https://wechatpay-api.gitbook.io/wechatpay-api-v3/
 */

const API_BASE = 'https://api.mch.weixin.qq.com';

export interface PaymentParams {
  timeStamp: string;
  nonceStr: string;
  package: string; // 'prepay_id=xxx'
  signType: 'RSA';
  paySign: string;
}

@Injectable()
export class WechatPayClient {
  /** mock 模式标志 */
  get mock(): boolean {
    return !wechatPayConfig.enabled;
  }

  /** 用商户私钥做 RSA-SHA256 签名（V3 标准填充） */
  private rsaSign(message: string): string {
    return crypto
      .sign('sha256', Buffer.from(message), {
        key: wechatPayConfig.privateKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      })
      .toString('base64');
  }

  /** 构造 V3 请求头（含 Authorization 签名） */
  private authHeaders(method: string, urlpath: string, body: string): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const message = `${method}\n${urlpath}\n${timestamp}\n${nonce}\n${body}\n`;
    const signature = this.rsaSign(message);
    const auth = `WECHATPAY2-SHA256-RSA2048 mchid="${wechatPayConfig.mchid}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${wechatPayConfig.certSerial}",signature="${signature}"`;
    return {
      Authorization: auth,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /** 统一下单 → prepay_id */
  async unifiedOrder(args: {
    outTradeNo: string;
    amount: number; // 分
    openid: string;
    description: string;
  }): Promise<string> {
    if (this.mock) return 'mock_prepay_' + args.outTradeNo;
    const urlpath = '/v3/pay/transactions/jsapi';
    const bodyObj = {
      appid: wechatPayConfig.appid,
      mchid: wechatPayConfig.mchid,
      description: args.description,
      out_trade_no: args.outTradeNo,
      notify_url: wechatPayConfig.notifyUrl,
      amount: { total: args.amount, currency: 'CNY' },
      payer: { openid: args.openid },
    };
    const body = JSON.stringify(bodyObj);
    const res = await fetch(`${API_BASE}${urlpath}`, {
      method: 'POST',
      headers: this.authHeaders('POST', urlpath, body),
      body,
    });
    const data: any = await res.json();
    if (!res.ok || !data.prepay_id) {
      throw new BadRequestException(`微信统一下单失败: ${JSON.stringify(data)}`);
    }
    return data.prepay_id as string;
  }

  /** 用 prepay_id 生成前端 wx.requestPayment 参数 */
  signPaymentParams(prepayId: string): PaymentParams {
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const pkg = `prepay_id=${prepayId}`;
    if (this.mock) {
      return { timeStamp, nonceStr, package: pkg, signType: 'RSA', paySign: 'mock-sign' };
    }
    // JSAPI 调起支付签名串：appid\ntimeStamp\nnonceStr\npackage\n
    const message = `${wechatPayConfig.appid}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
    const paySign = this.rsaSign(message);
    return { timeStamp, nonceStr, package: pkg, signType: 'RSA', paySign };
  }

  /** 解密支付/退款回调 resource（AES-256-GCM）→ 明文 JSON */
  decodeNotify(resource: {
    ciphertext: string;
    nonce: string;
    associated_data?: string;
  }): any {
    if (this.mock) {
      return { out_trade_no: '', transaction_id: 'mock_tx', trade_state: 'SUCCESS', refund_status: 'SUCCESS' };
    }
    const key = Buffer.from(wechatPayConfig.apiV3Key, 'utf-8');
    const cipherBuf = Buffer.from(resource.ciphertext, 'base64');
    const authTag = cipherBuf.subarray(cipherBuf.length - 16);
    const encrypted = cipherBuf.subarray(0, cipherBuf.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(resource.nonce));
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(resource.associated_data || ''));
    const decoded = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decoded.toString('utf-8'));
  }

  /** 退款 → { refundId, status }。status: SUCCESS/CLOSED/PROCESSING/ABNORMAL */
  async refund(args: {
    outTradeNo: string;
    outRefundNo: string;
    refund: number; // 分
    total: number; // 分
    reason?: string;
  }): Promise<{ refundId: string; status: string }> {
    if (this.mock) {
      return { refundId: 'mock_refund_' + args.outRefundNo, status: 'SUCCESS' };
    }
    const urlpath = '/v3/refund/domestic/refunds';
    const bodyObj = {
      out_trade_no: args.outTradeNo,
      out_refund_no: args.outRefundNo,
      reason: args.reason,
      amount: { refund: args.refund, total: args.total, currency: 'CNY' },
      notify_url: wechatPayConfig.refundNotifyUrl,
    };
    const body = JSON.stringify(bodyObj);
    const res = await fetch(`${API_BASE}${urlpath}`, {
      method: 'POST',
      headers: this.authHeaders('POST', urlpath, body),
      body,
    });
    const data: any = await res.json();
    if (!res.ok) {
      throw new BadRequestException(`微信退款失败: ${JSON.stringify(data)}`);
    }
    return { refundId: data.refund_id, status: (data.status as string) || 'PROCESSING' };
  }
}
