import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * C 端客服在线留言。
 *
 * 模型：一个用户可有多个会话（每个商品咨询可独立一个会话），
 * 会话内消息分 user / admin 两种发送方。
 * 未读计数：userUnread（客服回了用户没看）、adminUnread（用户发了客服没看）。
 * 实时性用前端轮询实现，本服务不引入 websocket。
 */
@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  /** 创建或复用会话。同一用户 + 同一商品复用同一会话；无商品则每次新建。 */
  async createOrGetSession(userId: string, body: { goodId?: string; title?: string }) {
    let title = body.title?.trim() || '客服咨询';
    let goodId = body.goodId || null;

    // 带商品时复用该商品未关闭的会话；商品名补做标题
    if (goodId) {
      const good = await this.prisma.good.findUnique({
        where: { id: goodId },
        select: { name: true },
      });
      if (!good) throw new BadRequestException('商品不存在');
      title = body.title?.trim() || good.name;
      const existing = await this.prisma.chatSession.findFirst({
        where: { userId, goodId, closed: false },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) return this.formatSession(existing);
    }

    const session = await this.prisma.chatSession.create({
      data: { userId, goodId, title },
    });
    return this.formatSession(session);
  }

  /** 当前用户的会话列表（最近活跃在前）。 */
  async listSessions(userId: string) {
    const list = await this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { lastAt: 'desc' },
    });
    return list.map((s) => this.formatSession(s));
  }

  /** 会话消息列表（校验归属当前用户）。 */
  async listMessages(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) {
      throw new BadRequestException('会话不存在');
    }
    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    return {
      session: this.formatSession(session),
      messages: messages.map((m) => this.formatMessage(m)),
    };
  }

  /** 用户发消息：写消息 + 更新会话最近消息/时间 + adminUnread++。 */
  async sendMessage(userId: string, sessionId: string, content: string) {
    const text = (content || '').trim();
    if (!text) throw new BadRequestException('消息内容不能为空');
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) {
      throw new BadRequestException('会话不存在');
    }
    if (session.closed) throw new BadRequestException('会话已关闭');

    const [msg] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: { sessionId, sender: 'user', content: text },
      }),
      this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { lastMessage: text, lastAt: new Date(), adminUnread: { increment: 1 } },
      }),
    ]);
    return this.formatMessage(msg);
  }

  /** 用户进入会话查看：清零 userUnread。 */
  async markRead(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) {
      throw new BadRequestException('会话不存在');
    }
    const updated = await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { userUnread: 0 },
    });
    return this.formatSession(updated);
  }

  private formatSession(s: any) {
    return {
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
    };
  }

  private formatMessage(m: any) {
    return {
      id: m.id,
      sessionId: m.sessionId,
      sender: m.sender,
      content: m.content,
      createdAt: m.createdAt,
    };
  }
}
