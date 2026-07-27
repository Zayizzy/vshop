# 微信云托管部署指南

> 本文档基于 vshop-server（NestJS + Prisma + MySQL）的实际项目结构编写，涵盖从开通到上线的完整流程。

---

## 目录

1. [架构概览](#1-架构概览)
2. [前置准备](#2-前置准备)
3. [代码调整（必须）](#3-代码调整必须)
4. [开通微信云托管](#4-开通微信云托管)
5. [创建 MySQL 数据库](#5-创建-mysql-数据库)
6. [创建容器服务并部署](#6-创建容器服务并部署)
7. [数据库迁移与初始化](#7-数据库迁移与初始化)
8. [配置环境变量](#8-配置环境变量)
9. [绑定小程序与内网调用](#9-绑定小程序与内网调用)
10. [小程序端配置](#10-小程序端配置)
11. [文件上传持久化（对象存储）](#11-文件上传持久化对象存储)
12. [验证与排错](#12-验证与排错)
13. [CI/CD 持续部署](#13-cicd-持续部署)

---

## 1. 架构概览

```
┌─────────────────┐     微信专线(免鉴权)     ┌──────────────────────────┐
│  微信小程序客户端 │  ──────────────────────▶ │   微信云托管 (容器服务)    │
│  (miniprogram)  │                          │   vshop-server (NestJS)  │
└─────────────────┘                          └──────────┬───────────────┘
                                                        │ 内网
                                            ┌───────────┼───────────┐
                                            ▼           ▼           ▼
                                       ┌─────────┐ ┌─────────┐ ┌───────┐
                                       │  MySQL  │ │  COS    │ │ Redis │
                                       │ (云托管) │ │(对象存储)│ │(可选) │
                                       └─────────┘ └─────────┘ └───────┘
```

**微信云托管的核心优势：**
- 容器化部署，支持任意语言/框架
- 内网专线访问微信接口（免鉴权获取 openid、调用支付等）
- 提供 Serverless MySQL、对象存储等配套资源
- 自动扩缩容，无流量时缩到 0（按量计费）
- 小程序端可通过 `wx.cloud.callContainer` 内网调用，无需 HTTPS 域名配置

---

## 2. 前置准备

### 2.1 账号要求

| 项目 | 要求 |
|------|------|
| 微信小程序账号 | 已注册，已认证（企业/个人开发者均可，企业认证可使用支付能力） |
| 小程序 AppID | 记录下来，部署时需要 |
| 小程序 AppSecret | 在「开发管理 → 开发设置」中获取 |
| 微信支付商户号 | 如需支付功能（v1.0 已有支付模块），需提前开通 |

### 2.2 代码仓库

项目已托管在 GitHub：`https://github.com/Zayizzy/vshop.git`

微信云托管支持两种代码源：
- **GitHub / GitLab / Gitee**（推荐，支持自动 CI/CD）
- **微信云托管内置代码库**（也可使用）

### 2.3 本地验证

确保项目本地可正常构建运行：

```bash
cd vshop-server
npm install
npx prisma generate
npm run build
npm start
# 确认 http://localhost:3000 可正常访问
```

---

## 3. 代码调整（必须）✅ 已完成

当前项目直接部署到云托管会遇到 **3 个必须修复的问题**，以下均已调整到位。

### 3.1 问题一：Dockerfile 未执行数据库迁移 ✅

当前 `Dockerfile` 构建出的镜像，启动时不会执行 `prisma migrate deploy`，导致数据库表结构未创建。

**修改方案：** 新增启动脚本，在 `node dist/main.js` 之前执行迁移。

已创建文件 `vshop-server/start.sh`：

```bash
#!/bin/sh
# 启动前执行数据库迁移（生产模式，仅 apply 已有 migration）
echo "Running prisma migrate deploy..."
npx prisma migrate deploy

echo "Starting application..."
node dist/main.js
```

修改 `vshop-server/Dockerfile`：

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --production

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/start.sh ./start.sh
RUN chmod +x start.sh
# 确保容器内有 prisma CLI（migrate deploy 需要）
RUN npx prisma version
EXPOSE 3000
CMD ["sh", "start.sh"]
```

> **注意：** `npm prune --production` 会移除 devDependencies，但 `prisma` 在 devDependencies 中。`migrate deploy` 需要 prisma CLI。有两个选择：
> - **方案 A（推荐）：** 将 `prisma` 从 devDependencies 移到 dependencies
> - **方案 B：** 不执行 `npm prune`，镜像稍大但不影响功能

推荐方案 A，修改 `package.json`：

```json
{
  "dependencies": {
    // ...原有依赖
    "prisma": "^5.10.0"
  },
  "devDependencies": {
    // 移除 prisma，保留 @prisma/client 在 dependencies
    "@nestjs/cli": "^10.3.0",
    "@nestjs/schematics": "^10.1.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
```

### 3.2 问题二：miniprogram/assets 路径在容器中不存在 ✅

`main.ts` 第 63 行：

```typescript
app.useStaticAssets(join(__dirname, '..', '..', 'miniprogram', 'assets'), { prefix: '/assets' });
```

**解决方案：** 已在项目根目录创建 `Dockerfile`（云托管专用），构建上下文为项目根目录，构建时将 `miniprogram/assets` 复制到容器内 `/app/miniprogram/assets`。

路径验证：
- 编译后 `dist/main.js` 的 `__dirname` = `/app/dist`
- `join(__dirname, '..', '..', 'miniprogram', 'assets')` = `/app/miniprogram/assets`
- Dockerfile 中 `COPY miniprogram/assets /app/miniprogram/assets` ✓

路径自然对上，`main.ts` 无需修改。原 `vshop-server/Dockerfile` 保留不动（本地 docker-compose 只跑 MySQL）。

### 3.3 问题三：NestJS 监听地址 ✅

微信云托管要求容器监听 `0.0.0.0`（不能只监听 `127.0.0.1`）。已修改 `main.ts`，显式绑定 `0.0.0.0` 并支持从环境变量读取端口：

```typescript
const port = parseInt(process.env.PORT || '3000', 10);
await app.listen(port, '0.0.0.0');
```

---

## 4. 开通微信云托管

### 4.1 进入云托管控制台

1. 访问 [微信云托管控制台](https://cloud.weixin.qq.com/cloudrun)
2. 使用小程序关联的微信扫码登录
3. 选择关联的小程序 AppID

### 4.2 开通服务

首次使用会提示「开通微信云托管」：
1. 点击「开通」
2. 选择资源所在地域（建议选择离用户最近的区域，如广州、上海）
3. 完成腾讯云账号授权（云托管底层使用腾讯云资源）
4. 等待环境创建完成（约 1-2 分钟）

### 4.3 计费模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| 按量计费 | CPU/内存/流量按使用量计费，无流量时不收费 | 开发测试、流量不稳定 |
| 包年包月 | 固定资源预留 | 流量稳定的生产环境 |

> **建议：** 初期使用按量计费，正式上线后根据流量情况切换。

---

## 5. 创建 MySQL 数据库

### 5.1 创建数据库实例

1. 进入云托管控制台 → 「数据库」→「MySQL」
2. 点击「新建实例」
3. 配置参数：

| 参数 | 值 | 说明 |
|------|-----|------|
| 实例名 | `vshop-mysql` | 自定义 |
| 版本 | MySQL 8.0 | 与本地一致 |
| 规格类型 | Serverless | 按需扩缩容，成本低 |
| CPU/内存 | 1核 1G（最小） | 初期够用，后续可升配 |
| 存储 | 20G | 初期够用 |
| 数据库账号 | `vshop` | 自定义用户名 |
| 数据库密码 | `强密码` | 使用强随机密码 |
| 数据库名 | `vshop` | 与本地一致 |

4. 点击「创建」，等待实例就绪（约 3-5 分钟）

### 5.2 获取内网连接地址

实例创建完成后，在实例详情页记录以下信息：

```
内网地址：10.x.x.x（或类似内网 IP）
内网端口：3306
数据库名：vshop
用户名：vshop
密码：你设置的密码
```

### 5.3 拼接 DATABASE_URL

```
mysql://vshop:你的密码@10.x.x.x:3306/vshop
```

> **重要：** 云托管的 MySQL 只能通过云托管内网访问，不能从公网连接。这意味着你无法用本地 Prisma Studio 直连。本地开发仍使用 docker-compose 的 MySQL。

---

## 6. 创建容器服务并部署

### 6.1 创建服务

1. 进入云托管控制台 →「服务列表」→「新建服务」
2. 填写服务信息：

| 参数 | 值 |
|------|-----|
| 服务名称 | `vshop-server` |
| 服务备注 | 鲜到家后端服务 |
| 计费类型 | 按量计费 |
| 最小实例数 | 0（无流量时不收费） |
| 最大实例数 | 10（根据需要调整） |
| 扩缩容条件 | CPU > 70% 时扩容 |

3. 点击「下一步」，进入「代码托管」配置

### 6.2 配置代码源

选择 **GitHub**（或其他代码仓库）：

1. 首次使用需授权，点击「授权 GitHub」
2. 选择代码仓库：`Zayizzy/vshop`
3. 分支：`main`（或你的主分支）
4. 构建方式：**Dockerfile**

### 6.3 配置 Dockerfile 路径

根据第 3 节的修改，配置构建参数：

| 参数 | 值 |
|------|-----|
| Dockerfile 路径 | `Dockerfile`（项目根目录） |
| 构建上下文 | `./`（项目根目录） |
| 监听端口 | `3000` |

### 6.4 触发首次构建

1. 点击「提交」
2. 系统会自动拉取代码并执行 Docker 构建
3. 在「版本列表」中查看构建日志
4. 构建成功后，服务状态变为「运行中」

> **首次构建预计耗时 5-10 分钟**（主要是 npm ci 下载依赖）。

---

## 7. 数据库迁移与初始化

### 7.1 自动迁移（推荐）

如果按照第 3.1 节修改了 `start.sh`，容器启动时会自动执行：

```bash
npx prisma migrate deploy
```

这会应用 `prisma/migrations/` 下所有未执行的迁移文件，自动创建表结构。

### 7.2 验证迁移结果

在云托管控制台查看容器日志：

1. 进入服务 →「实例列表」→ 点击实例
2. 查看启动日志，应看到：
   ```
   Running prisma migrate deploy...
   Applying migration `20260703041749_init_mysql`
   Applying migration `20260703094217_add_indexes`
   Applying migration `20260707000000_add_user_union_id`
   All migrations applied successfully.
   Starting application...
   鲜到家服务已启动: http://localhost:3000
   ```

### 7.3 执行 Seed 数据（可选）

如果需要初始化测试数据或基础配置数据，可以：

**方式一：** 在 `start.sh` 中添加（仅首次部署时执行）：

```bash
npx prisma migrate deploy
# 仅当 FIRST_DEPLOY=1 时执行 seed
if [ "$FIRST_DEPLOY" = "1" ]; then
  echo "Running seed..."
  npx ts-node prisma/seed.ts || true
fi
```

**方式二：** 通过云托管「Webshell」手动执行：

1. 进入服务 →「实例列表」→ 点击实例 →「Webshell」
2. 在终端中执行：
   ```bash
   npx ts-node prisma/seed.ts
   ```

> **注意：** `ts-node` 在 devDependencies 中，如果执行了 `npm prune --production` 则不可用。建议将 seed 脚本预编译为 JS，或在 Dockerfile 中保留 devDependencies（使用方案 B：不执行 prune）。

---

## 8. 配置环境变量

### 8.1 在控制台配置

1. 进入服务 →「服务设置」→「环境变量」
2. 添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | `mysql://vshop:密码@内网IP:3306/vshop` | 第 5.3 节获取 |
| `JWT_SECRET` | `强随机字符串（32位以上）` | 生产环境密钥 |
| `WX_APPID` | `你的小程序AppID` | 微信登录需要 |
| `WX_SECRET` | `你的小程序AppSecret` | 微信登录需要 |
| `ADMIN_ACCOUNTS` | `admin:super:超级管理员:$2b$10$xxx` | 后台管理员账号 |
| `NODE_ENV` | `production` | 生产环境标识 |

3. 点击「保存」，服务会自动重启并应用新环境变量

### 8.2 生成强随机密钥

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 管理员密码哈希
node -e "console.log(require('bcryptjs').hashSync('你的密码', 10))"
```

### 8.3 敏感信息管理建议

- **不要**将 `.env` 文件提交到 Git（已在 .gitignore 中）
- 生产环境变量只在云托管控制台维护
- `ADMIN_ACCOUNTS` 中的密码哈希定期更换

---

## 9. 绑定小程序与内网调用

### 9.1 小程序端两种调用方式

| 方式 | 说明 | 适用场景 |
|------|------|----------|
| 公网域名调用 | 通过 HTTPS 域名访问 API | 需要配置合法域名 |
| `wx.cloud.callContainer` | 微信专线内网调用（推荐） | 免域名配置、免鉴权、低延迟 |

### 9.2 方式一：公网域名（传统方式）

1. 在云托管服务详情页，找到「公网访问地址」，格式类似：
   ```
   https://vshop-server-xxx-xxx.gz.tencent-region.cloudrun.cloud
   ```
2. 进入「微信小程序后台」→「开发管理」→「开发设置」→「服务器域名」
3. 在 `request` 合法域名中添加上述地址
4. 修改 `miniprogram/config/index.js` 中的 `apiBase`

### 9.3 方式二：wx.cloud.callContainer（推荐）

此方式无需配置域名，走微信专线内网调用。

#### 9.3.1 开通云托管 SDK

在小程序 `app.js` 中初始化：

```javascript
// app.js
App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'your-env-id',        // 云托管环境ID
        resourceEnv: 'your-env-id', // 资源环境ID
      })
    }
  }
})
```

#### 9.3.2 封装请求方法

修改 `miniprogram/app.js` 中的 `request` 方法：

```javascript
request(options) {
  // 如果传了完整 URL（如第三方接口），直接请求
  if (options.url && options.url.startsWith('http')) {
    return new Promise((resolve, reject) => {
      wx.request({
        ...options,
        url: options.url,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data?.data !== undefined ? res.data.data : res.data)
          } else {
            reject(res)
          }
        },
        fail: reject,
      })
    })
  }

  // 使用云托管内网调用
  return new Promise((resolve, reject) => {
    wx.cloud.callContainer({
      config: { env: 'your-env-id' },
      path: options.url,                    // 如 /v1/user/info
      method: options.method || 'GET',
      data: options.data,
      header: {
        'content-type': 'application/json',
        ...options.header,
        // JWT token
        ...(this.globalData.token ? { Authorization: `Bearer ${this.globalData.token}` } : {}),
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const body = res.data
          if (body.code === 0 || body.code === undefined) {
            resolve(body.data !== undefined ? body.data : body)
          } else {
            reject(body)
          }
        } else {
          reject(res)
        }
      },
      fail: (err) => {
        console.error('[callContainer] failed', err)
        reject(err)
      },
    })
  })
}
```

#### 9.3.3 优势

- **无需配置合法域名**：不占用服务器域名配额
- **免鉴权获取 openid**：云托管可直接获取用户 openid（需配合 `wx.cloud.getOpenData`）
- **内网专线**：延迟更低，更安全
- **无需 HTTPS 证书**：微信自动处理

> **建议：** 开发阶段用公网域名（localhost/局域网IP），生产环境用 `callContainer`。

---

## 10. 小程序端配置

### 10.1 修改 API 地址

根据第 9 节选择的调用方式，修改 `miniprogram/config/index.js`：

**使用公网域名时：**

```javascript
const configs = {
  develop: {
    apiBase: 'http://localhost:3000/v1',  // 本地开发
  },
  trial: {
    apiBase: 'https://vshop-server-xxx.gz.tencent-region.cloudrun.cloud/v1',
  },
  release: {
    apiBase: 'https://vshop-server-xxx.gz.tencent-region.cloudrun.cloud/v1',
  },
}
```

**使用 callContainer 时：** apiBase 仅用于本地开发，生产环境走 `wx.cloud.callContainer`，可设为空字符串。

### 10.2 图片资源地址

如果 `main.ts` 中的 `/assets` 静态资源服务也在云托管中，图片 URL 需要拼接完整域名：

```javascript
// miniprogram/utils/image.js
// 修改 host 逻辑，兼容云托管公网域名
```

---

## 11. 文件上传持久化（对象存储）

### 11.1 问题说明

当前 `upload.controller.ts` 使用 `multer.diskStorage` 将文件存到 `public/uploads/goods/`。

**容器是无状态的**——每次部署或扩缩容，容器内的文件都会丢失。必须改用对象存储。

### 11.2 方案：使用微信云托管对象存储（COS）

> ✅ **已实施（v3，2026-07-27）**：使用 `cos-nodejs-sdk-v5` + **云托管元数据 STS
> 临时凭证**，**零 API 密钥**。代码：`vshop-server/src/modules/upload/cos.service.ts`。
>
> **为什么用 cos + 元数据 STS？**
> 微信云托管容器内可通过
> `http://metadata.tencentyun.com/latest/meta-data/cam/security-credentials/<角色>`
> 获取 STS 临时凭证（TmpSecretId/Key/Token），用 cos SDK 上传到「对象存储」
> 页面已开通的桶（截图：`7072-prod-d8gf4sglmae440765-1452085588` / `ap-shanghai`）。
> 上传后用 `cos.getObjectUrl` 拿长期签名 URL（10 年），小程序 `<image>` 直接加载。
>
> **前置（一次性 CAM 授权）**：
> 在 CAM 控制台 → 角色 → 给服务运行角色（`TCBRunInvokerRole` 等）关联
> `QcloudCOSFullAccess`（或自定义 `cos:*` 读写权限）。否则 STS 获取失败，
> 自动回退本地磁盘。
>
> **双模式回退**：
> - 云托管环境（默认）：上传 COS，返回 https 签名 URL
> - 本地开发 / STS 获取失败：回退本地磁盘 `public/uploads/goods/`
>
> 小程序端**无需改动**：`utils/image.full()` 识别 https 原样返回。
> 注意：`multer` 用 `memoryStorage()`，单次最多 9 张 × 10MB 峰值约 90MB 内存。

#### 11.2.1 开通对象存储

1. 进入云托管控制台 →「对象存储」
2. 点击「开通」，创建存储桶：
   - 桶名：`vshop-uploads`
   - 地域：与 MySQL/服务一致
   - 访问权限：私有读写（通过签名 URL 访问）或公有读私有写

#### 11.2.2 修改上传逻辑

安装 SDK：

```bash
npm install cos-nodejs-sdk-v5 --save
```

`cos.service.ts` 核心实现（云托管元数据 STS + cos SDK + 签名 URL）：

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { extname, join } from 'path';
import { existsSync, mkdirSync, writeFile } from 'fs';
import { promisify } from 'util';
import * as http from 'http';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const COS = require('cos-nodejs-sdk-v5');

const writeFileAsync = promisify(writeFile);
const META_STS_URL = 'http://metadata.tencentyun.com/latest/meta-data/cam/security-credentials';
const DEFAULT_ROLES = ['TCBRunInvokerRole', 'TCBRunRole', 'TcbRunRole'];
const DEFAULT_BUCKET = '7072-prod-d8gf4sglmae440765-1452085588';
const DEFAULT_REGION = 'ap-shanghai';
const SIGN_EXPIRES = 60 * 60 * 24 * 365 * 10; // 10 年

@Injectable()
export class CosService {
  private readonly logger = new Logger(CosService.name);
  private cos: any = null;
  private creds: any = null;
  private credsExpireAt = 0;
  private readonly bucket: string;
  private readonly region: string;
  private readonly roleCandidates: string[];

  constructor() {
    this.bucket = process.env.COS_BUCKET || DEFAULT_BUCKET;
    this.region = process.env.COS_REGION || DEFAULT_REGION;
    this.roleCandidates = process.env.COS_ROLE_NAME ? [process.env.COS_ROLE_NAME] : DEFAULT_ROLES;
  }

  async store(file: Express.Multer.File): Promise<string> {
    try { return await this.uploadToCos(file); }
    catch (err: any) {
      this.logger.warn(`COS 上传失败，回退本地磁盘：${err?.message}`);
      return this.storeLocal(file);
    }
  }

  private async uploadToCos(file: Express.Multer.File): Promise<string> {
    const cos = await this.getCosClient();
    const ext = extname(file.originalname).toLowerCase() || '.png';
    const key = `goods/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    await new Promise<void>((resolve, reject) => cos.putObject({
      Bucket: this.bucket, Region: this.region, Key: key,
      Body: file.buffer, ContentType: file.mimetype,
    }, (err: any) => err ? reject(err) : resolve()));
    const url = await new Promise<string>((resolve, reject) => cos.getObjectUrl({
      Bucket: this.bucket, Region: this.region, Key: key,
      Sign: true, Expires: SIGN_EXPIRES, Protocol: 'https',
    }, (err: any, data: any) => err ? reject(err) : resolve(data.url)));
    return url;
  }

  private async getCosClient(): Promise<any> {
    const now = Date.now();
    if (this.cos && this.creds && now < this.credsExpireAt - 60_000) return this.cos;
    const creds = await this.fetchSts();
    this.creds = creds; this.credsExpireAt = new Date(creds.Expiration).getTime();
    this.cos = new COS({ SecretId: creds.TmpSecretId, SecretKey: creds.TmpSecretKey, SecurityToken: creds.Token });
    return this.cos;
  }

  private async fetchSts(): Promise<any> {
    for (const role of this.roleCandidates) {
      try {
        const raw = await new Promise<string>((resolve, reject) => {
          http.get(`${META_STS_URL}/${role}`, (res) => {
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
            let d = ''; res.setEncoding('utf8'); res.on('data', c => d += c); res.on('end', () => resolve(d));
          }).on('error', reject);
        });
        const c = JSON.parse(raw);
        if (c.TmpSecretId && c.TmpSecretKey && c.Token) return c;
      } catch {}
    }
    throw new Error('STS 获取失败，请检查 CAM 角色授权');
  }

  private async storeLocal(file: Express.Multer.File): Promise<string> {
    const dir = join(__dirname, '..', '..', '..', 'public', 'uploads', 'goods');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const ext = extname(file.originalname).toLowerCase() || '.png';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    await writeFileAsync(join(dir, name), file.buffer);
    return `/admin/uploads/goods/${name}`;
  }
}
```

`upload.controller.ts` 改用 `memoryStorage()`，构造器注入 `CosService.store()`
（详见源文件）。

#### 11.2.3 配置环境变量

全部可选，有默认值（桶名/地域取自截图）。

| 变量名 | 必填 | 默认 | 说明 |
|--------|------|------|------|
| `COS_BUCKET` | ❌ | `7072-prod-d8gf4sglmae440765-1452085588` | 对象存储桶名（含 AppId） |
| `COS_REGION` | ❌ | `ap-shanghai` | 桶地域 |
| `COS_ROLE_NAME` | ❌ | `TCBRunInvokerRole`（依次尝试 `TCBRunInvokerRole` → `TCBRunRole` → `TcbRunRole`） | 服务角色名，需在 CAM 被授予对象存储读写权限 |

> **无需 API 密钥**。STS 临时凭证从云托管元数据服务自动获取。
> **唯一需要做的（一次性）**：在 CAM 控制台 → 角色列表 →
> 找到服务运行角色（默认名 `TCBRunInvokerRole`，可在云托管「服务管理 →
> 高级配置」查看）→ 关联策略 `QcloudCOSFullAccess`（生产）或
> 自定义 `cos:PutObject` + `cos:GetObject`（最小权限）。

#### 11.2.4 访问域名

上传后的 URL 形如：
`https://7072-prod-d8gf4sglmae440765-1452085588.tcb.qcloud.la/goods/xxx.png`

该域名在云托管对象存储「安全域名」中**默认已配置**（含 `localhost:80/8080`），
小程序 `<image>` 组件加载 https 图片**无需**额外配置 `request`/`downloadFile`
合法域名。如需 CDN 加速，可在对象存储控制台「域名与传输管理」绑定自定义 CDN。

> **替代方案：** 如果不想改代码，短期可在云托管中使用「持久化存储卷」挂载到 `public/uploads/`，但此方案在多实例扩容时数据不同步，**不推荐生产使用**。

---

## 12. 验证与排错

### 12.1 部署后验证清单

```bash
# 1. 检查服务状态
# 云托管控制台 → 服务列表 → 确认状态为「运行中」

# 2. 检查实例日志
# 服务 → 实例列表 → 点击实例 → 查看日志
# 确认看到：
#   "鲜到家服务已启动: http://localhost:3000"
#   "供应商后台: http://localhost:3000/admin"

# 3. 通过公网地址测试 API
curl https://<你的公网地址>/v1/health
# 或
curl https://<你的公网地址>/admin/

# 4. 检查数据库表是否创建
# 服务 → 实例 → Webshell
npx prisma studio
# 或直接查询
npx prisma db pull  # 对比 schema
```

### 12.2 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 容器启动后立即退出 | 环境变量缺失，`validateEnv` 抛异常 | 检查日志，补全 DATABASE_URL、JWT_SECRET |
| 数据库连接失败 | DATABASE_URL 用了公网地址 | 改用云托管 MySQL 内网地址 |
| `prisma migrate deploy` 失败 | prisma CLI 不在生产依赖中 | 将 prisma 移到 dependencies |
| 容器 OOM 被杀 | 内存不足 | 升级实例规格（1G → 2G） |
| 图片上传后丢失 | 使用了本地磁盘存储 | 改用 COS 对象存储（见第 11 节） |
| 小程序无法访问 | 域名未加入合法域名列表 | 添加公网域名或改用 callContainer |
| `/assets` 图片 404 | miniprogment/assets 未复制到容器 | 按第 3.2 节修改 Dockerfile |
| 构建失败 npm ci 报错 | package-lock.json 版本不匹配 | 本地 `npm install` 后重新提交 lock 文件 |

### 12.3 查看日志

```bash
# 方式一：控制台查看
# 云托管 → 服务 → 日志查询 → 支持关键词搜索和时间筛选

# 方式二：Webshell 实时查看
# 服务 → 实例 → Webshell → 执行 tail -f /proc/1/fd/1
```

---

## 13. CI/CD 持续部署

### 13.1 自动部署配置

微信云托管支持代码提交后自动构建部署：

1. 进入服务 →「持续部署」→「新建规则」
2. 配置：

| 参数 | 值 |
|------|-----|
| 代码仓库 | GitHub / Zayizzy/vshop |
| 分支 | `main` |
| 触发方式 | Push 到 main 自动触发 |
| Dockerfile 路径 | `Dockerfile` |
| 构建上下文 | `./` |

3. 保存后，每次 `git push origin main` 会自动触发部署

### 13.2 灰度发布

1. 部署新版本后，在「版本列表」中选择新版本
2. 点击「灰度发布」
3. 设置灰度比例（如 10%）
4. 观察无异常后，逐步提升至 100%

### 13.3 版本回滚

在「版本列表」中，选择历史版本 →「回滚到此版本」，立即切换流量。

### 13.4 GitHub Actions 集成（可选）

如果需要更复杂的 CI/CD（如自动测试后再部署），可使用 GitHub Actions：

```yaml
# .github/workflows/deploy-cloudrun.yml
name: Deploy to WeChat Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        run: |
          cd vshop-server
          npm ci
          npm run build

      # 微信云托管 CLI 或 API 调用触发部署
      # 参考：https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/guide/devops/cli.html
```

---

## 附录 A：完整环境变量清单

| 变量名 | 必填 | 示例值 | 说明 |
|--------|------|--------|------|
| `DATABASE_URL` | ✅ | `mysql://vshop:pwd@10.x.x.x:3306/vshop` | 云托管 MySQL 内网地址 |
| `JWT_SECRET` | ✅ | `a1b2c3d4e5f6...`（32位以上） | JWT 签名密钥 |
| `WX_APPID` | ✅ | `wx1234567890abcdef` | 小程序 AppID |
| `WX_SECRET` | ✅ | `abcdef1234567890...` | 小程序 AppSecret |
| `ADMIN_ACCOUNTS` | ✅ | `admin:super:超管:$2b$10$xxx` | 后台管理员账号 |
| `NODE_ENV` | ✅ | `production` | 生产环境标识 |
| `PORT` | ❌ | `3000` | 容器监听端口（默认 3000） |
| `COS_SECRET_ID` | ⚠️ | `AKIDxxxxxxxx` | COS 密钥（启用对象存储时必填） |
| `COS_SECRET_KEY` | ⚠️ | `xxxxxxxxxxxx` | COS 密钥 |
| `COS_BUCKET` | ⚠️ | `vshop-uploads-1234567890` | COS 存储桶名 |
| `COS_REGION` | ⚠️ | `ap-guangzhou` | COS 地域 |

## 附录 B：部署检查清单

- [ ] Dockerfile 已修改（添加 migrate deploy、复制 assets）
- [ ] `main.ts` 监听 `0.0.0.0`
- [ ] `prisma` 在 dependencies 中
- [ ] `.env` 未提交到 Git
- [ ] 云托管 MySQL 已创建，记录内网地址
- [ ] 环境变量已全部配置
- [ ] 首次构建成功，实例运行中
- [ ] 数据库迁移已执行（检查日志）
- [ ] 公网访问地址可正常返回
- [ ] 小程序端 API 地址已更新
- [ ] 文件上传改用 COS（或暂用本地存储，标注 TODO）
- [ ] 后台管理员可正常登录
- [ ] 微信登录接口可正常获取 openid
