import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { wxAppConfig } from '../payment/payment.config';

/**
 * 登录服务：用 wx.login 的 code 换取 openid，签发 JWT。
 *
 * 注意：真实微信 openid 需调用微信 code2Session 接口。
 * 当前开发阶段用本地 code 直接生成 openid 占位，生产环境需接入微信 API。
 */
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(code: string) {
    const openid = await this.resolveOpenid(code);

    let user = await this.prisma.user.findUnique({ where: { openid } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { openid, nickname: '鲜到家用户' },
      });
    }

    const token = await this.jwtService.signAsync({ userId: user.id });

    return {
      token,
      userInfo: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
      },
    };
  }

  /**
   * 用 wx.login 的 code 换取真实 openid。
   * 配齐 WX_APPID + WX_SECRET 时调微信 code2Session；否则（开发期）用本地占位 openid，
   * 兼容无配置的本地开发（mock 支付模式不依赖真实 openid）。
   */
  private async resolveOpenid(code: string): Promise<string> {
    const { appid, secret } = wxAppConfig;
    if (appid && secret) {
      try {
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${encodeURIComponent(
          code || '',
        )}&grant_type=authorization_code`;
        const res = await fetch(url);
        const data = (await res.json()) as { openid?: string; errmsg?: string };
        if (data.openid) return data.openid;
        // code 失效或配置错误时落入 mock 兜底，避免登录整体失败
        console.warn('[auth] code2Session 未返回 openid:', data.errmsg);
      } catch (e) {
        console.warn('[auth] code2Session 调用失败，落入 mock openid:', e);
      }
    }
    return 'wx_' + (code || 'default');
  }
}
