import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

interface AdminPayload {
  supplierId: string;
  role?: string;
  name?: string;
}

/**
 * 供应商后台专用 JWT 鉴权 Guard。
 *
 * admin 登录后由 AdminService.login 签发 { supplierId, role, name } 的 JWT，
 * 本 Guard 解析并校验 token + Supplier 仍存在，挂到 req.user。
 *
 * 用法：admin.controller 类级 @Public 豁免全局 JwtAuthGuard，
 * 需鉴权的方法再单独加 @UseGuards(AdminAuthGuard)。
 *
 * 这样 supplierId 来自 token 而非 x-supplier-id 头，彻底消除 's1' 硬编码
 * fallback 导致生产外键违反（GoodSupplier.supplierId 不存在）的问题。
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('未提供后台认证令牌');
    }

    let payload: AdminPayload;
    try {
      payload = await this.jwtService.verifyAsync<AdminPayload>(token);
    } catch {
      throw new UnauthorizedException('后台令牌无效或已过期');
    }

    if (!payload.supplierId) {
      throw new UnauthorizedException('非后台令牌');
    }

    // 校验供应商仍存在（防删除后旧 token 导致写库外键 500）
    const sup = await this.prisma.supplier.findUnique({
      where: { id: payload.supplierId },
      select: { id: true, name: true },
    });
    if (!sup) {
      throw new UnauthorizedException('供应商不存在，请联系管理员');
    }

    (request as any).user = {
      supplierId: payload.supplierId,
      role: payload.role,
      name: payload.name || sup.name,
    };
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = (request.headers.authorization || '').split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
