import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { Public } from '../../common/guards/public.decorator';
import { CosService } from './cos.service';

/**
 * 图片上传接口（admin 商品图等）。
 *
 * 存储由 CosService 决定（双模式）：
 * - 生产环境（配置 COS 凭证）：上传到腾讯云 COS，返回完整 https URL
 *   （前端 utils/image.full 识别 https 原样返回，无需补全）。
 * - 本地开发（未配置 COS）：存 public/uploads/goods/，返回相对路径
 *   /admin/uploads/goods/<name>（由 main.ts 以 /admin 前缀静态资源服务，
 *   前端 utils/image.full 补全为完整 URL）。
 *
 * 限制：仅图片（jpg/jpeg/png/webp/gif/heic/heif/bmp 或 image/*），
 * 单文件 ≤ 10MB，单次最多 9 张。
 */
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif', '.bmp'];

@Public() // 沿用 admin 接口现状，豁免全局 JWT
@Controller('api/admin')
export class UploadController {
  constructor(private readonly cosService: CosService) {}

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 9, {
      // 文件存内存（buffer），由 CosService 决定落 COS 还是本地磁盘。
      // 统一用 memoryStorage，避免运行时切换 diskStorage / memoryStorage
      // 的难题，也保证两种存储路径拿到一致格式的 file（含 buffer）。
      storage: memoryStorage(),
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
    const urls = await Promise.all(files.map((f) => this.cosService.store(f)));
    return { code: 0, message: 'success', data: { urls } };
  }
}
