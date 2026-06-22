import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

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
    // TODO(生产): 调用 https://api.weixin.qq.com/sns/jscode2session 用 code 换 openid/session_key
    const openid = 'wx_' + (code || 'default');

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
}
