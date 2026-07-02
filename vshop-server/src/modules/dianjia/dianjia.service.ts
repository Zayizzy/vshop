import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DianjiaClient } from './dianjia.client';
import { dianjiaConfig } from './dianjia.config';
import { formatSpecText } from '../../common/utils/spec';

/**
 * 店管家代发业务服务。
 *
 * 出向：uploadOrder —— 订单支付成功后把订单推给店管家（路由给绑定厂家发货）。
 * 入向：handleSendNotify —— 厂家发货后店管家回推快递单号，回写 OrderPackage + 推进订单状态。
 *
 * 金额单位：店管家「分」，与本项目一致，零转换。
 * 异步：markPaid 后 fire-and-forget 触发 uploadOrder，失败仅记日志，不阻断支付。
 */
@Injectable()
export class DianjiaService {
  constructor(
    private prisma: PrismaService,
    private dianjia: DianjiaClient,
  ) {}

  /**
   * 订单上传 trade/order/upload。
   * 幂等：dianjiaSyncStatus='synced' 且非 force → 跳过（避免重复同步）。
   * 成功 → 写 platformOrderId + dianjiaSyncStatus='synced' + dianjiaSyncedAt；
   * 失败 → 写 dianjiaSyncStatus='failed'（便于批量重试）。
   */
  async uploadOrder(
    orderId: string,
    opts?: { force?: boolean },
  ): Promise<{ platformOrderId?: string; skipped?: boolean }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        address: true,
        payment: true,
      },
    });
    if (!order) {
      console.error('[dianjia] uploadOrder: 订单不存在', orderId);
      return {};
    }
    // 幂等：已同步且非强制 → 跳过，避免重复推送
    if (order.dianjiaSyncStatus === 'synced' && !opts?.force) {
      return { platformOrderId: order.platformOrderId || undefined, skipped: true };
    }

    if (this.dianjia.mock) {
      const mockId = 'mock_' + order.orderSn;
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          platformOrderId: mockId,
          dianjiaSyncStatus: 'synced',
          dianjiaSyncedAt: new Date(),
        },
      });
      return { platformOrderId: mockId };
    }

    if (!order.address) {
      console.error('[dianjia] uploadOrder: 订单无收货地址', orderId);
      await this.markSyncFailed(orderId, '无收货地址');
      return {};
    }

    const payload = { order: this.buildOrderPayload(order) };
    try {
      const data: any = await this.dianjia.execute('trade/order/upload', payload);
      const platformOrderId = data?.platformOrderId || data?.PlatformOrderId;
      if (platformOrderId) {
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            platformOrderId,
            dianjiaSyncStatus: 'synced',
            dianjiaSyncedAt: new Date(),
          },
        });
      }
      return { platformOrderId };
    } catch (e) {
      console.error('[dianjia] uploadOrder 失败', orderId, e);
      await this.markSyncFailed(orderId, e instanceof Error ? e.message : String(e));
      return {};
    }
  }

  /** 标记同步失败（便于后续批量重试）。 */
  private async markSyncFailed(orderId: string, reason: string) {
    try {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { dianjiaSyncStatus: 'failed', dianjiaSyncedAt: new Date() },
      });
    } catch {
      // ignore
    }
  }

  /**
   * 批量同步已支付订单到店管家。串行执行避免触发频控（60/min）。
   * 查询所有已支付订单，由 uploadOrder 幂等性跳过已同步的（返回 skipped），
   * force=true 则全量重传（含已同步）。
   */
  async syncAllOrders(opts?: { force?: boolean }): Promise<{
    total: number;
    synced: number;
    skipped: number;
    failed: number;
  }> {
    const orders = await this.prisma.order.findMany({
      where: {
        // 仅已支付订单（发货中/待收货/已完成）需代发
        status: { in: ['shipping', 'receiving', 'done'] },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    let synced = 0;
    let skipped = 0;
    let failed = 0;
    for (const o of orders) {
      const r = await this.uploadOrder(o.id, opts);
      if (r.skipped) skipped++;
      else if (r.platformOrderId) synced++;
      else failed++;
    }
    return { total: orders.length, synced, skipped, failed };
  }

  /** 读取自动同步开关（AppSetting.dianjia_auto_sync，默认 true）。 */
  async getAutoSync(): Promise<boolean> {
    const row = await this.prisma.appSetting.findUnique({
      where: { key: 'dianjia_auto_sync' },
    });
    if (!row) return true; // 默认开启
    return row.value === 'true';
  }

  /** 设置自动同步开关。 */
  async setAutoSync(enabled: boolean): Promise<boolean> {
    await this.prisma.appSetting.upsert({
      where: { key: 'dianjia_auto_sync' },
      create: { key: 'dianjia_auto_sync', value: String(enabled) },
      update: { value: String(enabled) },
    });
    return enabled;
  }

  /**
   * 商品同步 product/items/upload：把鲜到家商品推到店管家。
   * 幂等：已同步（任一 sku.platformSkuId 存在）则跳过。
   * 返回 { synced }：本次回写的 sku 数。
   */
  async syncGood(goodId: string): Promise<{ synced: number; skipped?: boolean }> {
    const good = await this.prisma.good.findUnique({
      where: { id: goodId },
      include: {
        skus: true,
        images: { orderBy: { sort: 'asc' } },
      },
    });
    if (!good) {
      console.error('[dianjia] syncGood: 商品不存在', goodId);
      return { synced: 0 };
    }
    if (!good.skus.length) {
      console.warn('[dianjia] syncGood: 商品无 sku，跳过', goodId);
      return { synced: 0, skipped: true };
    }
    // 幂等：任一 sku 已有 platformSkuId → 视为已同步
    if (good.skus.some((s) => s.platformSkuId)) {
      return { synced: 0, skipped: true };
    }

    if (this.dianjia.mock) {
      // mock：给每个 sku 落 mock_<id>，验证回写链路
      await this.prisma.sku.updateMany({
        where: { goodId },
        data: { platformSkuId: 'mock_' + goodId },
      });
      return { synced: good.skus.length };
    }

    const payload = { product: this.buildProductPayload(good) };
    try {
      const data: any = await this.dianjia.execute(
        'product/items/upload',
        payload,
      );
      // 响应 data.id 为商品级平台 id；暂存到该 Good 所有 sku 的 platformSkuId（代发对账用）
      const platformId = String(data?.id ?? '');
      if (platformId) {
        await this.prisma.sku.updateMany({
          where: { goodId },
          data: { platformSkuId: platformId },
        });
      }
      return { synced: good.skus.length };
    } catch (e) {
      console.error('[dianjia] syncGood 失败', goodId, e);
      return { synced: 0 };
    }
  }

  /** 批量同步所有在售商品。串行执行避免触发频控（60/min）。 */
  async syncAllGoods(): Promise<{
    total: number;
    synced: number;
    skipped: number;
    failed: number;
  }> {
    const goods = await this.prisma.good.findMany({
      where: { status: 'active' },
      select: { id: true },
    });
    let synced = 0;
    let skipped = 0;
    let failed = 0;
    for (const g of goods) {
      const r = await this.syncGood(g.id);
      if (r.skipped) skipped++;
      else if (r.synced > 0) synced++;
      else failed++;
    }
    return { total: goods.length, synced, skipped, failed };
  }

  /**
   * 库存同步：从店管家拉厂家库存回写鲜到家。
   * @param skuId 可选，指定单个 sku；不传则同步所有已同步(有 platformSkuId)的 sku。
   * 店管家 inventory/stock/list 按 skuCargoNumber(=鲜到家 sku.id) 查询，
   * 响应 rows[].Items[].StockCount 回写 GoodSupplier.stock（库存权威来源）+ Sku.stock。
   */
  async syncStock(skuId?: string): Promise<{
    total: number;
    updated: number;
    notFound: number;
  }> {
    // 取待同步 sku（需有 GoodSupplier 关联，库存回写落点）
    const where: any = {};
    if (skuId) where.id = skuId;
    const skus = await this.prisma.sku.findMany({
      where,
      include: { suppliers: { where: { status: 'active' } } },
    });
    let updated = 0;
    let notFound = 0;

    for (const sku of skus) {
      const gs = sku.suppliers[0];
      if (!gs) {
        notFound++;
        continue;
      }

      let stockCount: number | null = null;
      if (this.dianjia.mock) {
        // mock：用一个稳定的伪值（基于 sku.id 哈希，避免 Math.random 不可用问题——此处为运行时非脚本，random 可用，但用哈希更稳定）
        stockCount = this.mockStock(sku.id);
      } else {
        try {
          const data: any = await this.dianjia.execute(
            'inventory/stock/list',
            {
              skuCargoNumber: sku.id, // 规格编码 = 同步时的 outerId
              IsCombination: 0,
              pageSize: 10,
              page: 1,
            },
          );
          // 响应兼容大小写：rows/Rows，找匹配 skuCargoNumber 的 StockCount
          const rows = data?.rows || data?.Rows || [];
          stockCount = this.extractStock(rows, sku.id);
        } catch (e) {
          console.error('[dianjia] syncStock 查询失败', sku.id, e);
        }
      }

      if (stockCount != null && stockCount >= 0) {
        await this.prisma.$transaction([
          this.prisma.goodSupplier.update({
            where: { id: gs.id },
            data: { stock: stockCount },
          }),
          this.prisma.sku.update({
            where: { id: sku.id },
            data: { stock: stockCount },
          }),
        ]);
        updated++;
      } else {
        notFound++;
      }
    }

    return { total: skus.length, updated, notFound };
  }

  /** 从店管家库存响应 rows 中提取匹配 skuCargoNumber 的 StockCount。 */
  private extractStock(rows: any[], skuId: string): number | null {
    for (const row of rows) {
      const items = row.Items || row.items || [];
      const matched = items.find(
        (it: any) =>
          it.SkuCargoNumber === skuId || it.skuCargoNumber === skuId,
      );
      const count = matched?.StockCount ?? matched?.stockCount;
      if (count != null) return Number(count);
    }
    return null;
  }

  /** mock 库存值：基于 sku.id 字符串生成稳定伪随机（0~99）。 */
  private mockStock(skuId: string): number {
    let h = 0;
    for (let i = 0; i < skuId.length; i++) {
      h = (h * 31 + skuId.charCodeAt(i)) >>> 0;
    }
    return h % 100;
  }

  /** 组装店管家 Product 对象（鲜到家 Good → 店管家 Product）。 */
  private buildProductPayload(good: any): any {
    const picUrl = good.images[0]?.url || '';
    return {
      shopId: Number(dianjiaConfig.shopId) || 0,
      name: good.name,
      picUrl,
      outerId: good.id, // 鲜到家内部编码（对账用）
      price: good.skus[0].price, // 分，商品主价 = 首个 sku
      status: good.status === 'active' ? 1 : 0,
      skus: good.skus.map((s: any) => ({
        // id 不传（首次上传）；更新场景未支持
        name: formatSpecText(s.specValues, s.name), // 多维规格拼串 "红色 / 500g"
        picUrl, // sku 图暂用商品主图
        outerId: s.id, // 鲜到家 sku 编码
        price: s.price, // 分
      })),
    };
  }

  /** 组装店管家 Order 对象（鲜到家 Order → 店管家 Order）。 */
  private buildOrderPayload(order: any): any {
    const addr = order.address;
    return {
      shopId: Number(dianjiaConfig.shopId) || 0,
      totalAmount: order.payAmount, // 分
      createTime: this.fmtTime(order.createdAt),
      payTime: order.payment?.payTime ? this.fmtTime(order.payment.payTime) : this.fmtTime(new Date()),
      status: 'WAIT_SELLER_SEND', // 已支付待发货
      toName: addr.name,
      toMobile: addr.phone,
      toProvince: addr.province,
      toCity: addr.city,
      toCounty: addr.district,
      toStreet: addr.detail,
      outPlatformOrderNo: order.orderSn, // 平台单号 = 鲜到家订单号
      fromEncryptOrder: false, // 非密文单
      items: order.items.map((it: any) => ({
        id: it.id,
        name: it.goodTitle,
        skuId: it.skuId,
        skuName: it.specName || '',
        quantity: it.quantity,
        itemAmount: it.price * it.quantity, // 分
        status: 'WAIT_SELLER_SEND',
      })),
    };
  }

  /**
   * 发货回调 all.order.send。
   * 验签 → 解析 Param（数组）→ 回写 OrderPackage 快递号 + 推进订单状态。
   * 返回 { status:'SUCCESS'|'FAIL' }（店管家据 HttpStatus 200 + SUCCESS 判定成功，失败会重试）。
   */
  async handleSendNotify(body: any): Promise<{ status: 'SUCCESS' | 'FAIL' }> {
    try {
      if (this.dianjia.mock) {
        // 开发期无真实推送，直接回 SUCCESS
        return { status: 'SUCCESS' };
      }
      // 验签：Sign = createSign({AppKey, TimeStamp, MsgType, Param}, secret)
      const sign = this.dianjia.computeSign(
        {
          AppKey: body?.AppKey || '',
          TimeStamp: String(body?.TimeStamp ?? ''),
          MsgType: body?.MsgType || '',
          Param: body?.Param || '',
        },
        dianjiaConfig.appSecret,
      );
      if (!sign || sign !== body?.Sign) {
        console.error('[dianjia] send-notify 验签失败');
        return { status: 'FAIL' };
      }
      // Param 为消息体 JSON 串（数组）
      let rows: any[] = [];
      try {
        const parsed = JSON.parse(body?.Param || '[]');
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        rows = [];
      }
      for (const r of rows) {
        await this.applySendRow(r);
      }
      return { status: 'SUCCESS' };
    } catch (e) {
      console.error('[dianjia] send-notify 处理异常', e);
      return { status: 'FAIL' };
    }
  }

  /** 单条发货通知：定位订单 → 回写首个包裹快递号 + 推进状态。 */
  private async applySendRow(r: any) {
    const platformOrderId = r.PlatformOrderId || r.platformOrderId;
    const logicOrderId = r.LogicOrderId || r.logicOrderId;
    const expressCode = r.ExpressCode || r.expressCode || '';
    const expressNumber = r.ExpressNumber || r.expressNumber || '';
    const isAllDelivered = r.IsAllDelivered ?? r.isAllDelivered ?? false;

    // 优先用 platformOrderId(=鲜到家orderSn) 定位，其次落库的 platformOrderId(=logicOrderId)
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { orderSn: platformOrderId || '' },
          { platformOrderId: logicOrderId || platformOrderId || '' },
        ],
      },
      include: { packages: { orderBy: { id: 'asc' } } },
    });
    if (!order) {
      console.warn('[dianjia] send-notify 未匹配到订单', { platformOrderId, logicOrderId });
      return;
    }

    // 回写首个包裹（P1 单包裹场景；多包裹后续按 logicOrderId 精确匹配）
    const pkg = order.packages[0];
    if (pkg) {
      await this.prisma.orderPackage.update({
        where: { id: pkg.id },
        data: {
          expressCompany: expressCode,
          expressNo: expressNumber,
          status: 2, // 已发货
        },
      });
    }

    // 全部发货且订单待发货 → 推进到待收货
    if (isAllDelivered && order.status === 'shipping') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'receiving' },
      });
    }
  }

  /** Date → "YYYY-MM-DD HH:mm:ss"（店管家 createTime 格式）。 */
  private fmtTime(d: Date | string): string {
    const dt = d instanceof Date ? d : new Date(d);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
  }
}
