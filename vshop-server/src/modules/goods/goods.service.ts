import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { centToYuan, centToYuanNullable } from '../../common/utils/money';
import {
  formatSpecText,
  parseSpecValues,
  aggregateSpecs,
} from '../../common/utils/spec';

/**
 * 商品服务。
 * 金额单位约定：库内「分」(Int)，输出 API 边界统一转「元」(centToYuan)。
 *
 * 商品级折扣：Good.discountRate（0~1，null 无折扣）。
 *   折前价 originalPrice = SKU 价；折后价 price = originalPrice × discountRate。
 *   price 为对外主价（列表/详情/下单均用），originalPrice 供划线展示。
 */
@Injectable()
export class GoodsService {
  constructor(private prisma: PrismaService) {}

  async getList(params: {
    page: number;
    pageSize: number;
    categoryId?: string;
    sort?: string;
  }) {
    const { page, pageSize, categoryId, sort } = params;

    const where: any = { status: 'active' };
    if (categoryId) {
      where.subCategory = { categoryId };
    }
    // sort=recommend：只返回今日推荐商品
    if (sort === 'recommend') {
      where.isRecommended = true;
    }

    const orderBy: any = this.getOrderBy(sort);

    const [list, total] = await Promise.all([
      this.prisma.good.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          skus: {
            orderBy: { price: 'asc' },
            take: 1,
          },
          images: {
            orderBy: { sort: 'asc' },
            take: 1,
          },
          suppliers: {
            include: {
              sku: true,
              supplier: true,
            },
          },
        },
      }),
      this.prisma.good.count({ where }),
    ]);

    const formattedList = list.map((g) => {
      const priceCent = g.skus[0]?.price ?? 0;
      const marketPriceCent = g.skus[0]?.marketPrice ?? null;
      // 折后价：有折扣率时按折扣计算（分），否则原价
      const paidCent = g.discountRate != null
        ? Math.round(priceCent * g.discountRate)
        : priceCent;
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        sales: g.sales,
        sold: g.sales,
        // 折前价（原价）
        originalPrice: centToYuan(priceCent),
        // 折后价（对外主价）
        price: centToYuan(paidCent),
        discountRate: g.discountRate ?? null,
        marketPrice: centToYuanNullable(marketPriceCent),
        image: g.images[0]?.url ?? '',
        coverImage: g.images[0]?.url ?? '',
        skuId: g.skus[0]?.id ?? '',
        stock: g.suppliers.reduce((sum, s) => sum + s.stock, 0) || (g.skus[0]?.stock ?? 0),
        tag: g.sales > 1000 ? '爆款' : g.sales > 500 ? '热销' : '',
        specName: formatSpecText(g.skus[0]?.specValues, g.skus[0]?.name),
        supplier: g.suppliers[0]?.supplier?.name ?? '',
        supplierName: g.suppliers[0]?.supplier?.name ?? '',
        // 供分类页按子分类分组使用
        subCategoryId: g.subCategoryId ?? '',
      };
    });

    return {
      list: formattedList,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      // 统一分页契约：前端直接读 hasMore 判断是否还有下一页
      hasMore: page < Math.ceil(total / pageSize),
    };
  }

  async search(params: {
    keyword: string;
    page: number;
    pageSize: number;
  }) {
    const { keyword, page, pageSize } = params;

    const where: any = {
      status: 'active',
      OR: [
        { name: { contains: keyword } },
        { description: { contains: keyword } },
      ],
    };

    const [list, total] = await Promise.all([
      this.prisma.good.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          skus: {
            orderBy: { price: 'asc' },
            take: 1,
          },
          images: {
            orderBy: { sort: 'asc' },
            take: 1,
          },
        },
      }),
      this.prisma.good.count({ where }),
    ]);

    const formattedList = list.map((g) => {
      const priceCent = g.skus[0]?.price ?? 0;
      const marketPriceCent = g.skus[0]?.marketPrice ?? null;
      const paidCent = g.discountRate != null
        ? Math.round(priceCent * g.discountRate)
        : priceCent;
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        sales: g.sales,
        sold: g.sales,
        originalPrice: centToYuan(priceCent),
        price: centToYuan(paidCent),
        discountRate: g.discountRate ?? null,
        marketPrice: centToYuanNullable(marketPriceCent),
        image: g.images[0]?.url ?? '',
        coverImage: g.images[0]?.url ?? '',
        skuId: g.skus[0]?.id ?? '',
        title: g.name,
        specName: formatSpecText(g.skus[0]?.specValues, g.skus[0]?.name),
        supplierName: '',
      };
    });

    return {
      list: formattedList,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page < Math.ceil(total / pageSize),
    };
  }

  async getDetail(id: string) {
    const good = await this.prisma.good.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sort: 'asc' } },
        detailImages: { orderBy: { sort: 'asc' } },
        skus: { orderBy: { price: 'asc' } },
        suppliers: {
          include: {
            sku: true,
            supplier: true,
          },
        },
      },
    });

    if (!good) {
      return null;
    }

    const firstSku = good.skus[0];
    const firstSupplier = good.suppliers[0];
    const basePriceCent = firstSku?.price ?? 0;
    const paidPriceCent = good.discountRate != null
      ? Math.round(basePriceCent * good.discountRate)
      : basePriceCent;

    return {
      id: good.id,
      name: good.name,
      description: good.description,
      detail: good.detail || '',
      sales: good.sales,
      // 折前价 / 折后价 / 折扣率
      originalPrice: centToYuan(basePriceCent),
      price: centToYuan(paidPriceCent),
      discountRate: good.discountRate ?? null,
      marketPrice: centToYuanNullable(firstSku?.marketPrice ?? null),
      // 折扣 = 现价/市价 * 10（无市价时为 null）；分单位等比相除不影响结果
      discount: firstSku?.marketPrice
        ? Math.round((firstSku.price / firstSku.marketPrice) * 10)
        : null,
      delivery: 'nextDay',
      origin: true,
      supplier: firstSupplier?.supplier?.name ?? '',
      originDesc: good.description || '',
      images: good.images.map((img) => img.url),
      // 详情图（详情页纵向铺图，按 sort 升序）
      detailImages: good.detailImages.map((img) => img.url),
      skus: good.skus.map((sku) => ({
        id: sku.id,
        name: sku.name,
        specValues: parseSpecValues(sku.specValues),
        price: centToYuan(sku.price),
        marketPrice: centToYuanNullable(sku.marketPrice),
        stock: sku.stock,
      })),
      // 多规格维度分组（从各 sku 的 specValues 聚合推导，供详情页分组选择）
      specs: aggregateSpecs(good.skus),
      collected: false,
      supplierInfo: good.suppliers.map((gs) => ({
        id: gs.supplier.id,
        name: gs.supplier.name,
        fulfillRate: gs.supplier.fulfillRate,
        price: centToYuan(gs.price),
        stock: gs.stock,
        freight: centToYuan(gs.freight),
        skuId: gs.skuId,
      })),
    };
  }

  async toggleFavorite(userId: string, goodId: string, isCollected: boolean) {
    if (isCollected) {
      await this.prisma.favorite.upsert({
        where: {
          userId_goodId: { userId, goodId },
        },
        create: { userId, goodId },
        update: {},
      });
    } else {
      await this.prisma.favorite.deleteMany({
        where: { userId, goodId },
      });
    }
    return { isCollected };
  }

  private getOrderBy(sort?: string) {
    switch (sort) {
      case 'sales':
        return { sales: 'desc' as const };
      case 'price_asc':
        return { skus: { _count: 'asc' as const } };
      case 'price_desc':
        return { skus: { _count: 'desc' as const } };
      case 'newest':
        return { createdAt: 'desc' as const };
      case 'recommend':
        // 推荐排序：recommendSort 升序，再按销量降序
        return [
          { recommendSort: 'asc' as const },
          { sales: 'desc' as const },
        ];
      default:
        return { sales: 'desc' as const };
    }
  }

  async getSubCategories(categoryId?: string) {
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    return this.prisma.subCategory.findMany({
      where,
      orderBy: [{ sort: 'asc' }],
    });
  }
}
