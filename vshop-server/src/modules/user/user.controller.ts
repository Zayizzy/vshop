import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { CreateAddressDto, UpdateAddressDto } from '../../common/dto';

interface AuthedRequest extends Request {
  user: { userId: string };
}

@Controller('addresses')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getList(@Req() req: AuthedRequest) {
    const data = await this.userService.getAddresses(req.user.userId);
    return { code: 0, message: 'success', data };
  }

  @Post()
  async create(
    @Body() body: CreateAddressDto,
    @Req() req: AuthedRequest,
  ) {
    const data = await this.userService.createAddress(req.user.userId, body);
    return { code: 0, message: 'success', data };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateAddressDto,
    @Req() req: AuthedRequest,
  ) {
    // 越权防护：仅地址归属人可修改
    const data = await this.userService.updateAddress(req.user.userId, id, body);
    return { code: 0, message: 'success', data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: AuthedRequest) {
    // 越权防护：仅地址归属人可删除
    const data = await this.userService.deleteAddress(req.user.userId, id);
    return { code: 0, message: 'success', data };
  }
}
