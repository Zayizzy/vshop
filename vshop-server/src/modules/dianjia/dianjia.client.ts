import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { dianjiaConfig } from './dianjia.config';

/**
 * 店管家开放平台客户端。
 *
 * 鉴权（见接口文档「3.3 API鉴权」+ App.java 样例）：
 *  - 参数名 PascalCase：AppKey / AccessToken / TimeStamp / Param
 *  - 按字母序排序，跳过空值（token/get 调用无 AccessToken 时签名不含它）
 *  - 拼接 appSecret + 各(key+value) + appSecret → MD5 大写 = Sign
 *  - Param 为应用参数的「原始 JSON 串」参与签名；放入 body 时由 JSON.stringify 转义
 *
 * token（见「3.5 刷新accessToken」）：auth/token/get 已弃用且仅可调一次，持续用 auth/token/refresh。
 *  - 内存缓存 accessToken/refreshToken/expireAt，进程重启从 env 初始 token 重新初始化
 *  - 临过期（≤5 分钟）或缺失自动刷新；响应 TokenExpiration/TokenErr 时刷新并重试一次
 *
 * mock 模式（DIANJIA_ENABLED!==true）：execute 短路返回模拟数据，开发期无需凭证。
 *
 * 金额单位：店管家一律「分」(Int)，与本项目一致。
 */
@Injectable()
export class DianjiaClient {
  /** mock 模式标志 */
  get mock(): boolean {
    return !dianjiaConfig.enabled;
  }

  /** 内存 token 缓存（进程级） */
  private tokenCache: {
    accessToken: string;
    refreshToken: string;
    expireAt: number | null; // 毫秒时间戳，null 表示未知
  } | null = null;

  /**
   * 生成签名：PascalCase 参数按字母序排序，跳过空值，
   * appSecret + (key+value)... + appSecret → MD5 大写。
   */
  private createSign(
    params: Record<string, string>,
    secret: string,
  ): string {
    return this.computeSign(params, secret);
  }

  /**
   * 计算签名（供回调验签复用）。参数名 PascalCase，按字母序排序，跳过空值，
   * appSecret + (key+value)... + appSecret → MD5 大写。
   */
  computeSign(params: Record<string, string>, secret: string): string {
    const sb = Buffer.from(secret, 'utf-8');
    const parts: Buffer[] = [sb];
    Object.keys(params)
      .sort()
      .forEach((key) => {
        const val = params[key];
        if (val != null && val !== '') {
          parts.push(Buffer.from(key + val, 'utf-8'));
        }
      });
    parts.push(Buffer.from(secret, 'utf-8'));
    const buf = Buffer.concat(parts);
    return crypto.createHash('md5').update(buf).digest('hex').toUpperCase();
  }

  /** 组装请求体对象（无 accessToken 时省略该字段）。 */
  private buildBody(
    params: { appKey: string; accessToken?: string; param: string | null },
  ): string {
    const ts = String(Date.now());
    const signParams: Record<string, string> = {
      AppKey: params.appKey,
      TimeStamp: ts,
      Param: params.param ?? '',
    };
    if (params.accessToken) signParams.AccessToken = params.accessToken;
    const sign = this.createSign(signParams, dianjiaConfig.appSecret);
    const bodyObj: Record<string, unknown> = {
      AppKey: params.appKey,
      TimeStamp: ts,
      Sign: sign,
      // Param 为 null → JSON null（服务端与 App.java 的 "null" 字符串等价地按无参处理）
      Param: params.param,
    };
    if (params.accessToken) bodyObj.AccessToken = params.accessToken;
    return JSON.stringify(bodyObj);
  }

  /** 读取响应字段，兼容大小写（code/Code、data/Data、message/Message）。 */
  private pick<T = any>(obj: any, ...keys: string[]): T | undefined {
    if (!obj) return undefined;
    for (const k of keys) {
      if (obj[k] !== undefined) return obj[k] as T;
    }
    return undefined;
  }

