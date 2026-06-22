import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { KocService } from './koc.service';

interface AuthedRequest extends Request {
  user: { userId: string };
}

@Controller('koc')
export class KocController {
  constructor(private readonly kocService: KocService) {}

  @Get('status')
  async getStatus(@Req() req: AuthedRequest) {
    const data = await this.kocService.getStatus(req.user.userId);
    return { code: 0, message: 'success', data };
  }

  @Get('dashboard')
  async getDashboard(@Req() req: AuthedRequest) {
    const data = await this.kocService.getDashboard(req.user.userId);
    return { code: 0, message: 'success', data };
  }

  @Post('register')
  async register(
    @Req() req: AuthedRequest,
    @Body() body: { realName: string; phone: string; socialAccount?: string; introduction?: string },
  ) {
    const data = await this.kocService.register(req.user.userId, body);
    return { code: 0, message: 'success', data };
  }
}
