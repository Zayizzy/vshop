import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// 开发期密钥；生产应通过环境变量 JWT_SECRET 注入（见 main.ts bootstrap）
const JWT_SECRET = process.env.JWT_SECRET || 'vshop-dev-secret-change-me';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
