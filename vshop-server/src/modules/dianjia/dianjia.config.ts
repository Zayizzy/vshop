/**
 * 店管家分销代发开放平台配置：从环境变量读取，集中导出供 DianjiaClient / AdminService 注入。
 *
 * 开发期默认 DIANJIA_ENABLED 为 false（mock 模式），无需 AppKey/Secret 即可跑通连通验证。
 * 真实模式需向店管家客户经理申请 AppKey/AppSecret，并配置初始 token（首次用 auth/token/get 获取一次，
 * 之后由 client 自动 refresh）。
 *
 * 配套环境变量（写到 .env，参照 payment.config.ts 的 WX_PAY_* 读取方式）：
 *   DIANJIA_ENABLED=false        # 总开关：false=mock，true=真实对接
 *   DIANJIA_APP_KEY=             # 应用 key
 *   DIANJIA_APP_SECRET=          # 应用密钥（签名首尾夹入）
 *   DIANJIA_BASE_URL=            # 默认 https://open.dgjapp.com/api/
 *   DIANJIA_SHOP_ID=             # 授权店铺编码（token/get 用，一次性）
 *   DIANJIA_ACCESS_TOKEN=        # 初始 accessToken（进程重启后由此初始化内存缓存）
 *   DIANJIA_REFRESH_TOKEN=       # 初始 refreshToken，后续自动刷新覆盖内存缓存
 *
 * 金额约定：店管家所有金额字段为「分」(Int)，与本项目一致，零转换成本。
 */

export interface DianjiaConfig {
  /** 总开关：false=mock，true=真实对接 */
  enabled: boolean;
  appKey: string;
  appSecret: string;
  baseUrl: string;
  shopId: string;
  accessToken: string;
  refreshToken: string;
  /** 发货回调公网地址（提交给店管家技术人员配置推送） */
  notifyUrl: string;
}

export const dianjiaConfig: DianjiaConfig = {
  enabled: process.env.DIANJIA_ENABLED === 'true',
  appKey: process.env.DIANJIA_APP_KEY || '',
  appSecret: process.env.DIANJIA_APP_SECRET || '',
  baseUrl: (process.env.DIANJIA_BASE_URL || 'https://open.dgjapp.com/api/').replace(/\/+$/, '') + '/',
  shopId: process.env.DIANJIA_SHOP_ID || '',
  accessToken: process.env.DIANJIA_ACCESS_TOKEN || '',
  refreshToken: process.env.DIANJIA_REFRESH_TOKEN || '',
  notifyUrl: process.env.DIANJIA_NOTIFY_URL || '',
};
