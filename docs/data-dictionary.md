# Vshop 数据库数据字典

> 基于 `vshop-server/prisma/schema.prisma` 生成  
> 数据库类型：MySQL | ORM：Prisma | 当前版本：v1.0 | 更新时间：2026-07-09

---

## 变更记录

| 版本 | 日期 | 变更类型 | 表名 | 字段 | 变更前 | 变更后 | 说明 |
|------|------|----------|------|------|--------|--------|------|
| v1.0 | 2026-07-09 | — | — | — | — | — | 初始化数据字典基线 |

---

## 表概览

| 序号 | 表名 | 中文名 | 字段数 | 说明 |
|------|------|--------|--------|------|
| 1 | Address | 收货地址表 | 11 | 用户收货地址，支持多地址、默认地址 |
| 2 | Aftersale | 售后表 | 18 | 退款/退货退款申请与处理 |
| 3 | AppSetting | 应用设置表 | 3 | 通用 key-value 配置（如自动同步开关） |
| 4 | CartItem | 购物车表 | 4 | 用户购物车，按用户+SKU 去重 |
| 5 | Category | 商品分类表（一级） | 5 | 一级分类（如水果、蔬菜、肉类） |
| 6 | ChannelReport | 渠道归因表 | 5 | 用户来源渠道埋点（KOC/包裹卡片） |
| 7 | ChatMessage | 客服消息表 | 5 | 会话内消息明细 |
| 8 | ChatSession | 客服会话表 | 11 | 在线客服会话记录，含未读计数 |
| 9 | Coupon | 优惠券模板表 | 11 | 优惠券定义（现金券/折扣券），支持库存管理 |
| 10 | Favorite | 收藏表 | 4 | 用户商品收藏，按用户+商品去重 |
| 11 | Good | 商品表 | 12 | 商品主表，含折扣、推荐标记 |
| 12 | GoodDetailImage | 商品详情图表 | 4 | 详情页纵向铺图，按 sort 排序 |
| 13 | GoodImage | 商品图片表（轮播图） | 4 | 商品主图（轮播图），按 sort 排序 |
| 14 | GoodSupplier | 商品供应商关联表 | 8 | 商品-SKU-供应商三方关联（含供货价/库存/运费） |
| 15 | KocProfile | KOC 分销员资料表 | 12 | KOC 申请、审核、佣金配置 |
| 16 | Order | 订单表 | 17 | 订单主表，含店管家同步状态 |
| 17 | OrderItem | 订单商品项表 | 8 | 订单内商品明细（冗余商品标题/规格/图片） |
| 18 | OrderPackage | 订单包裹表 | 7 | 订单包裹物流信息（一单多包场景） |
| 19 | Payment | 支付表 | 9 | 微信支付记录，与订单 1:1 |
| 20 | Sku | 商品 SKU 表 | 3 | 多规格库存单位，价格以分为单位 |
| 21 | SubCategory | 商品子分类表（二级） | 4 | 二级分类，归属一级分类 |
| 22 | Supplier | 供应商表 | 8 | 供应商基础信息与履约数据 |
| 23 | User | 用户表 | 11 | 微信小程序用户基础信息 + KOC 标识 |
| 24 | UserCoupon | 用户优惠券表 | 6 | 用户领取的优惠券实例与使用状态 |

---

## 1. Address — 收货地址表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 地址 ID |
| userId | String | ✅ | — | — | 所属用户 |
| name | String | ✅ | — | — | 收货人姓名 |
| phone | String | ✅ | — | — | 收货人手机号 |
| province | String | ✅ | — | — | 省份 |
| city | String | ✅ | — | — | 城市 |
| district | String | ✅ | — | — | 区/县 |
| detail | String | ✅ | — | — | 详细地址 |
| isDefault | Boolean | ✅ | — | false | 是否默认地址 |
| createdAt | DateTime | ✅ | — | now() | 创建时间 |
| updatedAt | DateTime | ✅ | auto | — | 更新时间 |

**关联关系：**
- `User`（one）
- `Order`（many）


