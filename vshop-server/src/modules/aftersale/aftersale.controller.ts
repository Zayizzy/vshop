import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AftersaleService } from './aftersale.service';
import { CreateAftersaleDto } from '../../common/dto';

interface AuthedRequest extends Request {
  user: { userId: string };
}

/**
 * C 端售后 / 退货退款接口（挂 /v1/aftersales，需登录）。
 * 与小程序 subpackages/order/pages/aftersale 既有调用契约对齐。
 */
@Controller('aftersales')
export class AftersaleController {
  constructor(private readonly aftersaleService: AftersaleService) {}

  /** 创建售后申请 */
  @Post()
  async create(@Req() req: AuthedRequest, @Body() body: CreateAftersaleDto) {
    const data = await this.aftersaleService.create(req.user.userId, body);
    return { code: 0, message: 'success', data };
  }

  /** 当前用户售后列表 */
  @Get()
  async list(
    @Req() req: AuthedRequest,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const data = await this.aftersaleService.list(req.user.userId, {
      status,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
    return { code: 0, message: 'success', data };
  }

  /** 售后详情 */
  @Get(':id')
  async detail(@Req() req: AuthedRequest, @Param('id') id: string) {
    const data = await this.aftersaleService.getDetail(req.user.userId, id);
    return { code: 0, message: 'success', data };
  }

  /** 撤回售后申请（仅待审核） */
  @Post(':id/cancel')
  async cancel(@Req() req: AuthedRequest, @Param('id') id: string) {
    const data = await this.aftersaleService.cancel(req.user.userId, id);
    return { code: 0, message: 'success', data };
  }
}
