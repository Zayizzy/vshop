import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { centToYuan, yuanToCent } from '../../common/utils/money';
import { CreateAftersaleDto } from '../../common/dto';

/**
 * C 端售后 / 退货退款服务。
 *
 * 状态机（与小程序 aftersale statusMap 完全对齐）：
 *   0 待审核 → 1 已同意 / 2 已拒绝（后台审核）
 *   1 已同意 → 4 已退款（后台确认退款，生成 refundNo）= 财务终态
 *   3 退款中、5 已完成：前端 statusMap 已含，暂不单独建流转动作。
 * 撤回（cancel）：仅 status===0 允许 → 删除记录（未审核申请撤回即消失）。
 *
 * 金额：库内「分」(Int)，边界 yuanToCent / centToYuan。
 * evidenceImages：SQLite 不支持标量列表，以 JSON 字符串存储，出入边界 parse/stringify。
 * 越权防护：list / detail / cancel 均校验归属当前用户。
 */
@Injectable()
export class AftersaleService {
  constructor(private prisma: PrismaService) {}

  /** 创建售后申请。 */
  async create(userId: string, dto: CreateAftersaleDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: { select: { id: true, goodTitle: true } } },
    });
    if (!order) throw new NotFoundException('订单不存在');
    // 越权防护
    if (order.userId !== userId) {
      throw new ForbiddenException('无权操作该订单');
    }
    // 仅已支付（发货后）的订单可申请售后
    if (!['shipping', 'receiving', 'done'].includes(order.status)) {
      throw new BadRequestException('订单当前状态不支持售后申请');
    }

    const refundCent = yuanToCent(dto.refundAmount);
    if (refundCent <= 0) {
      throw new BadRequestException('退款金额必须大于 0');
    }
    if (refundCent > order.payAmount) {
      throw new BadRequestException(
        `退款金额不能超过订单实付金额 ${centToYuan(order.payAmount)} 元`,
      );
    }

    // 关联明细校验（若指定 orderItemId，需属于该订单）
    const orderItemId = dto.orderItemId || null;
    if (orderItemId) {
      const belongs = order.items.some((i) => i.id === orderItemId);
      if (!belongs) {
        throw new BadRequestException('售后商品不属于该订单');
      }
    }

    // 同一订单已有进行中的售后则禁止重复申请
    const active = await this.prisma.aftersale.findFirst({
      where: { orderId: order.id, status: { in: [0, 1, 3] } },
    });
    if (active) {
      throw new BadRequestException('该订单已有进行中的售后申请');
    }

    const aftersaleSn = `AS${Date.now()}${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    const created = await this.prisma.aftersale.create({
      data: {
        aftersaleSn,
        userId,
        orderId: order.id,
        orderItemId,
        packageIndex: dto.packageIndex ?? 0,
        type: dto.type,
        reason: dto.reason,
        description: dto.description || null,
        evidenceImages: JSON.stringify(dto.evidenceImages || []),
        refundAmount: refundCent,
        status: 0,
      },
    });

    return { id: created.id, aftersaleSn: created.aftersaleSn };
  }

  /** 当前用户售后列表。status 可为数字或别名 pending/approved/done。 */
  async list(
    userId: string,
    params: { status?: string; page: number; pageSize: number },
  ) {
    const { status, page, pageSize } = params;
    const where: Prisma.AftersaleWhereInput = { userId };
    const statusIn = resolveStatusFilter(status);
    if (statusIn) where.status = { in: statusIn };

    const [rows, total] = await Promise.all([
      this.prisma.aftersale.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          order: {
            select: { orderSn: true, items: { select: { id: true, goodTitle: true } } },
          },
        },
      }),
      this.prisma.aftersale.count({ where }),
    ]);

    const list = rows.map((a) => this.format(a));
    return {
      list,
      total,
      page,
      pageSize,
      hasMore: page < Math.ceil(total / pageSize),
    };
  }

  /** 售后详情（归属校验）。 */
  async getDetail(userId: string, id: string) {
    const a = await this.prisma.aftersale.findUnique({
      where: { id },
      include: {
        order: {
          select: { orderSn: true, items: { select: { id: true, goodTitle: true } } },
        },
      },
    });
    if (!a) throw new NotFoundException('售后记录不存在');
    if (a.userId !== userId) {
      throw new ForbiddenException('无权查看该售后记录');
    }
    return this.format(a);
  }

  /** 撤回售后申请（仅待审核）。 */
  async cancel(userId: string, id: string) {
    const a = await this.prisma.aftersale.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });
    if (!a) throw new NotFoundException('售后记录不存在');
    if (a.userId !== userId) {
      throw new ForbiddenException('无权操作该售后记录');
    }
    if (a.status !== 0) {
      throw new BadRequestException('当前状态不可撤回');
    }
    await this.prisma.aftersale.delete({ where: { id } });
    return { id };
  }

  /** 统一格式化：分→元、解析 evidenceImages、补 goodsTitle/orderSn。 */
  private format(a: any) {
    const items = a.order?.items || [];
    const matched = a.orderItemId
      ? items.find((i: any) => i.id === a.orderItemId)
      : null;
    return {
      id: a.id,
      aftersaleSn: a.aftersaleSn,
      orderId: a.orderId,
      orderItemId: a.orderItemId,
      orderSn: a.order?.orderSn || '',
      goodsTitle: matched?.goodTitle || items[0]?.goodTitle || '',
      type: a.type,
      reason: a.reason,
      description: a.description || '',
      evidenceImages: parseImages(a.evidenceImages),
      refundAmount: centToYuan(a.refundAmount),
      refundNo: a.refundNo || '',
      refundId: a.refundId || '',
      refundStatus: a.refundStatus || '',
      adminRemark: a.adminRemark || '',
      status: a.status,
      createdAt: a.createdAt,
    };
  }
}

/** 前端列表 status 别名 → 后端状态集合。数字则精确匹配；无/未知返回 undefined（全部）。 */
function resolveStatusFilter(status?: string): number[] | undefined {
  if (!status || status === 'all') return undefined;
  const alias: Record<string, number[]> = {
    pending: [0],
    approved: [1],
    done: [4, 5],
  };
  if (alias[status]) return alias[status];
  const n = Number(status);
  if (Number.isInteger(n) && n >= 0 && n <= 5) return [n];
  return undefined;
}

/** evidenceImages 入库为 JSON 字符串，读取时还原为数组。 */
function parseImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
