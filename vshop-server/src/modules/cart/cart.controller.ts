import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from '../../common/dto';

interface AuthedRequest extends Request {
  user: { userId: string };
}

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req: AuthedRequest) {
    const data = await this.cartService.getCart(req.user.userId);
    return { code: 0, message: 'success', data };
  }

  @Post()
  async addItem(
    @Body() body: AddCartItemDto,
    @Req() req: AuthedRequest,
  ) {
    const data = await this.cartService.addItem(req.user.userId, body.skuId, body.quantity);
    return { code: 0, message: 'success', data };
  }

  @Put('update')
  async updateQuantity(
    @Body() body: UpdateCartItemDto,
    @Req() req: AuthedRequest,
  ) {
    const data = await this.cartService.updateQuantity(req.user.userId, body.skuId, body.quantity);
    return { code: 0, message: 'success', data };
  }

  @Delete('clear')
  async clearCart(@Req() req: AuthedRequest) {
    const data = await this.cartService.clearCart(req.user.userId);
    return { code: 0, message: 'success', data };
  }

  @Get('count')
  async getCount(@Req() req: AuthedRequest) {
    const data = await this.cartService.getCount(req.user.userId);
    return { code: 0, message: 'success', data };
  }
}
