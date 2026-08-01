import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { centToYuan, centToYuanNullable, yuanToCent } from '../../common/utils/money';
import { formatSpecText, parseSpecValues } from '../../common/utils/spec';
import { WechatPayClient } from '../payment/wechatpay.client';
import { DianjiaClient } from '../dianjia/dianjia.client';
import { DianjiaService } from '../dianjia/dianjia.service';
import * as bcrypt from 'bcryptjs';
import {
  CreateCouponDto,
  UpdateCouponDto,
  GrantCouponDto,
} from '../../common/dto';

/**
 * 供应商后台服务。
 * 金额单位约定：库内「分」(Int)，前端传入元/输出给前端元。
 * 经由 yuanToCent / centToYuan 在 service 边界转换。
 */

interface AdminAccount {
  username: string;
  role: string;
  name: string;
  passwordHash: string;
}

// 后台账号从环境变量读取，格式：username:role:name:passwordHash,...
// role: super=超管, ops=运营
function loadAdminAccounts(): AdminAccount[] {
  const env = process.env.ADMIN_ACCOUNTS || '';
  if (!env) return [];
  return env.split(',').map((entry) => {
    const [username, role, name, passwordHash] = entry.trim().split(':');
    return { username, role, name, passwordHash };
  }).filter((a): a is AdminAccount => !!(a.username && a.role && a.passwordHash));
}

// KOC 相关管理操作仅以下角色可执行
const KOC_MANAGER_ROLES = ['super'];