## 2. Aftersale — 售后表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 售后 ID |
| aftersaleSn | String | ✅ | 唯一 | — | 售后单号 |
| userId | String | ✅ | — | — | 用户 ID |
| orderId | String | ✅ | — | — | 订单 ID |
| orderItemId | String | — | — | — | 售后商品项 ID |
| packageIndex | Int | ✅ | — | 0 | 包裹序号 |
| type | Int | ✅ | — | — | 售后类型（1 仅退款 / 2 退货退款） |
| reason | String | ✅ | — | — | 售后原因 |
| description | String | — | — | — | 问题描述 |
| evidenceImages | Json | ✅ | — | — | 凭证图片 URL 数组 |
| refundAmount | Int | ✅ | — | — | 退款金额（分） |
| refundNo | String | — | — | — | 退款单号（out_refund_no） |
| refundId | String | — | — | — | 微信退款单号 |
| refundStatus | String | — | — | — | 微信退款状态（PROCESSING/SUCCESS/CLOSED/ABNORMAL） |
| adminRemark | String | — | — | — | 管理员备注 |
| status | Int | ✅ | — | 0 | 审核状态（0待审核 1已同意 2已拒绝 3退款中 4已退款 5已完成） |
| createdAt | DateTime | ✅ | — | now() | 创建时间 |
| updatedAt | DateTime | ✅ | auto | — | 更新时间 |

**索引：**
- `@@index([userId])`
- `@@index([orderId])`
- `@@index([status])`

**关联关系：**
- `User`（one）
- `Order`（one）


## 3. AppSetting — 应用设置表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| key | String | ✅ | PK | — | 配置键（如 dianjia_auto_sync） |
| value | String | ✅ | — | — | 配置值 |
| updatedAt | DateTime | ✅ | auto | — | 更新时间 |


## 4. CartItem — 购物车表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 购物车项 ID |
| userId | String | ✅ | — | — | 用户 ID |
| skuId | String | ✅ | — | — | SKU ID |
| quantity | Int | ✅ | — | 1 | 数量 |

**索引：**
- `@@index([userId,skuId])`

**关联关系：**
- `User`（one）
- `Sku`（one）


## 5. Category — 商品分类表（一级）

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 分类 ID |
| name | String | ✅ | — | — | 分类名称 |
| icon | String | — | — | — | 分类图标 URL |
| sort | Int | ✅ | — | 0 | 排序（越小越前） |
| status | String | ✅ | — | "active" | 状态（active/disabled） |

**关联关系：**
- `SubCategory`（many）


## 6. ChannelReport — 渠道归因表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 归因记录 ID |
| source | String | ✅ | — | — | 来源渠道（koc/card） |
| kocId | String | — | — | — | KOC ID（source=koc 时） |
| batchId | String | — | — | — | 批次 ID（包裹卡片批号） |
| createdAt | DateTime | ✅ | — | now() | 记录时间 |

**索引：**
- `@@index([kocId])`
- `@@index([batchId])`


## 7. ChatMessage — 客服消息表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 消息 ID |
| sessionId | String | ✅ | — | — | 会话 ID |
| sender | String | ✅ | — | — | 发送者（user/admin） |
| content | String | ✅ | — | — | 消息内容 |
| createdAt | DateTime | ✅ | — | now() | 发送时间 |

**关联关系：**
- `ChatSession`（one）


## 8. ChatSession — 客服会话表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 会话 ID |
| userId | String | ✅ | — | — | 用户 ID |
| goodId | String | — | — | — | 关联商品（从商品页发起时） |
| title | String | — | — | — | 会话标题 |
| lastMessage | String | — | — | — | 最后一条消息（冗余） |
| lastAt | DateTime | ✅ | — | — | 最后消息时间 |
| userUnread | Int | ✅ | — | 0 | 用户未读数 |
| adminUnread | Int | ✅ | — | 0 | 客服未读数 |
| closed | Boolean | ✅ | — | — | 是否已关闭 |
| createdAt | DateTime | ✅ | — | now() | 创建时间 |
| updatedAt | DateTime | ✅ | auto | — | 更新时间 |

**关联关系：**
- `User`（one）
- `ChatMessage`（many）


## 9. Coupon — 优惠券模板表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 优惠券模板 ID |
| name | String | ✅ | — | — | 优惠券名称 |
| type | String | ✅ | — | — | 类型（cash 现金券 / discount 折扣券） |
| value | Int | — | — | — | 面额（分），type=cash 使用 |
| discountValue | Float | — | — | — | 折扣率（0~1），type=discount 使用 |
| minAmount | Int | ✅ | — | 0 | 满减门槛（分） |
| scopeType | String | ✅ | — | "all" | 适用范围（all 全场） |
| totalCount | Int | ✅ | — | — | 发放总量 |
| usedCount | Int | ✅ | — | 0 | 已领取数 |
| expireTime | DateTime | ✅ | — | — | 过期时间 |
| status | String | ✅ | — | "active" | 状态（active/disabled） |

**关联关系：**
- `UserCoupon`（many）


## 10. Favorite — 收藏表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 收藏 ID |
| userId | String | ✅ | — | — | 用户 ID |
| goodId | String | ✅ | — | — | 商品 ID |
| createdAt | DateTime | ✅ | — | now() | 收藏时间 |

**索引：**
- `@@unique([userId,goodId])`

