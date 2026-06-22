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
import { GoodsService } from './goods.service';
import { Public } from '../../common/guards/public.decorator';
import { ToggleFavoriteDto } from '../../common/dto';

interface AuthedRequest extends Request {
  user: { userId: string };
}

// 商品浏览类接口（list/search/detail）公开访问；collect 收藏需登录，故不加 @Public
@Controller('goods')
export class GoodsController {
  constructor(private readonly goodsService: GoodsService) {}

  @Public()
  @Get('list')
  async getList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sort') sort?: string,
  ) {
    const data = await this.goodsService.getList({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 10,
      categoryId,
      sort,
    });
    return { code: 0, message: 'success', data };
  }

  @Public()
  @Get('search')
  async search(
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const data = await this.goodsService.search({
      keyword: keyword || '',
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 10,
    });
    return { code: 0, message: 'success', data };
  }

  @Public()
  @Get(':id')
  async getDetail(@Param('id') id: string) {
    const data = await this.goodsService.getDetail(id);
    return { code: 0, message: 'success', data };
  }

  // 收藏需登录（无 @Public，走全局 JWT Guard）
  @Post('collect')
  async toggleFavorite(
    @Body() body: ToggleFavoriteDto,
    @Req() req: AuthedRequest,
  ) {
    const data = await this.goodsService.toggleFavorite(
      req.user.userId,
      body.goodId,
      body.isCollected,
    );
    return { code: 0, message: 'success', data };
  }
}
