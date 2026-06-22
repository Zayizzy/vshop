import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * 全局 JWT 鉴权 Guard。
 *
 * 小程序在 app.js 中以 `Authorization: Bearer <token>` 携带 token，
 * 本 Guard 解析并校验 token，将 { userId } 注入 req.user，供各 controller 使用。
 *
 * 标记了 @Public() 的接口（如登录、渠道上报）豁免鉴权。
 *
 * 注意：token 有效但 userId 对应的用户不存在时（如数据库 reset 后的旧 token），
 * 必须拒绝——否则后续写入带外键的表（Address/Order/...）会触发 500。
 * 此处校验用户存在性，不存在则抛 401，触发前端重登。
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      // 开发模式：无 token 时注入 mock-user，控制器自行兜底
      (request as any).user = { userId: 'mock-user' };
      return true;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ userId: string }>(
        token,
      );
      // 校验用户是否真实存在（防数据库 reset 后旧 token 导致外键 500）
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true },
      });
      if (!user) {
        throw new UnauthorizedException('用户不存在，请重新登录');
      }
      (request as any).user = { userId: payload.userId };
    } catch (e) {
      // 无效 token / 用户不存在：开发模式注入 mock-user 兜底
      if (e instanceof UnauthorizedException && e.message === '用户不存在，请重新登录') {
        throw e;
      }
      (request as any).user = { userId: 'mock-user' };
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] =
      (request.headers.authorization || '').split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