**关联关系：**
- `Good`（one）


## 11. Good — 商品表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 商品 ID |
| subCategoryId | String | — | — | — | 所属子分类 |
| name | String | ✅ | — | — | 商品名称 |
| description | String | — | — | — | 商品简介 |
| detail | String | — | — | — | 商品详情（富文本） |
| sales | Int | ✅ | — | 0 | 销量 |
| status | String | ✅ | — | "active" | 状态（active/offline） |
| discountRate | Float | — | — | — | 商品级折扣率（0~1，null 无折扣） |
| isRecommended | Boolean | ✅ | — | false | 是否今日推荐 |
| recommendSort | Int | ✅ | — | 0 | 推荐排序 |
| createdAt | DateTime | ✅ | — | now() | 创建时间 |
| updatedAt | DateTime | ✅ | auto | — | 更新时间 |

**索引：**
- `@@index([status])`
- `@@index([isRecommended,recommendSort])`

**关联关系：**
- `SubCategory`（one）
- `Sku`（many）
- `GoodImage`（many）
- `GoodDetailImage`（many）
- `GoodSupplier`（many）
- `Favorite`（many）


## 12. GoodDetailImage — 商品详情图表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 图片 ID |
| goodId | String | ✅ | — | — | 所属商品 |
| url | String | ✅ | — | — | 图片 URL |
| sort | Int | ✅ | — | 0 | 排序（升序展示） |

**关联关系：**
- `Good`（one）


## 13. GoodImage — 商品图片表（轮播图）

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 图片 ID |
| goodId | String | ✅ | — | — | 所属商品 |
| url | String | ✅ | — | — | 图片 URL |
| sort | Int | ✅ | — | 0 | 排序 |

**关联关系：**
- `Good`（one）


## 14. GoodSupplier — 商品供应商关联表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 关联 ID |
| goodId | String | ✅ | — | — | 商品 ID |
| supplierId | String | ✅ | — | — | 供应商 ID |
| skuId | String | ✅ | — | — | SKU ID |
| price | Int | ✅ | — | — | 供货价（分） |
| stock | Int | ✅ | — | 0 | 供货库存 |
| freight | Int | ✅ | — | 0 | 运费（分） |
| status | String | ✅ | — | "active" | 状态 |

**关联关系：**
- `Good`（one）
- `Supplier`（one）
- `Sku`（one）


## 15. KocProfile — KOC 分销员资料表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 资料 ID |
| userId | String | ✅ | 唯一 | — | 用户 ID（1:1） |
| realName | String | ✅ | — | — | 真实姓名 |
| phone | String | ✅ | — | — | 手机号 |
| socialAccount | String | — | — | — | 社交账号（微信号/手机） |
| introduction | String | — | — | — | 自我介绍/申请说明 |
| status | String | ✅ | — | "pending" | 审核状态（pending/approved/rejected/disabled） |
| rejectReason | String | — | — | — | 驳回原因 |
| commissionRate | Float | — | — | — | 自定义佣金率（0~1），null 走系统默认阶梯 |
| reviewedAt | DateTime | — | — | — | 审核时间 |
| createdAt | DateTime | ✅ | — | now() | 申请时间 |
| updatedAt | DateTime | ✅ | auto | — | 更新时间 |

**关联关系：**
- `User`（one）


## 16. Order — 订单表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 订单 ID |
| orderSn | String | ✅ | 唯一 | — | 订单编号（展示用） |
| userId | String | ✅ | — | — | 用户 ID |
| addressId | String | — | — | — | 收货地址 ID |
| supplierId | String | — | — | — | 供应商 ID |
| status | String | ✅ | — | — | 订单状态（pending/shipping/receiving/done） |
| totalAmount | Int | ✅ | — | — | 商品总金额（分） |
| discountAmount | Int | ✅ | — | 0 | 优惠金额（分） |
| freightAmount | Int | ✅ | — | 0 | 运费（分） |
| payAmount | Int | ✅ | — | — | 实付金额（分） |
| remark | String | — | — | — | 订单备注 |
| platformOrderId | String | — | — | — | 店管家平台单号 |
| dianjiaSyncStatus | String | — | — | — | 店管家同步状态（synced/failed） |
| dianjiaSyncedAt | DateTime | — | — | — | 最近同步时间 |
| kocId | String | — | — | — | KOC 分销员 ID（分销佣金溯源） |
| createdAt | DateTime | ✅ | — | now() | 创建时间 |
| updatedAt | DateTime | ✅ | auto | — | 更新时间 |

**索引：**
- `@@index([status])`
- `@@index([userId,status])`
- `@@index([dianjiaSyncStatus])`

