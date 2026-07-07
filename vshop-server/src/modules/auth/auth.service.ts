import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHmac, createDecipheriv } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { wxAppConfig } from '../payment/payment.config';
import { WechatLoginDto } from '../../common/dto';

interface WechatSession {
  openid: string;
  sessionKey?: string;
  unionId?: string;
}

/**
 * 登录服务：用 wx.login 的 code 换取 openid/session_key，
 * 校验微信用户信息签名，解密 unionId，写入/更新用户资料后签发 JWT。
 */
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: WechatLoginDto) {
    const session = await this.resolveSession(dto.code);

    if (session.sessionKey) {
      if (dto.rawData && dto.signature) {
        this.verifySignature(dto.rawData, dto.signature, session.sessionKey);
      }
      if (dto.encryptedData && dto.iv) {
        const decrypted = this.decryptData(
          dto.encryptedData,
          dto.iv,
          session.sessionKey,
        );
        if (decrypted?.unionId) {
          session.unionId = decrypted.unionId;
        }
      }
    }

    const profile = this.extractProfile(dto);
    const user = await this.prisma.user.upsert({
      where: { openid: session.openid },
      create: {
        openid: session.openid,
        unionId: session.unionId,
        nickname: profile.nickName || '鲜到家用户',
        avatar: profile.avatarUrl,
      },
      update: {
        unionId: session.unionId ?? undefined,
        nickname: profile.nickName ?? undefined,
        avatar: profile.avatarUrl ?? undefined,
      },
    });

    const token = await this.jwtService.signAsync({ userId: user.id });

    return {
      token,
      userInfo: this.toUserInfo(user),
    };
  }

  /**
   * 用 wx.login 的 code 换取真实 openid/session_key。
   * 配齐 WX_APPID + WX_SECRET 时调微信 code2Session；否则（开发期）用本地占位 openid，
   * 兼容无配置的本地开发（mock 支付模式不依赖真实 openid）。
   */
  private async resolveSession(code: string): Promise<WechatSession> {
    const { appid, secret } = wxAppConfig;
    if (appid && secret) {
      try {
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${encodeURIComponent(
          code || '',
        )}&grant_type=authorization_code`;
        const res = await fetch(url);
        const data = (await res.json()) as {
          openid?: string;
          session_key?: string;
          unionid?: string;
          errmsg?: string;
        };
        if (data.openid) {
          return {
            openid: data.openid,
            sessionKey: data.session_key,
            unionId: data.unionid,
          };
        }
        console.warn('[auth] code2Session 未返回 openid:', data.errmsg);
      } catch (e) {
        console.warn('[auth] code2Session 调用失败，落入 mock openid:', e);
      }
    }
    // 开发模式：没有微信配置时返回固定 mock openid，避免每次 wx.login 的 code 不同都创建新用户，
    // 否则退出重登后购物车/订单等用户级数据会丢失。
    return { openid: 'wx_mock_openid' };
  }

  /**
   * 校验微信用户信息签名。
   * wx.getUserProfile 返回的 signature = HMAC-SHA256(rawData, session_key)
   */
  private verifySignature(rawData: string, signature: string, sessionKey: string) {
    const expected = createHmac('sha256', sessionKey).update(rawData).digest('base64');
    if (expected !== signature) {
      throw new UnauthorizedException('微信用户信息签名校验失败');
    }
  }

  /**
   * 解密微信加密数据（encryptedData + iv + session_key）。
   * 用于获取 unionId 等敏感字段。
   */
  private decryptData(encryptedData: string, iv: string, sessionKey: string) {
    try {
      const key = Buffer.from(sessionKey, 'base64');
      const ivBuf = Buffer.from(iv, 'base64');
      const decipher = createDecipheriv('aes-128-cbc', key, ivBuf);
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      // 去除 PKCS#7 填充
      const pad = decrypted.charCodeAt(decrypted.length - 1);
      if (pad > 0 && pad <= 16) {
        decrypted = decrypted.slice(0, -pad);
      }
      return JSON.parse(decrypted);
    } catch (e) {
      console.warn('[auth] 解密 encryptedData 失败:', e);
      return null;
    }
  }

  private extractProfile(dto: WechatLoginDto) {
    if (dto.rawData) {
      try {
        const parsed = JSON.parse(dto.rawData);
        return {
          nickName: parsed.nickName || dto.nickName,
          avatarUrl: parsed.avatarUrl || dto.avatarUrl,
        };
      } catch (e) {
        // ignore
      }
    }
    return {
      nickName: dto.nickName,
      avatarUrl: dto.avatarUrl,
    };
  }

  private toUserInfo(user: {
    id: string;
    nickname: string | null;
    avatar: string | null;
    phone: string | null;
    isKoc: boolean;
  }) {
    return {
      id: user.id,
      nickName: user.nickname,
      avatarUrl: user.avatar,
      phone: user.phone,
      isKoc: user.isKoc,
    };
  }
}
