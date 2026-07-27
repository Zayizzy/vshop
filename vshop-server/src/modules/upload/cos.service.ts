import { Injectable, Logger } from '@nestjs/common';
import { tmpdir } from 'os';
import { extname, join } from 'path';
import { existsSync, mkdirSync, writeFile, unlink } from 'fs';
import { promisify } from 'util';

// 微信云开发 Node SDK。云托管容器内 init({ env }) 会自动从元数据服务
// 获取临时凭证，直接对接同账号对象存储，零密钥、零角色配置。
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tcb = require('@cloudbase/node-sdk');

const writeFileAsync = promisify(writeFile);
const unlinkAsync = promisify(unlink);

const UPLOAD_DIR = join(
  __dirname,
  '..',
  '..',
  '..',
  'public',
  'uploads',
  'goods',
);

/**
 * 图片存储服务
 *
 * 优先使用微信云开发 SDK（@cloudbase/node-sdk）直接对接微信云托管同账号的
 * 对象存储（云托管控制台「对象存储 → 存储配置」已开通的桶）：
 * - 云托管容器内 init({ env }) 自动通过元数据服务获取临时凭证，
 *   无需任何 SecretId/Key、无需 CAM 角色配置。
 * - 上传后调用 getTempFileURL 拿到长期有效的 https URL，
 *   小程序 <image> 可直接加载（utils/image.full 识别 https 原样返回）。
 *
 * 回退：未安装 SDK / 不在云托管环境时，本地磁盘存储
 * public/uploads/goods/（仅适用本地开发）。
 */
@Injectable()
export class CosService {
  private readonly logger = new Logger(CosService.name);
  private app: any = null;
  private readonly enabled: boolean;

  constructor() {
    try {
      const envId = process.env.TCB_ENV_ID || '1452085588';
      this.app = tcb.init({ env: envId });
      this.enabled = true;
      this.logger.log(`微信云开发存储已启用 (env=${envId})`);
    } catch (err: any) {
      this.logger.warn(
        `云开发存储初始化失败，回退本地磁盘存储：${err && err.message}`,
      );
    }
  }

  isCosEnabled() {
    return this.enabled;
  }

  /**
   * 存储图片，返回访问 URL。
   * - 云开发模式：完整 https URL（10 年有效）
   * - 本地模式：相对路径 /admin/uploads/goods/<name>
   */
  async store(file: Express.Multer.File): Promise<string> {
    return this.enabled ? this.uploadToTcb(file) : this.storeLocal(file);
  }

  private async uploadToTcb(file: Express.Multer.File): Promise<string> {
    let ext = extname(file.originalname).toLowerCase();
    if (!ext) ext = '.png';
    const cloudPath = `goods/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    // @cloudbase/node-sdk 的 uploadFile 接收 filePath（本地文件路径），
    // 先把 buffer 写到 /tmp 再上传，上传后清理
    const tmpPath = join(
      tmpdir(),
      `vshop-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`,
    );
    await writeFileAsync(tmpPath, file.buffer);

    try {
      const uploadRes = await this.app.uploadFile({ cloudPath, filePath: tmpPath });
      const fileID: string = uploadRes.fileID;

      // 获取长期有效的 https URL（maxAge = 10 年）
      const urlRes = await this.app.getTempFileURL({
        fileList: [{ fileID, maxAge: 60 * 60 * 24 * 365 * 10 }],
      });
      const entry = urlRes.fileList && urlRes.fileList[0];
      if (!entry || entry.code !== 0) {
        throw new Error(`获取文件访问 URL 失败：${entry && entry.message}`);
      }
      return entry.downloadUrl;
    } finally {
      unlinkAsync(tmpPath).catch(() => {});
    }
  }

  private async storeLocal(file: Express.Multer.File): Promise<string> {
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    let ext = extname(file.originalname).toLowerCase();
    if (!ext) ext = '.png';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    await writeFileAsync(join(UPLOAD_DIR, name), file.buffer);
    return `/admin/uploads/goods/${name}`;
  }
}