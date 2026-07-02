/**
 * 微信支付配置：从环境变量读取，集中导出供 WechatPayClient / PaymentService / AuthService 注入。
 *
 * 开发期默认 WX_PAY_ENABLED 为 false（mock 模式），无需商户号即可跑通下单→支付 UI。
 * 真实模式需配齐：商户号 + APIv3 密钥 + 商户私钥/证书序列号 + 公网 HTTPS 的 notify_url。
 *
 * 配套环境变量（写到 .env，参照 auth.module.ts 的 JWT_SECRET 读取方式）：
 *   WX_PAY_ENABLED=false       # 总开关：false=mock，true=真实支付
 *   WX_PAY_APPID=              # 小程序 appid
 *   WX_PAY_MCHID=              # 商户号
 *   WX_PAY_PRIVATE_KEY=        # 商户 API 私钥 PEM
 *   WX_PAY_CERT_SERIAL=        # 商户证书序列号
 *   WX_PAY_API_V3_KEY=         # APIv3 密钥（回调解密）
 *   WX_PAY_NOTIFY_URL=         # https://公网域名/v1/payment/notify
 *   WX_APPID=                  # code2Session 用（拿真实 openid）
 *   WX_SECRET=                 # code2Session 用
 */

export interface WechatPayConfig {
  /** 总开关：false=mock，true=真实支付 */
  enabled: boolean;
  appid: string;
  mchid: string;
  certSerial: string;
  privateKey: string;
  apiV3Key: string;
  notifyUrl: string;
  refundNotifyUrl: string;
}

export const wechatPayConfig: WechatPayConfig = {
  enabled: process.env.WX_PAY_ENABLED === 'true',
  appid: process.env.WX_PAY_APPID || '',
  mchid: process.env.WX_PAY_MCHID || '',
  certSerial: process.env.WX_PAY_CERT_SERIAL || '',
  privateKey: process.env.WX_PAY_PRIVATE_KEY || '',
  apiV3Key: process.env.WX_PAY_API_V3_KEY || '',
  notifyUrl: process.env.WX_PAY_NOTIFY_URL || '',
  // 退款回调：复用支付回调域名，仅替换路径
  refundNotifyUrl: (process.env.WX_PAY_NOTIFY_URL || '').replace(
    '/payment/notify',
    '/payment/refund-notify',
  ),
};

/** code2Session 配置（拿真实 openid，见 auth.service.ts） */
export const wxAppConfig = {
  appid: process.env.WX_APPID || process.env.WX_PAY_APPID || '',
  secret: process.env.WX_SECRET || '',
};
