import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { centToYuan } from '../../common/utils/money';
import { formatSpecText } from '../../common/utils/spec';

/**
 * 订单服务。
 *
 * 下单流程（createOrder）关键安全/一致性保证：
 *  1. 服务端重算价格：忽略前端传入的 price，一律以 GoodSupplier.price / Sku.price 为准；
 *  2. 库存校验 + 原子扣减：用 `update({ where: { id, stock: { gte: qty } } })` 防超卖，
 *     命中 0 行即视为库存不足回滚；
 *  3. 全程在 prisma.$transaction 内，优惠券核销、建单、扣库存、清购物车任一失败整体回滚。
 *
 * 金额单位约定：库内/计算全程「分」(Int)；输出 API 时通过 centToYuan 转「元」。
 *
 * 越权防护：getDetail / confirmReceipt / rebuy / getLogistics 均校验订单归属。
 */
@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      select: { status: true },
    });

    const stats = {
      pending: 0,
      shipping: 0,
      receiving: 0,
      done: 0,
      comment: 0,
      total: orders.length,
    };

    for (const o of orders) {
      if (stats[o.status] !== undefined) {
        stats[o.status]++;
      }
    }

    return stats;
  }

  async getList(
    userId: string,
    params: { status?: string; page: number; pageSize: number },
  ) {
    const { status, page, pageSize } = params;

    const where: Prisma.OrderWhereInput = { userId };
    if (status && status !== 'all') {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: {
            include: {
              sku: {
                include: {
                  good: {
                    include: {
                      images: {
                        orderBy: { sort: 'asc' },
                        take: 1,
                      },
                    },
                  },
                },
              },
            },
          },
          packages: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const list = orders.map((o) => ({
      id: o.id,
      orderSn: o.orderSn,
      status: o.status,
      // 输出边界：分→元
      totalAmount: centToYuan(o.totalAmount),
      discountAmount: centToYuan(o.discountAmount),
      freightAmount: centToYuan(o.freightAmount),
      payAmount: centToYuan(o.payAmount),
      createdAt: o.createdAt,
      items: o.items.map((item) => ({
        id: item.id,
        goodTitle: item.goodTitle,
        specName: item.specName,
        image: item.image,
        price: centToYuan(item.price),
        quantity: item.quantity,
      })),
      packageCount: o.packages.length,
    }));

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page < Math.ceil(total / pageSize),
    };
  }

  async getDetail(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            sku: {
              include: {
                good: {
                  include: {
                    images: {
                      orderBy: { sort: 'asc' },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
        packages: true,
        address: true,
      },
    });

    if (!order) return null;
    // 越权防护
    if (order.userId !== userId) {
      throw new ForbiddenException('无权查看该订单');
    }

    return {
      id: order.id,
      orderSn: order.orderSn,
      status: order.status,
      // 输出边界：分→元
      totalAmount: centToYuan(order.totalAmount),
      discountAmount: centToYuan(order.discountAmount),
      freightAmount: centToYuan(order.freightAmount),
      payAmount: centToYuan(order.payAmount),
      remark: order.remark,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        goodId: item.sku.good.id,
        goodTitle: item.goodTitle,
        specName: item.specName,
        image: item.image || item.sku.good.images[0]?.url || '',
        price: centToYuan(item.price),
        quantity: item.quantity,
      })),
      packages: order.packages.map((pkg, idx) => ({
        id: pkg.id,
        status: pkg.status,
        supplierName: pkg.supplierName,
        expressCompany: pkg.expressCompany,
        expressNo: pkg.expressNo,
        items: idx === 0 ? order.items.map((item) => ({
          id: item.id,
          goodId: item.sku.good.id,
          goodTitle: item.goodTitle,
          specName: item.specName,
          image: item.image || item.sku.good.images[0]?.url || '',
          price: centToYuan(item.price),
          quantity: item.quantity,
        })) : [],
      })),
      address: order.address
        ? {
            name: order.address.name,
            phone: order.address.phone,
            fullAddress: `${order.address.province}${order.address.city}${order.address.district}${order.address.detail}`,
          }
        : null,
    };
  }

  async createOrder(
    userId: string,
    body: {
      addressId: string;
      items?: { skuId: string; quantity: number }[];
      remark?: string;
      kocId?: string;
      couponId?: string;
    },
  ) {
    // 1. 确定下单条目来源：直接下单(body.items) 或 购物车结算
    //    注意：此处只取 skuId + quantity，价格一律服务端重算，忽略任何前端价格字段。
    let rawItems: { skuId: string; quantity: number }[];

    if (body.items && body.items.length > 0) {
      rawItems = body.items.map((i) => ({
        skuId: i.skuId,
        quantity: Number(i.quantity) || 0,
      }));
    } else {
      const cartItems = await this.prisma.cartItem.findMany({
        where: { userId },
        select: { skuId: true, quantity: true },
      });
      if (cartItems.length === 0) {
        throw new BadRequestException('购物车为空，无法下单');
      }
      rawItems = cartItems.map((ci) => ({
        skuId: ci.skuId,
        quantity: ci.quantity,
      }));
    }

    // 校验数量合法
    if (rawItems.some((i) => i.quantity <= 0)) {
      throw new BadRequestException('商品数量必须大于 0');
    }

    // 2. 一次性批量查询所有 SKU + 商品 + 供应商信息（消除 N+1）
    const skuIds = Array.from(new Set(rawItems.map((i) => i.skuId)));
    const skus = await this.prisma.sku.findMany({
      where: { id: { in: skuIds } },
      include: {
        good: {
          include: {
            images: { orderBy: { sort: 'asc' }, take: 1 },
            suppliers: { where: { status: 'active' }, include: { supplier: true } },
          },
        },
      },
    });

    const skuMap = new Map(skus.map((s) => [s.id, s]));
    if (skuMap.size !== skuIds.length) {
      throw new BadRequestException('存在无效或不存在的商品规格');
    }

    // 3. 解析每条目：确定供应商、服务端价格、运费
    const resolvedItems = rawItems.map((item) => {
      const sku = skuMap.get(item.skuId)!;
      const good = sku.good;

      // 匹配该 SKU 的活跃供应商报价；无则回退到 SKU 本身价格
      const gs = good.suppliers.find((s) => s.skuId === sku.id);
      const supplierId = gs?.supplierId || 'default';
      const supplierName = gs?.supplier?.name || '鲜到家自营';
      // 服务端权威基础价：优先供应商报价，否则 SKU 价格
      const basePrice = gs?.price ?? sku.price;
      const freight = gs?.freight ?? 0;
      // 库存权威来源：优先供应商库存，否则 SKU 库存
      const stock = gs?.stock ?? sku.stock;
      // 商品级折扣：有折扣率时按折扣计算折后单价（分），否则原价。
      // 下单以折后价计入订单金额，与优惠券叠加（先折扣后减券）。
      const unitPrice =
        good.discountRate != null
          ? Math.round(basePrice * good.discountRate)
          : basePrice;

      return {
        skuId: item.skuId,
        quantity: item.quantity,
        goodId: good.id,
        goodTitle: good.name,
        specName: formatSpecText(sku.specValues, sku.name),
        image: good.images[0]?.url || '',
        price: unitPrice,
        freight,
        stock,
        supplierId,
        supplierName,
        // 记录要扣减库存的 GoodSupplier 记录 id（若存在）
        goodSupplierId: gs?.id ?? null,
      };
    });

    // 4. 库存预校验（提前给出友好提示，事务内再做原子扣减）
    for (const it of resolvedItems) {
      if (it.stock < it.quantity) {
        throw new BadRequestException(`“${it.goodTitle}”库存不足`);
      }
    }

    // 5. 事务：扣库存 + 核销优惠券 + 建单 + 建 payment + 清购物车
    const result = await this.prisma.$transaction(async (tx) => {
      // 5.1 原子扣减库存（防超卖）
      for (const it of resolvedItems) {
        if (it.goodSupplierId) {
          // 扣 GoodSupplier.stock：where 带 stock >= qty，命中 0 行即库存不足（并发安全）
          const updated = await tx.goodSupplier.updateMany({
            where: { id: it.goodSupplierId, stock: { gte: it.quantity } },
            data: { stock: { decrement: it.quantity } },
          });
          if (updated.count === 0) {
            throw new BadRequestException(`“${it.goodTitle}”库存不足`);
          }
          // 同步扣减对应 SKU 库存
          await tx.sku.updateMany({
            where: { id: it.skuId, stock: { gte: it.quantity } },
            data: { stock: { decrement: it.quantity } },
          });
        } else {
          const updated = await tx.sku.updateMany({
            where: { id: it.skuId, stock: { gte: it.quantity } },
            data: { stock: { decrement: it.quantity } },
          });
          if (updated.count === 0) {
            throw new BadRequestException(`“${it.goodTitle}”库存不足`);
          }
        }
        // 商品销量增加
        await tx.good.update({
          where: { id: it.goodId },
          data: { sales: { increment: it.quantity } },
        });
      }

      // 5.2 按供应商分组计算运费与金额
      const supplierGroups = new Map<
        string,
        { supplierId: string; supplierName: string; items: typeof resolvedItems; total: number; freight: number }
      >();
      for (const it of resolvedItems) {
        if (!supplierGroups.has(it.supplierId)) {
          supplierGroups.set(it.supplierId, {
            supplierId: it.supplierId,
            supplierName: it.supplierName,
            items: [],
            total: 0,
            freight: 0,
          });
        }
        const g = supplierGroups.get(it.supplierId)!;
        g.total += it.price * it.quantity;
        // 同一供应商运费只计一次（取最大值，避免重复累加）
        g.freight = Math.max(g.freight, it.freight);
        g.items.push(it);
      }

      let totalAmount = 0;
      let freightAmount = 0;
      for (const g of supplierGroups.values()) {
        totalAmount += g.total;
        freightAmount += g.freight;
      }

      // 5.3 优惠券核销（服务端重算优惠金额；以分为单位计算）
      let discountAmount = 0;
      let couponRefId: string | null = null;
      if (body.couponId) {
        const userCoupon = await tx.userCoupon.findFirst({
          where: { id: body.couponId, userId, status: 'usable' },
          include: { coupon: true },
        });
        if (!userCoupon) {
          throw new BadRequestException('优惠券不可用');
        }
        const coupon = userCoupon.coupon;
        if (coupon.expireTime && coupon.expireTime < new Date()) {
          throw new BadRequestException('优惠券已过期');
        }
        if (totalAmount < coupon.minAmount) {
          throw new BadRequestException(
            `订单金额未满 ${centToYuan(coupon.minAmount)} 元，该优惠券不可用`,
          );
        }
        // type: cash(满减，value 为分) | discount(折扣，discountValue 为折扣率如 0.85)
        if (coupon.type === 'discount' && coupon.discountValue != null) {
          discountAmount = Math.round(totalAmount * (1 - coupon.discountValue));
        } else {
          discountAmount = coupon.value ?? 0;
        }
        // 优惠不超过订单金额
        discountAmount = Math.min(discountAmount, totalAmount);
        if (discountAmount < 0) discountAmount = 0;

        await tx.userCoupon.update({
          where: { id: userCoupon.id },
          data: { status: 'used', usedAt: new Date() },
        });
        couponRefId = coupon.id;
        // 券总量核销计数
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      const payAmount = totalAmount + freightAmount - discountAmount;
      const orderSn = `VG${Date.now()}${Math.random()
        .toString(36)
        .substr(2, 6)
        .toUpperCase()}`;

      const groupsArr = Array.from(supplierGroups.values());

      // 5.4 创建订单 + 明细 + 分包（金额全部以「分」入库）
      const order = await tx.order.create({
        data: {
          orderSn,
          userId,
          addressId: body.addressId,
          supplierId: groupsArr[0]?.supplierId === 'default' ? null : groupsArr[0]?.supplierId,
          status: 'pending',
          totalAmount,
          discountAmount,
          freightAmount,
          payAmount,
          remark: body.remark,
          kocId: body.kocId,
          items: {
            create: resolvedItems.map((it) => ({
              skuId: it.skuId,
              goodTitle: it.goodTitle,
              specName: it.specName,
              image: it.image,
              price: it.price,
              quantity: it.quantity,
            })),
          },
          packages: {
            create: groupsArr.map((g) => ({
              supplierId: g.supplierId === 'default' ? null : g.supplierId,
              supplierName: g.supplierName,
              status: 0,
            })),
          },
        },
        include: { items: true, packages: true },
      });

      // 5.5 创建待支付记录
      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: order.payAmount,
          status: 'pending',
        },
      });

      // 5.6 清空购物车（仅购物车结算场景）
      if (!body.items || body.items.length === 0) {
        await tx.cartItem.deleteMany({ where: { userId } });
      }

      void couponRefId;
      // 输出边界：分→元
      return {
        id: order.id,
        orderSn: order.orderSn,
        payAmount: centToYuan(order.payAmount),
      };
    });

    return result;
  }

  async confirmReceipt(orderId: string, userId: string) {
    // 越权防护：仅订单归属人可确认收货
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, status: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.userId !== userId) throw new ForbiddenException('无权操作该订单');

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'done' },
    });

    await this.prisma.orderPackage.updateMany({
      where: { orderId },
      data: { status: 5 },
    });

    await this.prisma.payment.updateMany({
      where: { orderId },
      data: { status: 'paid', payTime: new Date() },
    });

    return { status: 'done' };
  }

  async rebuy(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('订单不存在');
    // 越权防护：仅订单归属人可再次购买
    if (order.userId !== userId) throw new ForbiddenException('无权操作该订单');

    for (const item of order.items) {
      const existing = await this.prisma.cartItem.findFirst({
        where: { userId, skuId: item.skuId },
      });

      if (existing) {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        });
      } else {
        await this.prisma.cartItem.create({
          data: { userId, skuId: item.skuId, quantity: item.quantity },
        });
      }
    }

    return { added: order.items.length };
  }

  async getLogistics(orderId: string, packageIndex: number, userId: string) {
    // 越权防护：仅订单归属人可查看物流
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.userId !== userId) throw new ForbiddenException('无权查看该订单');

    const packages = await this.prisma.orderPackage.findMany({
      where: { orderId },
      orderBy: { id: 'asc' },
    });

    const pkg = packages[packageIndex];
    if (!pkg) return null;

    // Mock logistics data
    const traces = [
      {
        time: new Date().toISOString(),
        status: '快递已签收',
        description: '您的快递已由本人签收，感谢使用鲜到家',
      },
      {
        time: new Date(Date.now() - 2 * 3600000).toISOString(),
        status: '派送中',
        description: '快递员正在为您派送',
      },
      {
        time: new Date(Date.now() - 8 * 3600000).toISOString(),
        status: '运输中',
        description: '快件已到达目的地分拣中心',
      },
      {
        time: new Date(Date.now() - 24 * 3600000).toISOString(),
        status: '已发货',
        description: '快件已从仓库发出',
      },
    ];

    return {
      expressCompany: pkg.expressCompany || '顺丰速运',
      expressNo: pkg.expressNo || 'SF' + Date.now(),
      traces:
        pkg.status >= 3 ? traces : traces.slice(0, 3 - pkg.status + 1),
    };
  }
}
