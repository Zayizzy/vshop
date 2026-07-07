import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserInfoController } from './user-info.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController, UserInfoController],
  providers: [UserService],
})
export class UserModule {}