export function requireKocManager(role: string | undefined) {
  if (!role || !KOC_MANAGER_ROLES.includes(role)) {
    throw new ForbiddenException('无权限执行该操作，需超管权限');
  }
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private wxPay: WechatPayClient,
    private dianjia: DianjiaClient,
    private dianjiaService: DianjiaService,
  ) {}

  /** 店管家：获取店铺列表（连通验证 + 后续供应商/订单对接基础）。 */
  async getDianjiaShops() {
    return this.dianjia.execute('base/shop/list', null);
  }

  /** 店管家：手动重传订单（异步上传失败时的补偿入口）。 */
  async retryUploadOrder(orderId: string) {
    return this.dianjiaService.uploadOrder(orderId);
  }

  /** 店管家：批量同步已支付未同步订单。force=true 则全量重传。 */
  async syncAllOrdersToDianjia(force?: boolean) {
    return this.dianjiaService.syncAllOrders({ force });
  }

  /** 店管家：读取自动同步开关。 */
  async getDianjiaAutoSync() {
    return { enabled: await this.dianjiaService.getAutoSync() };
  }

  /** 店管家：设置自动同步开关。 */
  async setDianjiaAutoSync(enabled: boolean) {
    return { enabled: await this.dianjiaService.setAutoSync(enabled) };
  }

  /** 店管家：同步单个商品。 */
  async syncGoodToDianjia(goodId: string) {
    return this.dianjiaService.syncGood(goodId);
  }

  /** 店管家：批量同步所有在售商品。 */
  async syncAllGoodsToDianjia() {
    return this.dianjiaService.syncAllGoods();
  }

  /** 店管家：库存同步（skuId 缺省则全量）。 */
  async syncStockToDianjia(skuId?: string) {
    return this.dianjiaService.syncStock(skuId);
  }

  async login(username: string, password: string, supplierId?: string) {
    const accounts = loadAdminAccounts();
    console.log('[admin] login attempt: username=%s, accounts loaded=%d, ADMIN_ACCOUNTS set=%s', username, accounts.length, process.env.ADMIN_ACCOUNTS ? 'yes' : 'no');
    if (accounts.length > 0) {
      console.log('[admin] first account: username=%s, hashPrefix=%s', accounts[0].username, accounts[0].passwordHash?.slice(0, 10));
    }
    const acc = accounts.find((a) => a.username === username);
    if (!acc || !bcrypt.compareSync(password, acc.passwordHash)) {
      return { success: false, message: '账号或密码错误' };
    }
    // 确定供应商：优先用传入的 supplierId（校验存在），否则取第一个 active
    let sup: { id: string; name: string } | null = null;
    if (supplierId) {
      sup = await this.prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true, name: true },
      });
      if (!sup) {
        return { success: false, message: '供应商不存在' };
      }
    } else {
      sup = await this.prisma.supplier.findFirst({
        where: { status: 'active' },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true },
      });
      if (!sup) {
        return { success: false, message: '系统未配置供应商' };
      }
    }
    const token = await this.jwtService.signAsync({
      supplierId: sup.id,
      role: acc.role,
      name: acc.name,
    });
    return {
      success: true,
      token,
      role: acc.role,
      name: acc.name,
      supplierId: sup.id,
      supplier: { id: sup.id, name: sup.name },
    };
  }

  async getDashboard(supplierId: string) {
    const [totalProducts, pendingCount] = await Promise.all([
      this.prisma.good.count({ where: { status: 'active' } }),
      this.prisma.order.count({ where: { status: 'pending' } }),
    ]);
    return {
      pendingOrders: pendingCount,
      todayRevenue: 2580.50,
      totalProducts,
      shippingToday: 0,
      recentOrders: [
        { orderSn: '20260616001', amount: 88, status: 'pending', createdAt: '2026-06-16 08:30' },
        { orderSn: '20260616002', amount: 156, status: 'shipping', createdAt: '2026-06-16 07:15' },
      ]
    };
  }

  // ===== 分类管理 =====

  async getCategories() {
    return this.prisma.category.findMany({
      include: { subCategories: { orderBy: { sort: 'asc' } } },
      orderBy: { sort: 'asc' },
    });
  }

  async createCategory(body: { name: string; icon?: string }) {
    return this.prisma.category.create({ data: { name: body.name, icon: body.icon, sort: 99 } });
  }

  async updateCategory(id: string, body: { name?: string; icon?: string; sort?: number }) {
    return this.prisma.category.update({ where: { id }, data: body });
  }

  async deleteCategory(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }

  async getSubCategories(categoryId?: string) {
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    return this.prisma.subCategory.findMany({
      where,
      include: { category: true },
      orderBy: [{ categoryId: 'asc' }, { sort: 'asc' }],
    });
  }

  async createSubCategory(body: { categoryId: string; name: string }) {
    return this.prisma.subCategory.create({ data: { categoryId: body.categoryId, name: body.name, sort: 99 } });
  }

  async updateSubCategory(id: string, body: { name?: string; sort?: number }) {
    return this.prisma.subCategory.update({ where: { id }, data: body });
  }

  async deleteSubCategory(id: string) {
    return this.prisma.subCategory.delete({ where: { id } });
  }

  // ===== 商品管理（数据库读写） =====

  async getGoods(supplierId: string, status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const goods = await this.prisma.good.findMany({
      where,
      include: {
        skus: { orderBy: { price: 'asc' } },
        images: { orderBy: { sort: 'asc' } },
        detailImages: { orderBy: { sort: 'asc' } },
        suppliers: { where: { supplierId }, take: 1 },
        subCategory: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return goods.map(g => {
      const sku = g.skus[0];
      const img = g.images[0];
      const sup = g.suppliers[0];
      const priceCent = sku?.price ?? 0;
      const paidCent = g.discountRate != null
        ? Math.round(priceCent * g.discountRate)
        : priceCent;
      return {
        id: g.id,
        name: g.name,
        // 折前价 / 折后价 / 折扣率
        originalPrice: centToYuan(priceCent),
        price: centToYuan(paidCent),
        discountRate: g.discountRate ?? null,
        stock: sup?.stock ?? sku?.stock ?? 0,
        sales: g.sales,
        status: g.status,
        image: img?.url ?? '',
        // 多图 url 数组（按 sort 升序）
        images: g.images.map((i) => i.url),
        // 详情图 url 数组（按 sort 升序）
        detailImages: g.detailImages.map((i) => i.url),
        // 今日推荐
        isRecommended: g.isRecommended,
        recommendSort: g.recommendSort,
        skuId: sku?.id,
        subCategoryId: g.subCategoryId,
        subCategoryName: g.subCategory?.name || '',
        // 完整 sku 列表（含多规格 specValues），供后台编辑回填
        skus: g.skus.map((s) => ({
          id: s.id,
          name: s.name,
          specValues: parseSpecValues(s.specValues),
          price: centToYuan(s.price),
          marketPrice: centToYuanNullable(s.marketPrice),
          stock: s.stock,
        })),
      };
    });
  }

  async createGood(supplierId: string, body: any) {
    const good = await this.prisma.good.create({
      data: {
        name: body.name,
        subCategoryId: body.subCategoryId || null,
        description: body.description || '',
        detail: body.detail || '',
        sales: 0,
        status: 'active',
        discountRate: normalizeDiscountRate(body.discountRate),
        isRecommended: !!body.isRecommended,
        recommendSort: parseInt(body.recommendSort) || 0,
      },
    });

    // 支持多规格创建（前端传入元 → 库内分）
    if (body.skus && body.skus.length > 0) {
      for (const s of body.skus) {
        // 多规格：specValues 为 [{name,value}] 数组，直接写入 MySQL JSON
        const specValues = s.specValues || null;
        const name = s.name || (specValues ? formatSpecText(specValues) : '默认规格');
        const sku = await this.prisma.sku.create({
          data: {
            goodId: good.id,
            name,
            specValues,
            price: yuanToCent(s.price),
            marketPrice: s.marketPrice != null ? yuanToCent(s.marketPrice) : null,
            stock: parseInt(s.stock) || 0,
          },
        });
        await this.prisma.goodSupplier.create({
          data: {
            goodId: good.id,
            skuId: sku.id,
            supplierId,
            price: yuanToCent(s.price),
            stock: parseInt(s.stock) || 0,
          },
        });
      }
    } else {
      // 默认单规格（前端传入元 → 库内分）
      const sku = await this.prisma.sku.create({
        data: {
          goodId: good.id,
          name: '默认规格',
          price: yuanToCent(body.price),
          marketPrice: body.marketPrice != null ? yuanToCent(body.marketPrice) : null,
          stock: parseInt(body.stock) || 0,
        },
      });

      await this.prisma.goodSupplier.create({
        data: {
          goodId: good.id,
          skuId: sku.id,
          supplierId,
          price: yuanToCent(body.price),
          stock: parseInt(body.stock) || 0,
        },
      });
    }

    // 支持多图上传（轮播图）
    const images = body.images || (body.image ? [body.image] : []);
    if (images.length > 0) {
      await Promise.all(
        images.map((url: string, i: number) =>
          this.prisma.goodImage.create({
            data: { goodId: good.id, url, sort: i },
          }),
        ),
      );
    }

    // 详情图（详情页纵向铺图）
    const detailImages: string[] = body.detailImages || [];
    if (detailImages.length > 0) {
      await Promise.all(
        detailImages.map((url: string, i: number) =>
          this.prisma.goodDetailImage.create({
            data: { goodId: good.id, url, sort: i },
          }),
        ),
      );
    }

    return { id: good.id, name: good.name, status: 'active' };
  }

  async updateGood(supplierId: string, id: string, body: any) {
    const good = await this.prisma.good.findUnique({ where: { id } });
    if (!good) throw new BadRequestException('商品不存在');

    // Update basic info
    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.detail !== undefined) updateData.detail = body.detail;
    if (body.subCategoryId !== undefined) updateData.subCategoryId = body.subCategoryId || null;
    if (body.discountRate !== undefined) {
      updateData.discountRate = normalizeDiscountRate(body.discountRate);
    }
    // 今日推荐设置
    if (body.isRecommended !== undefined) updateData.isRecommended = !!body.isRecommended;
    if (body.recommendSort !== undefined) updateData.recommendSort = parseInt(body.recommendSort) || 0;

    if (Object.keys(updateData).length > 0) {
      await this.prisma.good.update({ where: { id }, data: updateData });
    }

    // 多规格编辑：body.skus[] 有 id 的更新（含 specValues/price/marketPrice/stock），
    // 无 id 的新增 + 建 GoodSupplier。不删除 sku（避免破坏已下订单的 OrderItem.skuId 外键）。
    if (body.skus && body.skus.length > 0) {
      for (const s of body.skus) {
        const specValues = s.specValues || null;
        const name = s.name || (specValues ? formatSpecText(specValues) : '默认规格');
        if (s.id) {
          const skuData: any = { name, specValues };
          if (s.price !== undefined) skuData.price = yuanToCent(s.price);
          if (s.marketPrice !== undefined) skuData.marketPrice = s.marketPrice != null ? yuanToCent(s.marketPrice) : null;
          if (s.stock !== undefined) skuData.stock = parseInt(s.stock) || 0;
          await this.prisma.sku.update({ where: { id: s.id }, data: skuData });
          // 同步 GoodSupplier 价格/库存（若存在该 sku 的供应商关系）
          const gs = await this.prisma.goodSupplier.findFirst({
            where: { goodId: id, skuId: s.id },
          });
          if (gs) {
            await this.prisma.goodSupplier.update({
              where: { id: gs.id },
              data: {
                ...(s.price !== undefined ? { price: yuanToCent(s.price) } : {}),
                ...(s.stock !== undefined ? { stock: parseInt(s.stock) || 0 } : {}),
              },
            });
          }
        } else {
          const sku = await this.prisma.sku.create({
            data: {
              goodId: id,
              name,
              specValues,
              price: yuanToCent(s.price),
              marketPrice: s.marketPrice != null ? yuanToCent(s.marketPrice) : null,
              stock: parseInt(s.stock) || 0,
            },
          });
          await this.prisma.goodSupplier.create({
            data: {
              goodId: id,
              skuId: sku.id,
              supplierId,
              price: yuanToCent(s.price),
              stock: parseInt(s.stock) || 0,
            },
          });
        }
      }
    } else if (body.price !== undefined || body.marketPrice !== undefined) {
      // 兼容旧单值分支：更新首个 sku
      const sku = await this.prisma.sku.findFirst({ where: { goodId: id } });
      if (sku) {
        const skuData: any = {};
        if (body.price !== undefined) skuData.price = yuanToCent(body.price);
        if (body.marketPrice !== undefined) {
          skuData.marketPrice = body.marketPrice != null ? yuanToCent(body.marketPrice) : null;
        }
        if (body.skuName !== undefined) skuData.name = body.skuName;
        await this.prisma.sku.update({ where: { id: sku.id }, data: skuData });
      }
    }

    // Update stock in GoodSupplier
    if (body.stock !== undefined) {
      const sup = await this.prisma.goodSupplier.findFirst({
        where: { goodId: id, supplierId },
      });
      if (sup) {
        await this.prisma.goodSupplier.update({ where: { id: sup.id }, data: { stock: parseInt(body.stock) } });
      }
    }

    // Update images (轮播图，支持多图)
    if (body.images !== undefined || body.image !== undefined) {
      const images: string[] = body.images || (body.image ? [body.image] : []);
      await this.prisma.goodImage.deleteMany({ where: { goodId: id } });
      if (images.length > 0) {
        await Promise.all(
          images.map((url: string, i: number) =>
            this.prisma.goodImage.create({ data: { goodId: id, url, sort: i } }),
          ),
        );
      }
    }

    // Update detailImages (详情图，全量重建)
    if (body.detailImages !== undefined) {
      const detailImages: string[] = body.detailImages || [];
      await this.prisma.goodDetailImage.deleteMany({ where: { goodId: id } });
      if (detailImages.length > 0) {
        await Promise.all(
          detailImages.map((url: string, i: number) =>
            this.prisma.goodDetailImage.create({ data: { goodId: id, url, sort: i } }),
          ),
        );
      }
    }

    return { id, ...body };
  }

  async updateGoodStatus(supplierId: string, id: string, status: string) {
    await this.prisma.good.update({ where: { id }, data: { status } });
    return { id, status };
  }

  /**
   * 删除商品：事务内清理关联数据（图片/详情图/供应商关系/收藏），
   * 再删除 Sku（若被订单/购物车引用会触发外键约束，事务回滚并提示），
   * 最后删除 Good 本身。
   */
  async deleteGood(supplierId: string, id: string) {
    const good = await this.prisma.good.findUnique({ where: { id } });
    if (!good) throw new BadRequestException('商品不存在');

    try {
      await this.prisma.$transaction([
        this.prisma.goodImage.deleteMany({ where: { goodId: id } }),
        this.prisma.goodDetailImage.deleteMany({ where: { goodId: id } }),
        this.prisma.goodSupplier.deleteMany({ where: { goodId: id } }),
        this.prisma.favorite.deleteMany({ where: { goodId: id } }),
        this.prisma.sku.deleteMany({ where: { goodId: id } }),
        this.prisma.good.delete({ where: { id } }),
      ]);
    } catch (e) {
      // Sku 仍被 OrderItem / CartItem 引用时外键约束失败
      throw new BadRequestException('该商品存在订单或购物车引用，无法删除，建议改为下架');
    }
    return { id };
  }

  // ===== 订单管理 =====

  async getOrders(
    supplierId: string,
    params: { status?: string; keyword?: string; page: number; pageSize: number },
  ) {
    const { status, keyword, page, pageSize } = params;
    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (keyword && keyword.trim()) {
      const kw = keyword.trim();
      where.OR = [
        { orderSn: { contains: kw } },
        { address: { phone: { contains: kw } } },
        { address: { name: { contains: kw } } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true, address: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    const list = orders.map(o => ({
      id: o.id,
      orderSn: o.orderSn,
      orderNo: o.orderSn,
      // 输出边界：分→元
      totalAmount: centToYuan(o.totalAmount),
      amount: centToYuan(o.totalAmount),
      payAmount: centToYuan(o.payAmount),
      status: o.status,
      receiverName: o.address?.name || '',
      receiver: o.address?.name || '',
      receiverPhone: o.address?.phone || '',
      phone: o.address?.phone || '',
      itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
      createdAt: o.createdAt.toISOString(),
      createTime: o.createdAt.toISOString(),
      // 店管家同步状态（供后台展示已同步/未同步/失败）
      platformOrderId: o.platformOrderId || '',
      dianjiaSyncStatus: o.dianjiaSyncStatus || '',
      dianjiaSyncedAt: o.dianjiaSyncedAt ? o.dianjiaSyncedAt.toISOString() : '',
    }));

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getOrderDetail(supplierId: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        address: { select: { name: true, phone: true, province: true, city: true, district: true, detail: true } },
        packages: true,
        payment: true,
      },
    });
    if (!order) throw new BadRequestException('订单不存在');

    return {
      id: order.id,
      orderSn: order.orderSn,
      // 输出边界：分→元
      totalAmount: centToYuan(order.totalAmount),
      payAmount: centToYuan(order.payAmount),
      discountAmount: centToYuan(order.discountAmount),
      freightAmount: centToYuan(order.freightAmount),
      status: order.status,
      remark: order.remark,
      createdAt: order.createdAt.toISOString(),
      receiverName: order.address?.name,
      receiverPhone: order.address?.phone,
      receiverAddress: order.address ? `${order.address.province}${order.address.city}${order.address.district} ${order.address.detail}` : '',
      items: order.items.map(i => ({
        id: i.id, goodsTitle: i.goodTitle, specName: i.specName, price: centToYuan(i.price), quantity: i.quantity,
        subtotal: centToYuan(i.price * i.quantity),
      })),
      // 物流包裹信息
      packages: order.packages.map(p => ({
        id: p.id,
        supplierName: p.supplierName,
        status: p.status,
        expressCompany: p.expressCompany || '',
        expressNo: p.expressNo || '',
      })),
      paymentStatus: order.payment?.status || 'pending',
    };
  }

  /**
   * 订单状态流转。
   * pending(待付款/待处理) → shipping/receiving(发货，填快递单号) → receiving(待收货) → done(已完成)
   * pending/shipping/receiving → cancelled(取消)
   * 发货时写入快递单号到对应包裹，包裹状态置为 2(已发货)。
   */
  async updateOrderStatus(supplierId: string, id: string, body: any) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { packages: true },
    });
    if (!order) throw new BadRequestException('订单不存在');

    const nextStatus = body.status;
    const data: any = { status: nextStatus };

    // 发货：填快递单号，更新包裹
    if ((nextStatus === 'shipping' || nextStatus === 'receiving') && body.expressNo) {
      // 取该订单第一个包裹写入单号（无则创建）
      const pkg = order.packages[0];
      if (pkg) {
        await this.prisma.orderPackage.update({
          where: { id: pkg.id },
          data: { status: 2, expressCompany: body.expressCompany || '', expressNo: body.expressNo },
        });
      } else {
        await this.prisma.orderPackage.create({
          data: {
            orderId: id,
            supplierId: order.supplierId,
            supplierName: '鲜到家',
            status: 2,
            expressCompany: body.expressCompany || '',
            expressNo: body.expressNo,
          },
        });
      }
      // 发货后订单进入待收货
      data.status = 'receiving';
    }

    // 完成订单时，包裹置为已签收(5)
    if (nextStatus === 'done') {
      await this.prisma.orderPackage.updateMany({
        where: { orderId: id },
        data: { status: 5 },
      });
    }

    const updated = await this.prisma.order.update({ where: { id }, data });
    return { id, status: updated.status };
  }

  async getSettlement(supplierId: string) {
    return {
      totalRevenue: 25800.50, pendingSettlement: 8650, settledAmount: 17150.50,
      thisMonth: { revenue: 12800, commission: 640, netIncome: 12160 },
      records: [
        { period: '2026.06.01-15', amount: 8650, status: 'pending', orderCount: 128 },
        { period: '2026.05.01-31', amount: 12800.50, status: 'settled', orderCount: 205, settledAt: '2026-06-05' },
      ],
    };
  }

  // ===== 优惠券管理 =====
  // 金额以「元」与前端交互，库内「分」。discountValue 为折扣率原样存储。

  private formatCoupon(c: any) {
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      value: centToYuanNullable(c.value),
      discountValue: c.discountValue,
      minAmount: centToYuan(c.minAmount),
      scopeType: c.scopeType,
      totalCount: c.totalCount,
      usedCount: c.usedCount,
      remaining: Math.max(0, c.totalCount - c.usedCount),
      expireTime: c.expireTime,
      status: c.status,
    };
  }

  async listCoupons(params: { page: number; pageSize: number; status?: string }) {
    const { page, pageSize, status } = params;
    const where: any = {};
    if (status) where.status = status;
    const [list, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        orderBy: { expireTime: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.coupon.count({ where }),
    ]);
    return {
      list: list.map((c) => this.formatCoupon(c)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async createCoupon(body: CreateCouponDto) {
    // 类型与对应字段一致性校验
    if (body.type === 'cash' && (body.value == null)) {
      throw new BadRequestException('现金券必须填写面额 value（元）');
    }
    if (body.type === 'discount' && body.discountValue == null) {
      throw new BadRequestException('折扣券必须填写折扣率 discountValue（0~1）');
    }
    const coupon = await this.prisma.coupon.create({
      data: {
        name: body.name,
        type: body.type,
        value: body.type === 'cash' ? yuanToCent(body.value) : null,
        discountValue: body.type === 'discount' ? body.discountValue : null,
        minAmount: yuanToCent(body.minAmount ?? 0),
        scopeType: body.scopeType || 'all',
        totalCount: body.totalCount,
        usedCount: 0,
        expireTime: new Date(body.expireTime),
        status: 'active',
      },
    });
    return this.formatCoupon(coupon);
  }

  async updateCoupon(id: string, body: UpdateCouponDto) {
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.type !== undefined) {
      data.type = body.type;
      if (body.type === 'cash') {
        if (body.value == null) throw new BadRequestException('现金券必须填写面额');
        data.value = yuanToCent(body.value);
        data.discountValue = null;
      } else {
        if (body.discountValue == null) throw new BadRequestException('折扣券必须填写折扣率');
        data.discountValue = body.discountValue;
        data.value = null;
      }
    } else {
      if (body.value !== undefined) data.value = yuanToCent(body.value);
      if (body.discountValue !== undefined) data.discountValue = body.discountValue;
    }
    if (body.minAmount !== undefined) data.minAmount = yuanToCent(body.minAmount);
    if (body.scopeType !== undefined) data.scopeType = body.scopeType;
    if (body.totalCount !== undefined) data.totalCount = body.totalCount;
    if (body.expireTime !== undefined) data.expireTime = new Date(body.expireTime);

    const coupon = await this.prisma.coupon.update({ where: { id }, data });
    return this.formatCoupon(coupon);
  }

  async updateCouponStatus(id: string, status: string) {
    const coupon = await this.prisma.coupon.update({
      where: { id },
      data: { status },
    });
    return this.formatCoupon(coupon);
  }

  /** 手动发券给指定用户。校验库存，事务内发券并递增 usedCount。 */
  async grantCoupon(body: GrantCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: body.couponId } });
    if (!coupon) throw new BadRequestException('优惠券不存在');
    if (coupon.status !== 'active') {
      throw new BadRequestException('该优惠券已停用，无法发放');
    }
    const grantCount = body.userIds.length;
    if (coupon.usedCount + grantCount > coupon.totalCount) {
      throw new BadRequestException(
        `库存不足，剩余 ${coupon.totalCount - coupon.usedCount} 张，本次需发放 ${grantCount} 张`,
      );
    }
    // 校验用户存在性
    const users = await this.prisma.user.findMany({
      where: { id: { in: body.userIds } },
      select: { id: true },
    });
    if (users.length !== body.userIds.length) {
      throw new BadRequestException('存在无效用户');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      // 再取一次 coupon 防并发超发
      const fresh = await tx.coupon.findUnique({ where: { id: body.couponId } });
      if (!fresh || fresh.usedCount + grantCount > fresh.totalCount) {
        throw new BadRequestException('库存不足');
      }
      await tx.userCoupon.createMany({
        data: body.userIds.map((uid) => ({
          userId: uid,
          couponId: body.couponId,
          status: 'usable',
        })),
      });
      await tx.coupon.update({
        where: { id: body.couponId },
        data: { usedCount: { increment: grantCount } },
      });
    });

    return { granted: grantCount, couponId: body.couponId, at: now };
  }

  // ===== 客户管理 =====

  /**
   * 客户列表：按昵称/手机号搜索，分页返回。
   * 每个客户聚合：订单数、累计消费、最近下单时间。
   * status: 'active' 有过订单；'new' 注册但无订单；'vip' 累计消费 ≥ 1000 元。
   */
  async getUsers(params: { page: number; pageSize: number; keyword?: string; status?: string }) {
    const { page, pageSize, keyword, status } = params;
    const where: any = {};
    if (keyword) {
      where.OR = [
        { nickname: { contains: keyword, mode: 'insensitive' } },
        { phone: { contains: keyword } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          orders: {
            select: { id: true, payAmount: true, createdAt: true, status: true },
          },
          kocProfile: { select: { id: true, status: true, commissionRate: true, realName: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const list = users.map((u) => {
      const orderCount = u.orders.length;
      // payAmount 以分为单位，累加后转元
      const totalSpentCents = u.orders.reduce((sum, o) => sum + (o.payAmount || 0), 0);
      const totalSpent = centToYuan(totalSpentCents);
      const lastOrderAt = u.orders.reduce((latest, o) => {
        return !latest || (o.createdAt && o.createdAt > latest) ? o.createdAt : latest;
      }, null as Date | null);

      let s = 'new';
      if (totalSpent >= 1000) s = 'vip';
      else if (orderCount > 0) s = 'active';

      return {
        id: u.id,
        nickname: u.nickname || '微信用户',
        avatar: u.avatar || '',
        phone: u.phone || '',
        location: u.location || '',
        orderCount,
        totalSpent,
        lastOrderAt,
        status: s,
        isKoc: u.isKoc,
        kocStatus: u.kocProfile?.status || null,
        commissionRate: u.kocProfile?.commissionRate ?? null,
        createdAt: u.createdAt,
      };
    });

    const filtered = status ? list.filter((u) => u.status === status) : list;

    return {
      list: filtered,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 客户管理概览统计。 */
  async getUserStats() {
    const [totalUsers, usersWithOrders] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        select: { id: true, orders: { select: { payAmount: true } } },
      }),
    ]);

    let vipCount = 0;
    let totalSpentCents = 0;
    let activeCount = 0;
    usersWithOrders.forEach((u) => {
      const spentCents = u.orders.reduce((sum, o) => sum + (o.payAmount || 0), 0);
      totalSpentCents += spentCents;
      if (spentCents > 0) activeCount++;
      if (centToYuan(spentCents) >= 1000) vipCount++;
    });

    return {
      totalUsers,
      activeUsers: activeCount,
      newUsers: totalUsers - activeCount,
      vipUsers: vipCount,
      avgSpent: activeCount > 0 ? centToYuan(Math.round(totalSpentCents / activeCount)) : 0,
      totalSpent: centToYuan(totalSpentCents),
    };
  }

  /** 客户详情：基本信息 + 订单记录 + 收货地址。 */
  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { items: true },
        },
        addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
        coupons: { include: { coupon: true }, orderBy: { createdAt: 'desc' }, take: 20 },
        kocProfile: true,
      },
    });
    if (!user) throw new BadRequestException('客户不存在');

    const totalSpentCents = user.orders.reduce((sum, o) => sum + (o.payAmount || 0), 0);
    const lastOrderAt = user.orders.reduce((latest, o) => {
      return !latest || (o.createdAt && o.createdAt > latest) ? o.createdAt : latest;
    }, null as Date | null);

    return {
      id: user.id,
      nickname: user.nickname || '微信用户',
      avatar: user.avatar || '',
      phone: user.phone || '',
      location: user.location || '',
      createdAt: user.createdAt,
      orderCount: user.orders.length,
      totalSpent: centToYuan(totalSpentCents),
      lastOrderAt,
      isKoc: user.isKoc,
      kocProfile: user.kocProfile
        ? {
            id: user.kocProfile.id,
            realName: user.kocProfile.realName,
            phone: user.kocProfile.phone,
            socialAccount: user.kocProfile.socialAccount,
            introduction: user.kocProfile.introduction,
            status: user.kocProfile.status,
            rejectReason: user.kocProfile.rejectReason,
            commissionRate: user.kocProfile.commissionRate,
            reviewedAt: user.kocProfile.reviewedAt,
            createdAt: user.kocProfile.createdAt,
          }
        : null,
      orders: user.orders.map((o) => ({
        id: o.id,
        orderSn: o.orderSn,
        status: o.status,
        payAmount: centToYuan(o.payAmount),
        itemCount: o.items.reduce((s, it) => s + it.quantity, 0),
        createdAt: o.createdAt,
      })),
      addresses: user.addresses.map((a) => ({
        id: a.id,
        name: a.name,
        phone: a.phone,
        detail: [a.province, a.city, a.district, a.detail].filter(Boolean).join(''),
        isDefault: a.isDefault,
      })),
      coupons: user.coupons.map((uc) => ({
        id: uc.id,
        name: uc.coupon?.name || '',
        status: uc.status,
        createdAt: uc.createdAt,
      })),
    };
  }

  /** 发放记录：查看 UserCoupon 列表（含券与用户信息）。 */
  async listUserCoupons(params: { page: number; pageSize: number; couponId?: string; status?: string }) {
    const { page, pageSize, couponId, status } = params;
    const where: any = {};
    if (couponId) where.couponId = couponId;
    if (status) where.status = status;
    const [list, total] = await Promise.all([
      this.prisma.userCoupon.findMany({
        where,
        include: {
          coupon: true,
          user: { select: { id: true, nickname: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.userCoupon.count({ where }),
    ]);
    return {
      list: list.map((uc) => ({
        id: uc.id,
        userId: uc.userId,
        nickname: uc.user?.nickname,
        phone: uc.user?.phone,
        couponId: uc.couponId,
        couponName: uc.coupon?.name,
        couponType: uc.coupon?.type,
        status: uc.status,
        usedAt: uc.usedAt,
        createdAt: uc.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ===== KOC 管理（仅超管）=====

  /** KOC 申请列表，可按 status 过滤。 */
  async getKocApplications(status?: string) {
    const where: any = {};
    if (status) where.status = status;
    const list = await this.prisma.kocProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, nickname: true, phone: true, avatar: true, isKoc: true } },
      },
    });
    return list.map((p) => ({
      id: p.id,
      userId: p.userId,
      nickname: p.user?.nickname || '微信用户',
      phone: p.user?.phone || p.phone,
      avatar: p.user?.avatar || '',
      realName: p.realName,
      applyPhone: p.phone,
      socialAccount: p.socialAccount,
      introduction: p.introduction,
      status: p.status,
      rejectReason: p.rejectReason,
      commissionRate: p.commissionRate,
      isKoc: p.user?.isKoc || false,
      reviewedAt: p.reviewedAt,
      createdAt: p.createdAt,
    }));
  }

  /** 审核 KOC 申请：approve 同时开通身份；reject 记录原因。 */
  async auditKocApplication(
    profileId: string,
    action: 'approve' | 'reject',
    rejectReason?: string,
    commissionRate?: number,
  ) {
    const profile = await this.prisma.kocProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new BadRequestException('申请记录不存在');

    if (action === 'approve') {
      const rate =
        commissionRate != null && commissionRate >= 0 && commissionRate <= 1
          ? Number(commissionRate)
          : profile.commissionRate;
      await this.prisma.$transaction([
        this.prisma.kocProfile.update({
          where: { id: profileId },
          data: {
            status: 'approved',
            rejectReason: null,
            commissionRate: rate,
            reviewedAt: new Date(),
          },
        }),
        this.prisma.user.update({
          where: { id: profile.userId },
          data: { isKoc: true, kocApprovedAt: new Date() },
        }),
      ]);
      return { status: 'approved' };
    }

    await this.prisma.kocProfile.update({
      where: { id: profileId },
      data: { status: 'rejected', rejectReason: rejectReason || null, reviewedAt: new Date() },
    });
    await this.prisma.user.update({
      where: { id: profile.userId },
      data: { isKoc: false, kocApprovedAt: null },
    });
    return { status: 'rejected' };
  }

  /** 开通/关闭某客户的 KOC 身份。 */
  async toggleUserKoc(userId: string, enabled: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('客户不存在');

    if (enabled) {
      // 开通需存在已审核通过的 profile；否则提示需先申请审核
      const profile = await this.prisma.kocProfile.findUnique({ where: { userId } });
      if (!profile || profile.status !== 'approved') {
        throw new BadRequestException('该客户尚无通过审核的 KOC 申请，无法开通');
      }
      await this.prisma.user.update({
        where: { id: userId },
        data: { isKoc: true, kocApprovedAt: new Date() },
      });
      return { isKoc: true };
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { isKoc: false, kocApprovedAt: null },
      }),
      this.prisma.kocProfile.updateMany({
        where: { userId, status: 'approved' },
        data: { status: 'disabled' },
      }),
    ]);
    return { isKoc: false };
  }

  /** 调整某 KOC 的佣金率（0~1，传 null 恢复默认阶梯）。 */
  async updateKocCommission(profileId: string, commissionRate: number | null) {
    const profile = await this.prisma.kocProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new BadRequestException('申请记录不存在');
    if (commissionRate != null && (commissionRate < 0 || commissionRate > 1)) {
      throw new BadRequestException('佣金率需在 0~1 之间');
    }
    const updated = await this.prisma.kocProfile.update({
      where: { id: profileId },
      data: { commissionRate: commissionRate != null ? Number(commissionRate) : null },
    });
    return { commissionRate: updated.commissionRate };
  }

  // ===== 客服会话管理 =====

  /** 会话列表（含用户信息、最近消息、未读），最近活跃在前。 */
  async getChatSessions(opts: { keyword?: string; closed?: string; page?: number; pageSize?: number }) {
    const page = opts.page || 1;
    const pageSize = opts.pageSize || 50;
    const where: any = {};
    if (opts.closed === 'open') where.closed = false;
    if (opts.closed === 'closed') where.closed = true;
    if (opts.keyword) {
      where.OR = [
        { title: { contains: opts.keyword } },
        { lastMessage: { contains: opts.keyword } },
        { user: { nickname: { contains: opts.keyword } } },
      ];
    }
    const [total, list] = await Promise.all([
      this.prisma.chatSession.count({ where }),
      this.prisma.chatSession.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, phone: true, avatar: true } },
        },
        orderBy: { lastAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      page,
      pageSize,
      list: list.map((s) => ({
        id: s.id,
        userId: s.userId,
        goodId: s.goodId,
        title: s.title,
        lastMessage: s.lastMessage,
        lastAt: s.lastAt,
        userUnread: s.userUnread,
        adminUnread: s.adminUnread,
        closed: s.closed,
        createdAt: s.createdAt,
        user: s.user,
      })),
    };
  }

  /** 管理台查看会话消息列表。 */
  async getChatMessages(sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { user: { select: { id: true, nickname: true, phone: true, avatar: true } } },
    });
    if (!session) throw new BadRequestException('会话不存在');
    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    return {
      session: {
        id: session.id,
        title: session.title,
        goodId: session.goodId,
        closed: session.closed,
        user: session.user,
      },
      messages: messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  }

  /** 客服回复：写消息 + 更新会话最近消息/时间 + userUnread++。 */
  async replyChat(sessionId: string, content: string) {
    const text = (content || '').trim();
    if (!text) throw new BadRequestException('回复内容不能为空');
    const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new BadRequestException('会话不存在');
    const [msg] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: { sessionId, sender: 'admin', content: text },
      }),
      this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { lastMessage: text, lastAt: new Date(), userUnread: { increment: 1 } },
      }),
    ]);
    return { id: msg.id, sender: 'admin', content: msg.content, createdAt: msg.createdAt };
  }

  /** 客服查看会话：清零 adminUnread。 */
  async markChatRead(sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new BadRequestException('会话不存在');
    const updated = await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { adminUnread: 0 },
    });
    return { id: updated.id, adminUnread: updated.adminUnread };
  }

  /** 客服关闭/重开会话。 */
  async toggleChatClosed(sessionId: string, closed: boolean) {
    const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new BadRequestException('会话不存在');
    const updated = await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { closed },
    });
    return { id: updated.id, closed: updated.closed };
  }

  // ===== 售后 / 退货管理 =====

  /** 售后列表。status 可为数字或别名 pending/approved/rejected/refunded/done。 */
  async listAftersales(params: { status?: string; type?: string; keyword?: string; page: number; pageSize: number }) {
    const { status, type, keyword, page, pageSize } = params;
    const where: any = {};
    const statusIn = resolveAftersaleStatusFilter(status);
    if (statusIn) where.status = { in: statusIn };
    if (type) where.type = Number(type);
    if (keyword && keyword.trim()) {
      const kw = keyword.trim();
      where.OR = [
        { aftersaleSn: { contains: kw } },
        { order: { orderSn: { contains: kw } } },
        { user: { nickname: { contains: kw } } },
        { user: { phone: { contains: kw } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.aftersale.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, nickname: true, phone: true } },
          order: { select: { orderSn: true, items: { select: { id: true, goodTitle: true } } } },
        },
      }),
      this.prisma.aftersale.count({ where }),
    ]);

    return {
      list: rows.map((a) => this.formatAftersale(a)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 售后详情：售后字段 + 订单/用户/明细 + 凭证图。 */
  async getAftersaleDetail(id: string) {
    const a = await this.prisma.aftersale.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, phone: true, avatar: true } },
        order: {
          select: {
            orderSn: true,
            status: true,
            payAmount: true,
            createdAt: true,
            address: { select: { name: true, phone: true, province: true, city: true, district: true, detail: true } },
            items: { select: { id: true, goodTitle: true, specName: true, image: true, price: true, quantity: true } },
          },
        },
      },
    });
    if (!a) throw new BadRequestException('售后记录不存在');
    return this.formatAftersale(a, true);
  }

  /** 审核：approve(0→1) / reject(0→2)，可写备注。 */
  async auditAftersale(id: string, action: 'approve' | 'reject', remark?: string) {
    const a = await this.prisma.aftersale.findUnique({ where: { id } });
    if (!a) throw new BadRequestException('售后记录不存在');
    if (a.status !== 0) throw new BadRequestException('当前状态不可审核');
    const status = action === 'approve' ? 1 : 2;
    const updated = await this.prisma.aftersale.update({
      where: { id },
      data: { status, adminRemark: remark || null },
    });
    return { id: updated.id, status: updated.status };
  }

  /** 确认退款：仅「已同意(1)」可操作。
   *  - mock 模式：直接置 4 已退款 + 生成 refundNo（无需微信配置）。
   *  - 真实模式：调微信退款 API，按返回 status 置 4(已退款)/3(退款中)/1(失败可重试)。
   *  注：库存回退（退货入库）暂不在此自动处理，由后台按需手动调整。 */
  async refundAftersale(id: string, remark?: string) {
    const a = await this.prisma.aftersale.findUnique({ where: { id } });
    if (!a) throw new BadRequestException('售后记录不存在');
    if (a.status !== 1) throw new BadRequestException('仅「已同意」状态可确认退款');
    const refundNo = `RF${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // 真实模式：调微信退款，按返回状态决定售后流转
    let refundId: string | undefined;
    let refundStatus: string | undefined;
    let nextStatus = 4; // mock 默认已退款
    let refundErr: string | undefined;
    if (!this.wxPay.mock) {
      const order = await this.prisma.order.findUnique({
        where: { id: a.orderId },
        select: { orderSn: true, payAmount: true },
      });
      if (!order) throw new BadRequestException('关联订单不存在');
      try {
        const res = await this.wxPay.refund({
          outTradeNo: order.orderSn,
          outRefundNo: refundNo,
          refund: a.refundAmount, // 分
          total: order.payAmount, // 分
          reason: a.reason,
        });
        refundId = res.refundId;
        refundStatus = res.status;
        // SUCCESS/CLOSED → 已退款(4)；PROCESSING → 退款中(3)；ABNORMAL 记录失败，保持 1 可重试
        if (res.status === 'SUCCESS' || res.status === 'CLOSED') {
          nextStatus = 4;
        } else if (res.status === 'PROCESSING') {
          nextStatus = 3;
        } else {
          nextStatus = 1;
          refundErr = `微信退款异常: ${res.status}`;
        }
      } catch (e) {
        nextStatus = 1;
        refundStatus = 'FAIL';
        refundErr = `退款调用失败: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    const prevRemark = remark || a.adminRemark || '';
    // 状态条件更新：防止并发重复退款
    const updateResult = await this.prisma.aftersale.updateMany({
      where: { id, status: 1 },
      data: {
        status: nextStatus,
        refundNo,
        refundId,
        refundStatus,
        adminRemark: refundErr
          ? prevRemark
            ? `${prevRemark}\n${refundErr}`
            : refundErr
          : prevRemark,
      },
    });

    if (updateResult.count === 0) {
      throw new BadRequestException('售后状态已变更，请勿重复操作');
    }

    return {
      id: a.id,
      status: nextStatus,
      refundNo,
      refundStatus,
    };
  }

  /** 售后格式化：分→元、解析 evidenceImages、补 goodsTitle/orderSn/user。 */
  private formatAftersale(a: any, detail = false) {
    const items = a.order?.items || [];
    const matched = a.orderItemId ? items.find((i: any) => i.id === a.orderItemId) : null;
    const base: any = {
      id: a.id,
      aftersaleSn: a.aftersaleSn,
      orderId: a.orderId,
      orderSn: a.order?.orderSn || '',
      userId: a.userId,
      user: a.user || null,
      orderItemId: a.orderItemId,
      goodsTitle: matched?.goodTitle || items[0]?.goodTitle || '',
      type: a.type,
      reason: a.reason,
      description: a.description || '',
      evidenceImages: parseAftersaleImages(a.evidenceImages),
      refundAmount: centToYuan(a.refundAmount),
      refundNo: a.refundNo || '',
      refundId: a.refundId || '',
      refundStatus: a.refundStatus || '',
      adminRemark: a.adminRemark || '',
      status: a.status,
      createdAt: a.createdAt,
    };
    if (detail && a.order) {
      base.order = {
        orderSn: a.order.orderSn,
        status: a.order.status,
        payAmount: centToYuan(a.order.payAmount),
        createdAt: a.order.createdAt,
        address: a.order.address,
        items: a.order.items.map((i: any) => ({ ...i, price: centToYuan(i.price) })),
      };
    }
    return base;
  }
}

