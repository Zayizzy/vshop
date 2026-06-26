import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Public } from '../../common/guards/public.decorator';

/**
 * 图片上传接口（admin 商品图等）。
 *
 * 文件存到 public/uploads/goods/，访问 URL 为 /admin/uploads/goods/<文件名>
 * （public 目录已被 main.ts 以 /admin 前缀暴露为静态资源）。
 *
 * 限制：仅图片（jpg/jpeg/png/webp/gif/heic/heif/bmp 或 image/*），单文件 ≤ 10MB，单次最多 9 张。
 */
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif', '.bmp'];

const UPLOAD_DIR = join(
  __dirname,
  '..',
  '..',
  '..',
  'public',
  'uploads',
  'goods',
);

@Public() // 沿用 admin 接口现状，豁免全局 JWT
@Controller('api/admin')
export class UploadController {
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 9, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          // 自动建目录，避免首次上传失败
          if (!existsSync(UPLOAD_DIR)) {
            mkdirSync(UPLOAD_DIR, { recursive: true });
          }
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          // 时间戳 + 随机串 + 扩展名，防冲突
          // 扩展名取原文件名；若不在白名单（含无扩展名/不常见格式）则用 .png
          let ext = extname(file.originalname).toLowerCase();
          if (!ALLOWED_EXT.includes(ext)) ext = '.png';
          const name = `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}${ext}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        // 扩展名在白名单，或 mimetype 为 image/*（兼容 iPhone .heic、
        // 无扩展名等场景）则放行；否则拒绝
        const extOk = ALLOWED_EXT.includes(ext);
        const mimeOk = (file.mimetype || '').startsWith('image/');
        if (!extOk && !mimeOk) {
          return cb(
            new BadRequestException(`不支持的图片格式：${ext || '(无扩展名)'}（仅 jpg/png/webp/gif/heic/bmp）`),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('未接收到图片文件');
    }
    const urls = files.map((f) => `/admin/uploads/goods/${f.filename}`);
    return { code: 0, message: 'success', data: { urls } };
  }
}
