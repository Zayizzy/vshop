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
import { OrderService } from './order.service';
import { CreateOrderDto, OrderIdDto } from '../../common/dto';

interface AuthedRequest extends Request {
  user: { userId: string };
}

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('stats')
  async getStats(@Req() req: AuthedRequest) {
    const data = await this.orderService.getStats(req.user.userId);
    return { code: 0, message: 'success', data };
  }

  @Get()
  async getList(
    @Req() req: AuthedRequest,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const data = await this.orderService.getList(req.user.userId, {
      status,
      startDate,
      endDate,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 10,
    });
    return { code: 0, message: 'success', data };
  }

  @Get('export')
  async exportOrders(
    @Req() req: AuthedRequest,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.orderService.exportOrders(req.user.userId, {
      status,
      startDate,
      endDate,
    });
    return { code: 0, message: 'success', data };
  }

  @Get(':id')
  async getDetail(@Req() req: AuthedRequest, @Param('id') id: string) {
    // 越权防护：仅订单归属人可查看
    const data = await this.orderService.getDetail(id, req.user.userId);
    return { code: 0, message: 'success', data };
  }

  @Post()
  async createOrder(
    @Req() req: AuthedRequest,
    @Body() body: CreateOrderDto,
  ) {
    const data = await this.orderService.createOrder(req.user.userId, body);
    return { code: 0, message: 'success', data };
  }

  @Post('confirm')
  async confirmReceipt(
    @Req() req: AuthedRequest,
    @Body() body: OrderIdDto,
  ) {
    // 越权防护：仅订单归属人可确认收货
    const data = await this.orderService.confirmReceipt(
      body.orderId,
      req.user.userId,
    );
    return { code: 0, message: 'success', data };
  }

  @Post('rebuy')
  async rebuy(
    @Req() req: AuthedRequest,
    @Body() body: OrderIdDto,
  ) {
    // 越权防护：仅订单归属人可再次购买
    const data = await this.orderService.rebuy(req.user.userId, body.orderId);
    return { code: 0, message: 'success', data };
  }

  @Get(':orderId/packages/:packageIndex/logistics')
  async getLogistics(
    @Req() req: AuthedRequest,
    @Param('orderId') orderId: string,
    @Param('packageIndex') packageIndex: string,
  ) {
    // 越权防护：仅订单归属人可查看物流
    const data = await this.orderService.getLogistics(
      orderId,
      Number(packageIndex),
      req.user.userId,
    );
    return { code: 0, message: 'success', data };
  }
}