  /** 刷新 accessToken，更新内存缓存。 */
  private async refreshAccessToken(): Promise<void> {
    const refreshToken =
      this.tokenCache?.refreshToken || dianjiaConfig.refreshToken;
    if (!refreshToken) {
      throw new BadRequestException(
        '店管家 refreshToken 缺失，请在 .env 配置 DIANJIA_REFRESH_TOKEN（或初始 ACCESS_TOKEN 后由 refresh 获取）',
      );
    }
    const body = this.buildBody({
      appKey: dianjiaConfig.appKey,
      param: JSON.stringify({ RefreshToken: refreshToken }),
    });
    const res = await fetch(dianjiaConfig.baseUrl + 'auth/token/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const data: any = await res.json().catch(() => ({}));
    const code = this.pick<any>(data, 'code', 'Code');
    const respData = this.pick<any>(data, 'data', 'Data');
    if (code !== 0 || !respData) {
      throw new BadRequestException(
        `店管家 token 刷新失败: ${JSON.stringify(data)}`,
      );
    }
    const accessToken =
      this.pick<string>(respData, 'accessToken', 'AccessToken') || '';
    const newRefresh =
      this.pick<string>(respData, 'refreshToken', 'RefreshToken') || refreshToken;
    const expireTime = this.pick<string>(respData, 'expireTime', 'ExpireTime');
    this.tokenCache = {
      accessToken,
      refreshToken: newRefresh,
      // "2024-11-30 23:59" → 替换空格为 T 再解析；失败则 null（靠过期重试兜底）
      expireAt: expireTime ? this.parseExpire(expireTime) : null,
    };
  }

  /** 解析店管家 ExpireTime（形如 "2024-11-30 23:59"，非标准 ISO）。 */
  private parseExpire(s: string): number | null {
    const d = new Date(s.replace(' ', 'T'));
    const t = d.getTime();
    return Number.isFinite(t) ? t : null;
  }

  /** 确保内存中有有效 token：缓存空 / expireAt 未知 / 5 分钟内将过期 → 刷新。 */
  private async ensureToken(): Promise<string> {
    if (!this.tokenCache) {
      // 从 env 初始 token 初始化
      if (dianjiaConfig.accessToken || dianjiaConfig.refreshToken) {
        this.tokenCache = {
          accessToken: dianjiaConfig.accessToken,
          refreshToken: dianjiaConfig.refreshToken,
          expireAt: null,
        };
      } else {
        throw new BadRequestException(
          '店管家未配置 token，请在 .env 配置 DIANJIA_ACCESS_TOKEN / DIANJIA_REFRESH_TOKEN',
        );
      }
    }
    const now = Date.now();
    const soon = now + 5 * 60 * 1000;
    const stale =
      !this.tokenCache.accessToken ||
      this.tokenCache.expireAt == null ||
      this.tokenCache.expireAt <= soon;
    if (stale) {
      if (this.tokenCache.refreshToken) {
        await this.refreshAccessToken();
      } else if (!this.tokenCache.accessToken) {
        throw new BadRequestException('店管家 accessToken 与 refreshToken 均缺失');
      }
      // 有 accessToken 但 expireAt 未知且无 refreshToken：直接用现有 token，靠 TokenExpiration 重试兜底
    }
    return this.tokenCache.accessToken;
  }

  /** 各方法 mock 返回（开发期无需凭证）。 */
  private mockResponse(method: string, paramObj: any): any {
    switch (method) {
      case 'base/shop/list':
        return {
          shops: [{ Id: 0, ShopCode: 'mock', ShopName: 'mock店铺', CreateTime: null }],
        };
      case 'base/partner/list':
        return { total: 0, rows: [] };
      case 'base/agent/List':
        return { total: 0, rows: [] };
      default:
        return { mock: true, method, param: paramObj ?? null };
    }
  }

  /**
   * 执行 API 请求。
   * @param method 接口名，如 'base/shop/list'
   * @param paramObj 应用参数对象（无则 null）
   */
  async execute(method: string, paramObj?: any): Promise<any> {
    if (this.mock) return this.mockResponse(method, paramObj);

    const param = paramObj != null ? JSON.stringify(paramObj) : null;

    const doRequest = async (token: string): Promise<any> => {
      const body = this.buildBody({
        appKey: dianjiaConfig.appKey,
        accessToken: token || undefined,
        param,
      });
      const res = await fetch(dianjiaConfig.baseUrl + method, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const data: any = await res.json().catch(() => ({}));
      return data;
    };

    let token = await this.ensureToken();
    let data = await doRequest(token);
    // token 过期/异常 → 刷新一次重试
    const code = this.pick<any>(data, 'code', 'Code');
    if (code === 'TokenExpiration' || code === 'TokenErr') {
      await this.refreshAccessToken();
      token = this.tokenCache!.accessToken;
      data = await doRequest(token);
    }
    const finalCode = this.pick<any>(data, 'code', 'Code');
    if (finalCode !== 0) {
      throw new BadRequestException(
        `店管家 ${method} 调用失败: ${JSON.stringify(data)}`,
      );
    }
    return this.pick<any>(data, 'data', 'Data');
  }
}
