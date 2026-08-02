# 生鲜商城小程序 · 项目记忆

## 项目定位
本地服务 + 私域流量的生鲜商城微信小程序。次日达，供应商直发，多供应链并行。

## 商业模式核心
- **获客**：包裹卡片引流 + KOC社交分销
- **履约**：次日达，供应商直接发货，截单时间每日20:00
- **供应链**：多供应商并行入驻，订单路由引擎（按商品/区域/库存/价格），对接店管家&聚水潭WMS

## 技术选型
- 前端：微信小程序原生 / TDesign Mini Program
- 后端：NestJS 10 + Prisma 5 + MySQL 8.0（位于 `vshop-server/`）
- WMS：店管家、聚水潭
- 部署：微信云托管（文档见 `docs/deploy-wx-cloudrun.md`）

## 部署关键点（微信云托管）
- Dockerfile 需执行 `prisma migrate deploy` 后再启动
- `prisma` 必须在 dependencies（不能只在 devDependencies）
- `main.ts` 的 `/assets` 路径引用了 `../miniprogram/assets`，容器内不存在，需在 Dockerfile 中复制
- `public/uploads/` 容器内不持久化 → **已改云托管 COS（v3，2026-07-27）**：`cos.service.ts` 用 `cos-nodejs-sdk-v5` + 云托管元数据 STS（`metadata.tencentyun.com/.../security-credentials/<role>`）。**前置**：CAM 给服务运行角色授对象存储读写权限（一次性，零 API 密钥）。可选环境变量 `COS_BUCKET/REGION/ROLE_NAME`（均有默认值取自截图）
- 小程序端推荐 `wx.cloud.callContainer` 内网调用，免域名配置

## Admin 后台鉴权（JWT）
- 2026-07-28 改造：admin 接口用 `AdminAuthGuard`（`common/guards/admin-auth.guard.ts`）验证后台 JWT（payload `{supplierId,role,name}`），从 `req.user` 取，去掉 `x-supplier-id` 头 + `'s1'` fallback
- `admin.service.login` 注入 JwtService，签发真 JWT；查 Supplier 表确定 supplierId（传入校验或取第一个 active），不再返回伪 token / 不再硬编码 `supplier:{id:'s1'}`
- 彻底解决生产 Supplier 表无 `'s1'` 导致 `GoodSupplier` 外键违反（商品保存 500 → 图片没绑上 → 前端"没有图片"）
- `AdminLoginDto` 加可选 `supplierId`；`admin.module` 注册 `AdminAuthGuard` provider（否则 @UseGuards 运行时 DI 解析失败）
- 前端 `public/index.html` `authHeaders/uploadHeaders` 去 `x-supplier-id`/`x-admin-role`，只带 `Authorization`

## 文档
- PRD：`docs/PRD.md`
- 部署指南：`docs/deploy-wx-cloudrun.md`

## 价格体系（重要：三种价格语义，勿混淆）
- `Sku.price`（Int 分）= 折前价/商品基础价；后端列表接口输出为 `originalPrice`（元）
- `Sku.marketPrice`（Int? 分）= 市场价/划线价（商家显式设置，可空）；后端输出为 `marketPrice`（元，`centToYuanNullable` 透传 null）
- `Good.discountRate`（Float? 0~1）= 商品级折扣率；折后价 = price × discountRate；后端输出 `price`（折后）+ `discountRate`
- **划线价展示统一逻辑**（2026-07-30 修复后）：优先 `marketPrice`（商家设的市场价），回退 `originalPrice`（折扣率场景的折前价）；仅当划线价 > 实付价时展示
  - 详情页：`detail.js` `computeLinePrice()` → `goods.linePrice` → `detail.wxml`
  - 列表卡片：`goods-card.js` `resolve()` oldPrice 优先 marketPrice 回退 originalPrice
  - admin 后台：单规格 `singleSpecRow` 有 `productMarketPrice` 输入框；多规格矩阵有 `specMarket_*` 列
- 后端 marketPrice 判空必须用 `!= null`（不能用 `? :`，否则 0 被当空值）

## 版本规划
- v1.0 MVP：核心交易闭环
- v1.1：KOC分销体系完整上线
- v1.2：营销与运营深化
- v2.0：效率与体验升级

## 订单状态语义（重要，勿混淆）
后端 Order.status 五态（`payment.service.ts:83` 注释为权威定义）：
- `pending` = 待付款（下单未支付）
- `shipping` = 待发货（已支付，等供应商发货）
- `receiving` = 待收货（已发货，运输中）
- `done` = 已完成（用户确认收货）
- `cancelled` = 已取消

状态流转：
- 下单 → pending；支付成功 → payment.status=paid + order.status: pending→shipping（`payment.service.ts:84`）
- 发货 → order.status: shipping→receiving，包裹 status=2（`admin.service.ts:675`）
- 确认收货 → order.status: receiving→done，包裹 status=5（`order.service.ts:592`）

包裹状态（OrderPackage.status, Int）：0待发货 1已打单 2已发货 3运输中 4派送中 5已签收

注意：admin 后台 `public/index.html` 曾把 shipping 错显为"已发货"（2026-08-02 修复），小程序端 `miniprogram/pages/order/list.js` 一直是正确的。
