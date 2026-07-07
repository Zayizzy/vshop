import {
  Controller,
  Get,
  Put,
  Body,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { UpdateUserProfileDto } from '../../common/dto';

interface AuthedRequest extends Request {
  user: { userId: string };
}

@Controller('user')
export class UserInfoController {
  constructor(private readonly userService: UserService) {}

  @Get('info')
  async getInfo(@Req() req: AuthedRequest) {
    const data = await this.userService.getUserInfo(req.user.userId);
    return { code: 0, message: 'success', data };
  }

  @Put('profile')
  async updateProfile(
    @Req() req: AuthedRequest,
    @Body() body: UpdateUserProfileDto,
  ) {
    const data = await this.userService.updateProfile(req.user.userId, body);
    return { code: 0, message: 'success', data };
  }
}
