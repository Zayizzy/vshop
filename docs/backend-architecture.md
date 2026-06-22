# 鲜到家 · 果蔬商城 · 后端架构方案

> 版本：v1.0 | 日期：2026-06-15 | 基于 PRD + 接口清单 + 前端现状

---

## 目录

1. [总体策略](#1-总体策略)
2. [技术选型](#2-技术选型)
3. [服务架构](#3-服务架构)
4. [模块职责拆解](#4-模块职责拆解)
5. [订单路由引擎](#5-订单路由引擎)
6. [数据库设计要点](#6-数据库设计要点)
7. [第三方对接](#7-第三方对接)
8. [部署方案](#8-部署方案)
9. [开发路线图](#9-开发路线图)

---

## 1. 总体策略

### 1.1 核心原则

| 原则 | 说明 |
|------|------|
| **Modular Monolith 起步** | v1 用单体架构，内部按模块拆分，避免过早微服务 |
| **接口先行** | 已有 41 个 API 接口定义，后端严格对齐实现 |
| **先跑通闭环** | 先做下单→支付→履约→签收的核心链路 |
| **渐进式增强** | KOC、优惠券、WMS 对接分批迭代 |

### 1.2 不做的事情（v1）

- ❌ 不拆微服务
- ❌ 不做实时大数据
- ❌ 不做 AI 推荐引擎
- ❌ 不做复杂库存管理体系（供应商自行管理）

---

## 2. 技术选型

### 2.1 部署平台：微信云托管（推荐）

微信云托管（WeChat Cloud Run）是微信官方推出的 Serverless 容器平台，专为小程序/公众号后端设计。

| 特性 | 对鲜到家的价值 |
|------|---------------|
| **零运维** | 无需管理服务器、Nginx、SSL 证书，Docker 推送即部署 |
| **微信天然鉴权** | 免维护 access_token，免鉴权调用微信开放接口，自动获取 OpenID |
| **微信支付免证书** | 调用微信支付 API 不需维护证书，SDK 内置安全链路 |
| **私有协议** | 小程序请求走微信内网，防 DNS 劫持、防 DDoS，更快更安全 |
| **弹性伸缩** | 按实际用量计费（精确到 100ms），大促自动扩容 |
| **任意语言** | 支持 Node.js / Go / Java / Python，Docker 标准部署 |
| **自带数据库** | 云开发数据库（Serverless），不使用不计费 |
| **CDN + COS** | 静态资源和对象存储开箱即用 |

**费用参考：** 按 vCPU/内存 + 调用次数计费。初期日活 < 1000 时约 ¥100-300/月，远低于自建服务器 + 运维人力。

> 云托管官方文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/

### 2.2 运行时方案：Node.js + TypeScript

| 层级 | 技术 | 理由 |
|------|------|------|
| 语言 | TypeScript | 类型安全，与小程序前端类型共享 |
| 框架 | **NestJS** | 模块化架构天然匹配我们的模块拆分 |
| ORM | **Prisma** | 类型安全的数据库操作，迁移管理方便 |
| 数据库 | 云开发数据库（MongoDB 兼容） | 云托管原生集成，免运维，弹性伸缩 |
| 缓存 | 云开发 Redis | 会话、限流、截单倒计时 |
| 文件存储 | 云开发存储 + CDN | 商品图片、KOC 海报，自带 CDN 加速 |
| 消息队列 | **BullMQ** | 基于 Redis，订单路由、WMS 同步等异步任务 |

**为什么选 NestJS 而不是直接用云函数？**

云函数适合简单 CRUD，但鲜到家有复杂的订单路由引擎（多供应商拆单、区域匹配、库存锁定）。NestJS 的分层架构 + 依赖注入更适合这种业务复杂度。

### 2.3 备选：自建服务器方案

如果不用云托管，可以在腾讯云轻量应用服务器上部署：

| 层级 | 技术 |
|------|------|
| 反向代理 | Nginx |
| 数据库 | PostgreSQL 16（云数据库） |
| 缓存 | Redis 7（云缓存） |
| 部署 | Docker Compose |
| 月费 | ~¥290（2核4G + PG + Redis + COS） |

自建方案更灵活但需要维护服务器、SSL、Nginx 等基础设施。

### 2.4 推荐结论

```
v1.0 → 微信云托管 + NestJS + 云开发数据库
     → 零运维，微信生态深度集成，成本可控
未来规模增长 → 可平滑迁移到独立服务器
```

---

## 3. 服务架构

```
┌─────────────────────────────────────────────────────────┐
│                     Nginx (反向代理 + HTTPS)               │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  NestJS Application                      │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Auth     │ │ Goods    │ │ Order    │ │ Payment     │ │
│  │ Module   │ │ Module   │ │ Module   │ │ Module      │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Cart     │ │ User     │ │ KOC      │ │ Coupon      │ │
│  │ Module   │ │ Module   │ │ Module   │ │ Module      │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐ │
│  │ Channel  │ │ Logistics│ │ OrderRouter (引擎模块)    │ │
│  │ Module   │ │ Module   │ │                          │ │
│  └──────────┘ └──────────┘ └──────────────────────────┘ │
│                                                          │
│  Common: AuthGuard / ValidationPipe / Logging            │
└────────────────────┬────────────────────────────────────┘
                     │
     ┌───────────────┼───────────────┐
     ▼               ▼               ▼
┌─────────┐   ┌──────────┐   ┌──────────────┐
│PostgreSQL│   │  Redis   │   │ 腾讯云 COS    │
└─────────┘   └──────────┘   └──────────────┘
                     │
              ┌──────▼──────┐
              │   BullMQ    │ (异步任务队列)
              │  ┌────────┐ │
              │  │ 订单路由 │ │
              │  │ WMS同步 │ │
              │  │ 分佣计算 │ │
              │  │ 消息推送 │ │
              │  └────────┘ │
              └─────────────┘
```

---

## 4. 模块职责拆解

### 4.1 Auth Module（用户与授权）

| 功能 | 说明 |
|------|------|
| 微信登录 | `wx.login()` 获取 code → 换取 openid + session_key |
| Token 管理 | JWT 签发 + Redis 存储 + 自动续期 |
| 手机号授权 | 微信手机号快速验证组件 |
| 用户信息 | 昵称、头像、位置（从微信获取 + 手动填写） |

**关键设计：** 不做自建账号体系，完全依赖微信授权。用户首次进入即静默注册。

### 4.2 Goods Module（商品）

| 功能 | 说明 |
|------|------|
| 商品 CRUD | 运营后台管理，C端只读 |
| 分类管理 | 两级分类（水果 → 瓜类/浆果/核果…） |
| SKU 管理 | 多规格（如 5斤装/10斤装），价格独立 |
| 上下架 | 供应商可自主上下架（需审核） |
| 图片存储 | 腾讯云 COS + 图片裁剪缩略图 |

**关键设计：** 商品与供应商绑定（多对多）。同一个"阿克苏苹果"可由多个供应商供货，各自设置价格和库存。

### 4.3 Cart Module（购物车）

| 功能 | 说明 |
|------|------|
| 添加/修改/删除 | 标准购物车操作 |
| 供应商分组 | 按供应商拆分展示（已在 WXML 中实现） |
| 库存校验 | 加购时校验，结算时再次校验 |
| 离线存储 | 未登录时存 localStorage，登录后合并 |

**关键设计：** 购物车数据存 Redis（Hash 结构），key = `cart:{userId}`，field = `skuId`，value = `quantity`。支持过期清理（7天未活跃）。

### 4.4 Order Module（订单）+ OrderRouter（路由引擎）

这是整个系统最核心的模块。

**订单状态机：**
```
待付款(pending) ──支付──▶ 待发货(shipping) ──打单──▶ 待收货(receiving) ──签收──▶ 已完成(done)
    │                         │
    └──取消──▶ 已取消            └──退款──▶ 售后中
```

**路由引擎流程：**
```
用户下单
  │
  ▼
┌─────────────┐
│ 1. 拆单引擎  │  按供应商拆分订单 → 生成 N 个子订单（包裹）
└──────┬──────┘
       ▼
┌─────────────┐
│ 2. 路由决策  │  每个子订单匹配供应商（按商品+区域+库存+运费）
└──────┬──────┘
       ▼
┌─────────────┐
│ 3. 价格计算  │  商品金额 + 运费 + 优惠券 → 实付金额
└──────┬──────┘
       ▼
┌─────────────┐
│ 4. 库存锁定  │  锁定供应商库存（Redis 分布式锁）
└──────┬──────┘
       ▼
┌─────────────┐
│ 5. 支付        │  微信支付统一下单
└─────────────┘
```

**关键设计：**
- 订单号生成规则：`{日期}{序号}`，如 `20260615001`
- 子订单（包裹）有独立物流状态，与父订单状态解耦
- 截单逻辑：每日 20:00 后的订单自动标记为次日订单

### 4.5 Payment Module（支付）

| 功能 | 说明 |
|------|------|
| 微信支付 | JSAPI 支付（小程序内） |
| 支付回调 | 异步通知 → 更新订单状态 → 触发发货流程 |
| 退款 | 原路退回，对接微信退款 API |

**关键设计：** 使用微信支付 V3 API。支付回调必须做幂等处理（重复通知只处理一次）。

### 4.6 KOC Module（分销）

| 功能 | 说明 |
|------|------|
| 入驻申请 | 提交资料 → 平台审核 |
| 推广链接/码 | 小程序码 + 短链，带 kocId 参数 |
| 订单归因 | 通过 kocId 参数归因订单来源 |
| 分佣计算 | 按比例计算佣金，T+7 结算 |
| 提现 | 微信企业付款到零钱 |
| 数据看板 | 浏览/点击/订单/GMV/佣金 |

**关键设计：**
- kocId 通过 URL 参数传递，前端 `app.js` 的 `trackChannel` 方法已实现上报
- 分佣在订单完成后异步计算（BullMQ 定时任务）
- 提现需对接微信商户平台「企业付款」能力

### 4.7 Coupon Module（优惠券）

| 功能 | 说明 |
|------|------|
| 优惠券模板 | 满减券 / 折扣券 |
| 发放 | 新人券（自动发放）、活动券（手动领取） |
| 使用 | 下单时选择，计算优惠金额 |
| 核销 | 支付成功后标记已使用 |

### 4.8 Channel Module（渠道追踪）

| 功能 | 说明 |
|------|------|
| 包裹卡片 | 动态生成小程序码 + 短链，带 `batchId` 参数 |
| KOC 推广 | 生成 kocId 绑定的推广链接 |
| 渠道上报 | `POST /v1/channel/report`（已在前端 `app.js` 实现） |
| 数据统计 | 扫码量 → 访问量 → 注册量 → 下单量 → GMV 漏斗 |

### 4.9 Logistics Module（物流）

| 功能 | 说明 |
|------|------|
| 物流查询 | 对接快递鸟/快递100 API 查询轨迹 |
| 状态同步 | 定时拉取物流状态，更新订单包裹状态 |
| 异常处理 | 超时未签收 → 自动提醒，72h → 人工介入 |

---

## 5. 订单路由引擎（详细设计）

### 5.1 输入参数

```typescript
interface OrderRouteInput {
  items: Array<{
    goodsId: string      // 商品ID
    skuId: string        // SKU ID
    quantity: number     // 数量
  }>
  address: {
    province: string     // 省
    city: string         // 市
    district: string     // 区
  }
}
```

### 5.2 路由规则（优先级从高到低）

```
1. 商品可用供应商       → 该 SKU 有哪些供应商在供货
2. 区域覆盖             → 供应商是否配送该城市
3. 库存充足             → 供应商当前库存 >= 购买数量
4. 价格最优             → 同等条件下选价格最低的
5. 运费最低             → 同等条件下选运费最低的
6. 历史履约率           → 优先选履约率高的供应商
```

### 5.3 伪代码

```typescript
async function routeOrder(input: OrderRouteInput): Promise<SupplierAssignment[]> {
  const result: SupplierAssignment[] = []
  
  for (const item of input.items) {
    // 1. 查该 SKU 的所有供应商
    const suppliers = await db.skuSupplier.findMany({
      where: { skuId: item.skuId, status: 'active' },
      include: { supplier: true }
    })
    
    // 2. 过滤：区域 + 库存
    const candidates = suppliers.filter(s => 
      s.supplier.deliveryRegions.includes(input.address.city) &&
      s.stock >= item.quantity
    )
    
    // 3. 排序：价格 → 运费 → 履约率
    candidates.sort((a, b) => 
      a.price - b.price ||
      a.freight - b.freight ||
      b.fulfillRate - a.fulfillRate
    )
    
    if (candidates.length === 0) {
      throw new RouteError(`商品 ${item.goodsId} 无可配送供应商`)
    }
    
    result.push({
      skuId: item.skuId,
      supplierId: candidates[0].supplierId,
      quantity: item.quantity,
      unitPrice: candidates[0].price,
      freight: candidates[0].freight
    })
  }
  
  return result
}
```

### 5.4 拆单结果示例

```
用户购买了：
  - 阿克苏苹果 (供应商A、B都有)
  - 有机菠菜 (只有供应商C有)

拆单结果：
  包裹1 → 供应商A → 阿克苏苹果 ×1
  包裹2 → 供应商C → 有机菠菜 ×2
```

---

## 6. 数据库设计要点

### 6.1 核心表（共 ~20 张）

```
用户体系：
  users           用户表（openid, nickname, phone, location）
  addresses       收货地址表

商品体系：
  categories      分类表（两级）
  goods           商品表
  skus            SKU 表（规格 + 价格）
  goods_images    商品图片表
  sku_suppliers   供应商商品关联表（价格、库存）

交易体系：
  orders          订单表（父订单）
  order_items     订单商品行
  order_packages  包裹表（子订单，对应供应商）
  payments        支付记录表

营销体系：
  coupons         优惠券模板
  user_coupons    用户优惠券

分销体系：
  koc_users       KOC 分销员表
  koc_earnings    佣金记录表
  koc_withdraws   提现记录表

渠道体系：
  channel_reports 渠道上报记录
  channel_cards   包裹卡片批次

物流体系：
  logistics_tracks 物流轨迹表
```

### 6.2 关键索引

```sql
-- 商品查询
CREATE INDEX idx_goods_category ON goods(category_id, status);
CREATE INDEX idx_goods_name ON goods USING gin(name gin_trgm_ops);  -- 中文模糊搜索

-- 订单查询（高频）
CREATE INDEX idx_orders_user ON orders(user_id, status);
CREATE INDEX idx_orders_status ON orders(status, created_at);
CREATE INDEX idx_orders_sn ON orders(order_sn);

-- KOC 归因
CREATE INDEX idx_channel_koc ON channel_reports(koc_id, created_at);
CREATE INDEX idx_order_koc ON orders(koc_id);  -- 订单归属 KOC

-- 路由查询
CREATE INDEX idx_sku_supp ON sku_suppliers(sku_id, status, stock);
```

---

## 7. 第三方对接

### 7.1 微信生态

| 能力 | 接口 | 用途 |
|------|------|------|
| 登录 | `wx.login()` → `code2Session` | 用户身份认证 |
| 支付 | 微信支付 V3 - JSAPI | 小程序内支付 |
| 手机号 | `getPhoneNumber` | 快速获取手机号 |
| 小程序码 | `wxacode.getUnlimited` | 生成带参数的推广码 |
| 订阅消息 | `subscribeMessage.send` | 订单状态通知 |
| URL Scheme | `generateUrlLink` | 短信/卡片跳转小程序 |

### 7.2 WMS 对接（按需，v1.2+）

| WMS | 对接方式 | 数据同步 |
|-----|---------|---------|
| 店管家 | REST API | 订单推送 → 发货回传 → 库存同步 |
| 聚水潭 | REST API | 同上 |

**v1.0 策略：** 先用管理后台手动录入快递单号，WMS 对接放到 v1.2。

### 7.3 物流查询

- **快递鸟**（推荐）：免费额度充足，支持 600+ 快递公司
- 备选：快递 100

### 7.4 短信通知（可选）

- 腾讯云 SMS：订单确认、发货通知等短信触达
- v1.0 优先用微信订阅消息，短信作为降级方案

---

## 8. 部署方案

### 8.1 推荐：微信云托管（零运维）

微信云托管是首选方案，NestJS 应用打包为 Docker 镜像后直接推送部署：

```
本地开发 → Git Push
    ↓
微信云托管 CLI / GitHub Actions
    ↓
自动构建 Docker → 推送镜像 → 灰度发布 → 全量上线
    ↓
自带：数据库 + Redis + COS + CDN + 日志 + 监控
```

| 资源 | 说明 | 费用 |
|------|------|:--:|
| 云托管 | 1vCPU 2G，弹性伸缩 | ~¥100-200/月 |
| 云数据库 | Serverless，按量计费 | ~¥50-100/月 |
| 云存储 + CDN | 图片、静态资源 | ~¥10/月 |
| **合计** | | **~¥160-310/月** |

### 8.2 备选：自建服务器

| 资源 | 配置 | 月费 |
|------|------|:--:|
| 服务器 | 2核4G，80G SSD | ~¥80 |
| PostgreSQL | 云数据库 1核2G | ~¥150 |
| Redis | 云缓存 1G | ~¥50 |
| COS | 50G + CDN | ~¥10 |
| **合计** | | **~¥290/月** |

### 8.3 Dockerfile 模板

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### 8.4 CI/CD

```
Git Push → 云托管自动构建流水线
  ├── Lint + TypeCheck
  ├── Build Docker + Push 镜像
  └── 灰度 → 全量上线（云托管控制台一键操作）
```



---

## 9. 开发路线图

### Phase 1：核心闭环（3-4 周）

| 周次 | 任务 | 交付物 |
|:--:|------|------|
| W1 | 项目脚手架 + Auth + User 模块 | 微信登录、Token、用户信息、地址 CRUD |
| W2 | Goods + Cart + Search 模块 | 商品 CRUD、分类、购物车、搜索 |
| W3 | Order + Payment 模块（含路由引擎） | 下单、支付、订单列表/详情、取消 |
| W4 | 管理后台骨架 + 联调测试 | 供应商/商品管理、端到端流程跑通 |

### Phase 2：营销与分销（2-3 周）

| 周次 | 任务 |
|:--:|------|
| W5 | Coupon 模块、新人券 |
| W6 | KOC 模块（入驻、推广、分佣） |
| W7 | Channel 渠道追踪、包裹卡片生成 |

### Phase 3：效率与体验（3-4 周）

| 周次 | 任务 |
|:--:|------|
| W8-9 | WMS 对接（店管家 + 聚水潭） |
| W10 | 物流轨迹、售后流程 |
| W11 | 性能优化、压力测试、上线准备 |

### Phase 4（持续迭代）

- 供应商管理后台完善
- 数据看板（运营后台）
- 智能路由优化（ML 选品模型）
- 小程序直播带货

---

## 附录：项目目录结构建议

```
vshop-server/
├── src/
│   ├── main.ts                 # 入口
│   ├── app.module.ts           # 根模块
│   ├── common/                 # 通用
│   │   ├── guards/auth.guard.ts
│   │   ├── pipes/validation.pipe.ts
│   │   ├── filters/http-exception.filter.ts
│   │   └── interceptors/response.interceptor.ts
│   ├── modules/
│   │   ├── auth/               # 用户授权
│   │   ├── user/               # 用户信息 + 地址
│   │   ├── goods/              # 商品 + 分类 + SKU
│   │   ├── cart/               # 购物车
│   │   ├── order/              # 订单
│   │   ├── payment/            # 支付
│   │   ├── coupon/             # 优惠券
│   │   ├── koc/                # KOC 分销
│   │   ├── channel/            # 渠道追踪
│   │   ├── logistics/          # 物流
│   │   └── admin/              # 管理后台（供应商+运营）
│   └── lib/
│       ├── prisma/             # Prisma schema + 迁移
│       ├── redis/              # Redis 连接
│       ├── wechat/             # 微信 SDK 封装
│       └── queue/              # BullMQ 队列定义
├── prisma/
│   └── schema.prisma           # 数据库 Schema
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```
