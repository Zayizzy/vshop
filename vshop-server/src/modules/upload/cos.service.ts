import { Injectable, Logger } from '@nestjs/common';
import { extname, join } from 'path';
import { existsSync, mkdirSync, writeFile } from 'fs';
import { promisify } from 'util';
import * as http from 'http';

// cos-nodejs-sdk-v5 以 CommonJS 构造函数导出
// eslint-disable-next-line @typescript-eslint/no-var-requires
const COS = require('cos-nodejs-sdk-v5');

const writeFileAsync = promisify(writeFile);

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
 * 图片存储服务（云托管元数据 STS + COS 签名 URL）
 *
 * 凭证来源：微信云托管容器内通过元数据服务
 *   http://metadata.tencentyun.com/latest/meta-data/cam/security-credentials/<RoleName>
 * 获取 STS 临时凭证（SecretId/Key/Token + Expiration），用 cos-nodejs-sdk-v5 上传。
 * 无需任何 API 密钥，仅需服务角色被授予对象存储读写权限。
 *
 * URL：上传后调用 cos.getObjectUrl 拿到长期签名 URL（10 年），
 * 小程序 <image> 可直接加载（utils/image.full 识别 https 原样返回）。
 *
 * 回退：获取 STS 失败时（角色未授权 / 非云托管环境），回退本地磁盘存储
 * public/uploads/goods/（仅适用本地开发）。
 */

// 云托管元数据 STS 接口
const META_STS_URL =
  'http://metadata.tencentyun.com/latest/meta-data/cam/security-credentials';

// 服务角色候选名（按常见顺序自动尝试首个可用的；可用环境变量 COS_ROLE_NAME 指定）
const DEFAULT_ROLE_CANDIDATES = [
  'TCBRunInvokerRole',
  'TCBRunRole',
  'TcbRunRole',
];

// 桶名 / 地域默认值取自云托管控制台「对象存储 → 存储配置」
const DEFAULT_BUCKET = '7072-prod-d8gf4sglmae440765-1452085588';
const DEFAULT_REGION = 'ap-shanghai';

// 签名 URL 有效期（秒）= 10 年
const SIGN_EXPIRES = 60 * 60 * 24 * 365 * 10;

interface StsCreds {
  TmpSecretId: string;
  TmpSecretKey: string;
  Token: string;
  Expiration: string; // ISO8601
}

@Injectable()
export class CosService {
  private readonly logger = new Logger(CosService.name);
  private cos: any = null;
  private creds: StsCreds | null = null;
  private credsExpireAt = 0;
  private readonly bucket: string;
  private readonly region: string;
  private readonly roleCandidates: string[];

  constructor() {
    this.bucket = process.env.COS_BUCKET || DEFAULT_BUCKET;
    this.region = process.env.COS_REGION || DEFAULT_REGION;
    this.roleCandidates = process.env.COS_ROLE_NAME
      ? [process.env.COS_ROLE_NAME]
      : DEFAULT_ROLE_CANDIDATES;
    this.logger.log(
      `COS 配置：bucket=${this.bucket} region=${this.region} roles=${this.roleCandidates.join(',')}`,
    );
  }

  /**
   * 存储图片，返回访问 URL。
   * - COS 模式：完整 https 签名 URL（10 年有效）
   * - 本地模式：相对路径 /admin/uploads/goods/<name>
   */
  async store(file: Express.Multer.File): Promise<string> {
    try {
      return await this.uploadToCos(file);
    } catch (err: any) {
      this.logger.warn(
        `COS 上传失败，回退本地磁盘：${err?.message || err}`,
      );
      return this.storeLocal(file);
    }
  }

  private async uploadToCos(file: Express.Multer.File): Promise<string> {
    const cos = await this.getCosClient();

    const ext = extname(file.originalname).toLowerCase() || '.png';
    const key = `goods/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    await new Promise<void>((resolve, reject) => {
      cos.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        },
        (err: any) => (err ? reject(err) : resolve()),
      );
    });

    // 拿长期签名 URL（私有桶必须签名才能访问）
    const url = await new Promise<string>((resolve, reject) => {
      cos.getObjectUrl(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Sign: true,
          Expires: SIGN_EXPIRES,
          Protocol: 'https',
        },
        (err: any, data: any) =>
          err ? reject(err) : resolve(data && data.url),
      );
    });

    this.logger.log(`COS 上传成功：${key}`);
    return url;
  }

  /** 获取（或刷新）带 STS 凭证的 COS 客户端 */
  private async getCosClient(): Promise<any> {
    const now = Date.now();
    if (this.cos && this.creds && now < this.credsExpireAt - 60_000) {
      return this.cos;
    }
    const creds = await this.fetchSts();
    this.creds = creds;
    this.credsExpireAt = new Date(creds.Expiration).getTime();
    this.cos = new COS({
      SecretId: creds.TmpSecretId,
      SecretKey: creds.TmpSecretKey,
      SecurityToken: creds.Token,
    });
    this.logger.log(`STS 凭证刷新，过期：${creds.Expiration}`);
    return this.cos;
  }

  /** 从云托管元数据服务获取 STS 临时凭证（依次尝试候选角色名） */
  private async fetchSts(): Promise<StsCreds> {
    let lastErr: any;
    for (const role of this.roleCandidates) {
      try {
        const url = `${META_STS_URL}/${role}`;
        const raw = await this.httpGet(url);
        const creds = JSON.parse(raw);
        if (creds.TmpSecretId && creds.TmpSecretKey && creds.Token) {
          this.logger.log(`STS 获取成功：role=${role}`);
          return creds;
        }
      } catch (err: any) {
        lastErr = err;
        this.logger.warn(`STS 获取失败 role=${role}：${err?.message || err}`);
      }
    }
    throw new Error(
      `获取 STS 失败（已尝试角色：${this.roleCandidates.join(', ')}）：${
        lastErr?.message || lastErr
      }`,
    );
  }

  private httpGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = http.get(url, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
        res.on('error', reject);
      });
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy(new Error('metadata timeout'));
      });
    });
  }

  private async storeLocal(file: Express.Multer.File): Promise<string> {
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    const ext = extname(file.originalname).toLowerCase() || '.png';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    await writeFileAsync(join(UPLOAD_DIR, name), file.buffer);
    return `/admin/uploads/goods/${name}`;
  }
}