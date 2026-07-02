import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { centToYuan } from '../../common/utils/money';
import { formatSpecText } from '../../common/utils/spec';

/**
 * 购物车服务。
 * 金额单位约定：库内/计算「分」，输出 API 边界统一转「元」(centToYuan)。
 */
@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        sku: {
          include: {
            good: {
              include: {
                images: {
                  orderBy: { sort: 'asc' },
                  take: 1,
                },
                suppliers: {
                  include: {
                    supplier: true,
                    sku: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Group by supplier
    const supplierMap = new Map<
      string,
      {
        supplierId: string;
        supplierName: string;
        items: any[];
        totalPrice: number;
        freight: number;
      }
    >();

    for (const item of items) {
      const sku = item.sku;
      const good = sku.good;

      // Default: treat as single supplier
      const suppliers = good.suppliers.filter(
        (s) => s.skuId === sku.id && s.status === 'active',
      );
      const supplier = suppliers[0] || {
        supplierId: 'default',
        supplier: { id: 'default', name: '鲜到家自营' },
        price: sku.price,
        stock: sku.stock,
        freight: 0,
      };

      const key = supplier.supplierId;
      if (!supplierMap.has(key)) {
        supplierMap.set(key, {
          supplierId: supplier.supplier.id,
          supplierName: supplier.supplier.name,
          items: [],
          totalPrice: 0,
          freight: supplier.freight || 0,
        });
      }

      const entry = supplierMap.get(key)!;
      // 库内是分，计算用分
      const unitPriceCent = supplier.price || sku.price;
      entry.totalPrice += unitPriceCent * item.quantity;
      entry.items.push({
        id: item.id,
        goodId: good.id,
        skuId: sku.id,
        name: good.name,
        spec: formatSpecText(sku.specValues, sku.name),
        // 输出边界：分→元
        price: centToYuan(unitPriceCent),
        quantity: item.quantity,
        image: good.images[0]?.url || '',
        stock: supplier.stock || sku.stock,
      });
    }

    const supplierList = Array.from(supplierMap.values()).map((s) => ({
      supplierId: s.supplierId,
      supplierName: s.supplierName,
      items: s.items,
      // 输出边界：分→元
      totalPrice: centToYuan(s.totalPrice),
      freight: centToYuan(s.freight),
    }));
    // 注意：先在「分」上 reduce，最后一次性转元（避免逐项 round 累计误差）
    const totalAmountCent = Array.from(supplierMap.values()).reduce(
      (sum, s) => sum + s.totalPrice + s.freight,
      0,
    );

    return {
      suppliers: supplierList,
      totalAmount: centToYuan(totalAmountCent),
    };
  }

  async addItem(userId: string, skuId: string, quantity: number) {
    const existing = await this.prisma.cartItem.findFirst({
      where: { userId, skuId },
    });

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { userId, skuId, quantity },
      });
    }

    return await this.getCart(userId);
  }

  async updateQuantity(userId: string, skuId: string, quantity: number) {
    if (quantity <= 0) {
      await this.prisma.cartItem.deleteMany({
        where: { userId, skuId },
      });
    } else {
      const existing = await this.prisma.cartItem.findFirst({
        where: { userId, skuId },
      });
      if (existing) {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity },
        });
      }
    }

    return await this.getCart(userId);
  }

  async clearCart(userId: string) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
    return { suppliers: [], totalAmount: 0 };
  }

  async getCount(userId: string) {
    const count = await this.prisma.cartItem.count({ where: { userId } });
    return { count };
  }
}
