import { Controller, Get, Post, Put, Body, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { SupportService } from './support.service';

interface AuthedRequest extends Request {
  user: { userId: string };
}

/**
 * C 端客服在线留言接口（挂 /v1/support，需登录）。
 * 进入会话后前端轮询 GET messages 拉取客服回复。
 */
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /** 创建或复用会话：{ goodId?, title? } */
  @Post('sessions')
  async createSession(@Req() req: AuthedRequest, @Body() body: { goodId?: string; title?: string }) {
    const data = await this.supportService.createOrGetSession(req.user.userId, body);
    return { code: 0, message: 'success', data };
  }

  /** 当前用户会话列表 */
  @Get('sessions')
  async listSessions(@Req() req: AuthedRequest) {
    const data = await this.supportService.listSessions(req.user.userId);
    return { code: 0, message: 'success', data };
  }

  /** 会话消息列表 */
  @Get('sessions/:id/messages')
  async listMessages(@Req() req: AuthedRequest, @Param('id') id: string) {
    const data = await this.supportService.listMessages(req.user.userId, id);
    return { code: 0, message: 'success', data };
  }

  /** 用户发消息：{ content } */
  @Post('sessions/:id/messages')
  async sendMessage(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: { content: string },
  ) {
    const data = await this.supportService.sendMessage(req.user.userId, id, body.content);
    return { code: 0, message: 'success', data };
  }

  /** 标记会话已读（清零 userUnread） */
  @Put('sessions/:id/read')
  async markRead(@Req() req: AuthedRequest, @Param('id') id: string) {
    const data = await this.supportService.markRead(req.user.userId, id);
    return { code: 0, message: 'success', data };
  }
}