/**
 * 归一化折扣率：null/undefined → null（无折扣）；
 * 数字需在 (0,1] 区间（0 无意义视为无折扣）；越界抛错。
 */
function normalizeDiscountRate(rate: any): number | null {
  if (rate === null || rate === undefined || rate === '') return null;
  const n = Number(rate);
  if (!Number.isFinite(n)) {
    throw new BadRequestException('折扣率必须为数字');
  }
  if (n <= 0) return null;
  if (n > 1) {
    throw new BadRequestException('折扣率需在 0~1 之间（如 0.8 表示 8 折）');
  }
  return n;
}

/** 售后 status 过滤解析：别名 → 状态集合；数字 → 精确；未知/全部 → undefined。 */
function resolveAftersaleStatusFilter(status?: string): number[] | undefined {
  if (!status || status === 'all') return undefined;
  const alias: Record<string, number[]> = {
    pending: [0],
    approved: [1],
    rejected: [2],
    refunded: [4],
    done: [4, 5],
  };
  if (alias[status]) return alias[status];
  const n = Number(status);
  if (Number.isInteger(n) && n >= 0 && n <= 5) return [n];
  return undefined;
}

/** evidenceImages 为 MySQL 原生 JSON，读取时直接作为数组。 */
function parseAftersaleImages(raw: any): string[] {
  if (!raw) return [];
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

