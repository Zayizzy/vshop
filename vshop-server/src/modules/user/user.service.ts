import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getAddresses(userId: string) {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return addresses.map((a) => ({
      id: a.id,
      name: a.name,
      phone: a.phone,
      region: `${a.province} ${a.city} ${a.district}`,
      detail: a.detail,
      isDefault: a.isDefault,
      fullAddress: `${a.province}${a.city}${a.district}${a.detail}`,
    }));
  }

  async createAddress(
    userId: string,
    body: {
      name: string;
      phone: string;
      province: string;
      city: string;
      district: string;
      detail: string;
      isDefault?: boolean;
    },
  ) {
    if (body.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.create({
      data: {
        userId,
        name: body.name,
        phone: body.phone,
        province: body.province,
        city: body.city,
        district: body.district,
        detail: body.detail,
        isDefault: body.isDefault || false,
      },
    });

    return {
      id: address.id,
      name: address.name,
      phone: address.phone,
      region: `${address.province} ${address.city} ${address.district}`,
      detail: address.detail,
      isDefault: address.isDefault,
      fullAddress: `${address.province}${address.city}${address.district}${address.detail}`,
    };
  }

  async updateAddress(
    userId: string,
    id: string,
    body: {
      name?: string;
      phone?: string;
      province?: string;
      city?: string;
      district?: string;
      detail?: string;
      isDefault?: boolean;
    },
  ) {
    // 越权防护：先校验地址归属
    const existing = await this.prisma.address.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!existing) throw new NotFoundException('地址不存在');
    if (existing.userId !== userId) throw new ForbiddenException('无权操作该地址');

    if (body.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.update({
      where: { id },
      data: { ...body },
    });

    return {
      id: address.id,
      name: address.name,
      phone: address.phone,
      region: `${address.province} ${address.city} ${address.district}`,
      detail: address.detail,
      isDefault: address.isDefault,
      fullAddress: `${address.province}${address.city}${address.district}${address.detail}`,
    };
  }

  async deleteAddress(userId: string, id: string) {
    // 越权防护：先校验地址归属
    const existing = await this.prisma.address.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!existing) throw new NotFoundException('地址不存在');
    if (existing.userId !== userId) throw new ForbiddenException('无权操作该地址');

    await this.prisma.address.delete({ where: { id } });
    return { deleted: true };
  }
}