**关联关系：**
- `User`（one）
- `Address`（one）
- `Supplier`（one）
- `OrderItem`（many）
- `OrderPackage`（many）
- `Payment`（one）
- `Aftersale`（many）


## 17. OrderItem — 订单商品项表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 订单项 ID |
| orderId | String | ✅ | — | — | 订单 ID |
| skuId | String | ✅ | — | — | SKU ID |
| goodTitle | String | ✅ | — | — | 商品标题（下单快照） |
| specName | String | — | — | — | 规格名称（下单快照） |
| image | String | — | — | — | 商品图片（下单快照） |
| price | Int | ✅ | — | — | 下单单价（分） |
| quantity | Int | ✅ | — | — | 数量 |

**关联关系：**
- `Order`（one）
- `Sku`（one）


## 18. OrderPackage — 订单包裹表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 包裹 ID |
| orderId | String | ✅ | — | — | 订单 ID |
| supplierId | String | — | — | — | 供应商 ID |
| supplierName | String | ✅ | — | — | 供应商名称（快照） |
| status | Int | ✅ | — | — | 物流状态（0待发货 1已打单 2已发货 3运输中 4派送中 5已签收） |
| expressCompany | String | — | — | — | 快递公司 |
| expressNo | String | — | — | — | 快递单号 |

**关联关系：**
- `Order`（one）


## 19. Payment — 支付表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 支付 ID |
| orderId | String | ✅ | 唯一 | — | 订单 ID（1:1） |
| amount | Int | ✅ | — | — | 支付金额（分） |
| status | String | ✅ | — | "pending" | 支付状态（pending/success/failed/refund） |
| payTime | DateTime | — | — | — | 支付时间 |
| transactionId | String | — | — | — | 微信支付交易号 |
| prepayId | String | — | — | — | 微信预支付 ID |
| provider | String | — | — | "wechatpay" | 支付渠道（wechatpay/mock） |
| createdAt | DateTime | ✅ | — | now() | 创建时间 |

**关联关系：**
- `Order`（one）


## 20. Sku — 商品 SKU 表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | SKU ID |
| goodId | String | ✅ | — | — | 所属商品 |
| name | String | ✅ | — | — | SKU 名称（单规格回退展示） |


## 21. SubCategory — 商品子分类表（二级）

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 子分类 ID |
| categoryId | String | ✅ | — | — | 所属一级分类 |
| name | String | ✅ | — | — | 子分类名称 |
| sort | Int | ✅ | — | 0 | 排序（越小越前） |

**关联关系：**
- `Category`（one）
- `Good`（many）


## 22. Supplier — 供应商表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 供应商 ID |
| name | String | ✅ | — | — | 供应商名称 |
| contactName | String | — | — | — | 联系人 |
| contactPhone | String | — | — | — | 联系电话 |
| deliveryRegions | Json | — | — | — | 配送区域（城市 JSON 数组） |
| fulfillRate | Float | ✅ | — | 100 | 履约率（%） |
| status | String | ✅ | — | "active" | 状态（active/disabled） |
| createdAt | DateTime | ✅ | — | now() | 创建时间 |

**关联关系：**
- `GoodSupplier`（many）
- `Order`（many）


## 23. User — 用户表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 用户唯一 ID |
| openid | String | ✅ | 唯一 | — | 微信小程序 OpenID |
| unionId | String | — | 唯一 | — | 微信 UnionID（跨应用用户识别） |
| nickname | String | — | — | — | 用户昵称 |
| avatar | String | — | — | — | 头像 URL |
| phone | String | — | — | — | 手机号 |
| location | String | — | — | — | 用户位置（城市级别） |
| isKoc | Boolean | ✅ | — | false | 是否为 KOC 分销员 |
| kocApprovedAt | DateTime | — | — | — | KOC 审核通过时间 |
| createdAt | DateTime | ✅ | — | now() | 创建时间 |
| updatedAt | DateTime | ✅ | auto | — | 更新时间 |

**关联关系：**
- `Address`（many）
- `Order`（many）
- `CartItem`（many）
- `UserCoupon`（many）
- `KocProfile`（one）
- `ChatSession`（many）
- `Aftersale`（many）


## 24. UserCoupon — 用户优惠券表

| 字段 | 类型 | 必填 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| id | String | ✅ | PK | cuid() | 领取记录 ID |
| userId | String | ✅ | — | — | 用户 ID |
| couponId | String | ✅ | — | — | 优惠券模板 ID |
| status | String | ✅ | — | — | 状态（usable/used/expired） |
| usedAt | DateTime | — | — | — | 使用时间 |
| createdAt | DateTime | ✅ | — | now() | 领取时间 |

**关联关系：**
- `User`（one）
- `Coupon`（one）

