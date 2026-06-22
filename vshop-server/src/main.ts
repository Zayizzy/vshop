import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { join } from 'path';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();

  // 全局参数校验：未通过校验的字段直接返回 400
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 剥离 DTO 未声明的字段（防注入额外参数）
      forbidNonWhitelisted: true,
      transform: true, // 路径/查询参数自动转为声明类型
    }),
  );

  // 全局 JWT 鉴权：默认所有接口需登录，@Public() 豁免
  const reflector = app.get(Reflector);
  app.useGlobalGuards(
    new JwtAuthGuard(app.get(JwtService), reflector, app.get(PrismaService)),
  );

  // 统一异常响应结构 { code, message, data }
  app.useGlobalFilters(new AllExceptionsFilter());

  // Mobile API prefix
  app.setGlobalPrefix('v1', {
    exclude: ['api/admin/(.*)', 'admin/(.*)'],
  });

  // Serve admin static files with no-cache headers
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/admin',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
    },
  });

  // Serve shared assets (images from miniprogram)
  app.useStaticAssets(join(__dirname, '..', '..', 'miniprogram', 'assets'), { prefix: '/assets' });

  await app.listen(3000);
  console.log('鲜到家服务已启动: http://localhost:3000');
  console.log('供应商后台: http://localhost:3000/admin');
}
bootstrap();
