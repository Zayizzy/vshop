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
- `public/uploads/` 容器内不持久化 → **已改云开发对象存储（2026-07）**：`vshop-server/src/modules/upload/cos.service.ts` 用 `@cloudbase/node-sdk`，云托管容器内 `tcb.init({env})` 自动从元数据服务取临时凭证对接同账号对象存储（**零密钥配置**）。可选环境变量 `TCB_ENV_ID`（默认 `1452085588`），未配/非云托管回退本地磁盘
- 小程序端推荐 `wx.cloud.callContainer` 内网调用，免域名配置

## 文档
- PRD：`docs/PRD.md`
- 部署指南：`docs/deploy-wx-cloudrun.md`

## 版本规划
- v1.0 MVP：核心交易闭环
- v1.1：KOC分销体系完整上线
- v1.2：营销与运营深化
- v2.0：效率与体验升级
