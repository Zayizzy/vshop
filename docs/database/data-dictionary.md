# 数据库数据字典

> 自动生成于 2026/7/8 19:38:13，源文件：`vshop-server/prisma/schema.prisma`

## 目录

- [User](#user)
- [Address](#address)
- [Category](#category)
- [SubCategory](#subcategory)
- [Good](#good)
- [GoodImage](#goodimage)
- [GoodDetailImage](#gooddetailimage)
- [Sku](#sku)
- [Supplier](#supplier)
- [GoodSupplier](#goodsupplier)
- [CartItem](#cartitem)
- [Order](#order)
- [OrderItem](#orderitem)
- [OrderPackage](#orderpackage)
- [Payment](#payment)
- [Favorite](#favorite)
- [Coupon](#coupon)
- [UserCoupon](#usercoupon)
- [ChannelReport](#channelreport)
- [KocProfile](#kocprofile)
- [ChatSession](#chatsession)
- [ChatMessage](#chatmessage)
- [Aftersale](#aftersale)
- [AppSetting](#appsetting)

## User

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `openid` | String | 是 | 唯一 | - |
| `unionId` | String? | 否 | 唯一 | - |
| `nickname` | String? | 否 | - | - |
| `avatar` | String? | 否 | - | - |
| `phone` | String? | 否 | - | - |
| `location` | String? | 否 | - | - |
| `isKoc` | Boolean | 否 | 默认 false | - |
| `kocApprovedAt` | DateTime? | 否 | - | - |
| `createdAt` | DateTime | 否 | 默认 now() | - |
| `updatedAt` | DateTime | 是 | 自动更新 | - |
| `addresses` | Address[] | 是（数组） | - | 数组 |
| `orders` | Order[] | 是（数组） | - | 数组 |
| `cartItems` | CartItem[] | 是（数组） | - | 数组 |
| `coupons` | UserCoupon[] | 是（数组） | - | 数组 |
| `kocProfile` | KocProfile? | 否 | - | - |
| `chatSessions` | ChatSession[] | 是（数组） | - | 数组 |
| `aftersales` | Aftersale[] | 是（数组） | - | 数组 |

## Address

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `userId` | String | 是 | - | - |
| `name` | String | 是 | - | - |
| `phone` | String | 是 | - | - |
| `province` | String | 是 | - | - |
| `city` | String | 是 | - | - |
| `district` | String | 是 | - | - |
| `detail` | String | 是 | - | - |
| `isDefault` | Boolean | 否 | 默认 false | - |
| `createdAt` | DateTime | 否 | 默认 now() | - |
| `updatedAt` | DateTime | 是 | 自动更新 | - |
| `user` | User | 是 | 外键 → id | 关联 User |
| `orders` | Order[] | 是（数组） | - | 数组 |

## Category

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `name` | String | 是 | - | - |
| `icon` | String? | 否 | - | - |
| `sort` | Int | 否 | 默认 0 | - |
| `status` | String | 否 | 默认 "active" | - |
| `subCategories` | SubCategory[] | 是（数组） | - | 数组 |

## SubCategory

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `categoryId` | String | 是 | - | - |
| `name` | String | 是 | - | - |
| `sort` | Int | 否 | 默认 0 | - |
| `category` | Category | 是 | 外键 → id | 关联 Category |
| `goods` | Good[] | 是（数组） | - | 数组 |

## Good

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `subCategoryId` | String? | 否 | - | - |
| `name` | String | 是 | - | - |
| `description` | String? | 否 | - | - |
| `detail` | String? | 否 | - | - |
| `sales` | Int | 否 | 默认 0 | - |
| `status` | String | 否 | 默认 "active" | - |
| `discountRate` | Float? | 否 | - | 商品级折扣率（0~1，如 0.8 = 8折）。null 表示无折扣。 展示与下单均按 price × discountRate 计算折后价。 |
| `isRecommended` | Boolean | 否 | 默认 false | 是否为今日推荐商品（首页"今日推荐"展示） |
| `recommendSort` | Int | 否 | 默认 0 | 推荐排序（越小越靠前） |
| `createdAt` | DateTime | 否 | 默认 now() | - |
| `updatedAt` | DateTime | 是 | 自动更新 | - |
| `subCategory` | SubCategory? | 否 | 外键 → id | 关联 SubCategory |
| `skus` | Sku[] | 是（数组） | - | 数组 |
| `images` | GoodImage[] | 是（数组） | - | 数组 |
| `detailImages` | GoodDetailImage[] | 是（数组） | - | 数组 |
| `suppliers` | GoodSupplier[] | 是（数组） | - | 数组 |
| `favorites` | Favorite[] | 是（数组） | - | 数组 |

**索引**

| 类型 | 字段 | 说明 |
|------|------|------|
| index | `status` | - |
| index | `isRecommended`, `recommendSort` | - |

## GoodImage

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `goodId` | String | 是 | - | - |
| `url` | String | 是 | - | - |
| `sort` | Int | 否 | 默认 0 | - |
| `good` | Good | 是 | 外键 → id | 关联 Good |

## GoodDetailImage

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `goodId` | String | 是 | - | - |
| `url` | String | 是 | - | - |
| `sort` | Int | 否 | 默认 0 | - |
| `good` | Good | 是 | 外键 → id | 关联 Good |

## Sku

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `goodId` | String | 是 | - | - |
| `name` | String | 是 | - | - |
| `specValues` | Json? | 否 | - | 多规格维度组合，MySQL 原生 JSON：[{"name":"颜色","value":"红"},...]。 为空表示单规格（回退 name 展示，兼容旧数据）。 |
| `price` | Int | 是 | - | 金额以「分」为单位（Int），避免浮点累计误差。Service 层转「元」对外 |
| `marketPrice` | Int? | 否 | - | - |
| `stock` | Int | 否 | 默认 0 | - |
| `platformSkuId` | String? | 否 | - | 店管家平台商品规格 id（product/items/upload 成功回写，代发订单对账用） |
| `good` | Good | 是 | 外键 → id | 关联 Good |
| `suppliers` | GoodSupplier[] | 是（数组） | - | 数组 |
| `cartItems` | CartItem[] | 是（数组） | - | 数组 |
| `orderItems` | OrderItem[] | 是（数组） | - | 数组 |

## Supplier

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `name` | String | 是 | - | - |
| `contactName` | String? | 否 | - | - |
| `contactPhone` | String? | 否 | - | - |
| `deliveryRegions` | Json? | 否 | - | JSON array of cities |
| `fulfillRate` | Float | 否 | 默认 100 | - |
| `status` | String | 否 | 默认 "active" | - |
| `createdAt` | DateTime | 否 | 默认 now() | - |
| `goodSuppliers` | GoodSupplier[] | 是（数组） | - | 数组 |
| `orders` | Order[] | 是（数组） | - | 数组 |

## GoodSupplier

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `goodId` | String | 是 | - | - |
| `supplierId` | String | 是 | - | - |
| `skuId` | String | 是 | - | - |
| `price` | Int | 是 | - | 金额以「分」为单位（Int） |
| `stock` | Int | 否 | 默认 0 | - |
| `freight` | Int | 否 | 默认 0 | - |
| `status` | String | 否 | 默认 "active" | - |
| `good` | Good | 是 | 外键 → id | 关联 Good |
| `supplier` | Supplier | 是 | 外键 → id | 关联 Supplier |
| `sku` | Sku | 是 | 外键 → id | 关联 Sku |

## CartItem

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `userId` | String | 是 | - | - |
| `skuId` | String | 是 | - | - |
| `quantity` | Int | 否 | 默认 1 | - |
| `user` | User | 是 | 外键 → id | 关联 User |
| `sku` | Sku | 是 | 外键 → id | 关联 Sku |

**索引**

| 类型 | 字段 | 说明 |
|------|------|------|
| index | `userId`, `skuId` | - |

## Order

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `orderSn` | String | 是 | 唯一 | - |
| `userId` | String | 是 | - | - |
| `addressId` | String? | 否 | - | - |
| `supplierId` | String? | 否 | - | - |
| `status` | String | 否 | 默认 "pending" | pending, shipping, receiving, done |
| `totalAmount` | Int | 是 | - | 金额以「分」为单位（Int） |
| `discountAmount` | Int | 否 | 默认 0 | - |
| `freightAmount` | Int | 否 | 默认 0 | - |
| `payAmount` | Int | 是 | - | - |
| `remark` | String? | 否 | - | - |
| `platformOrderId` | String? | 否 | - | 店管家平台单号（trade/order/upload 成功回写；发货回调 all.order.send 对账用） |
| `dianjiaSyncStatus` | String? | 否 | - | 店管家同步状态：synced=已同步 failed=同步失败 null=未同步 |
| `dianjiaSyncedAt` | DateTime? | 否 | - | 最近一次同步时间 |
| `kocId` | String? | 否 | - | - |
| `createdAt` | DateTime | 否 | 默认 now() | - |
| `updatedAt` | DateTime | 是 | 自动更新 | - |
| `user` | User | 是 | 外键 → id | 关联 User |
| `address` | Address? | 否 | 外键 → id | 关联 Address |
| `supplier` | Supplier? | 否 | 外键 → id | 关联 Supplier |
| `items` | OrderItem[] | 是（数组） | - | 数组 |
| `packages` | OrderPackage[] | 是（数组） | - | 数组 |
| `payment` | Payment? | 否 | - | - |
| `aftersales` | Aftersale[] | 是（数组） | - | 数组 |

**索引**

| 类型 | 字段 | 说明 |
|------|------|------|
| index | `status` | - |
| index | `userId`, `status` | - |
| index | `dianjiaSyncStatus` | - |

## OrderItem

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `orderId` | String | 是 | - | - |
| `skuId` | String | 是 | - | - |
| `goodTitle` | String | 是 | - | - |
| `specName` | String? | 否 | - | - |
| `image` | String? | 否 | - | - |
| `price` | Int | 是 | - | 单价以「分」为单位（Int） |
| `quantity` | Int | 是 | - | - |
| `order` | Order | 是 | 外键 → id | 关联 Order |
| `sku` | Sku | 是 | 外键 → id | 关联 Sku |

## OrderPackage

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `orderId` | String | 是 | - | - |
| `supplierId` | String? | 否 | - | - |
| `supplierName` | String | 是 | - | - |
| `status` | Int | 否 | 默认 0 | 0待发货 1已打单 2已发货 3运输中 4派送中 5已签收 |
| `expressCompany` | String? | 否 | - | - |
| `expressNo` | String? | 否 | - | - |
| `order` | Order | 是 | 外键 → id | 关联 Order |

## Payment

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `orderId` | String | 是 | 唯一 | - |
| `amount` | Int | 是 | - | 金额以「分」为单位（Int） |
| `status` | String | 否 | 默认 "pending" | - |
| `payTime` | DateTime? | 否 | - | - |
| `transactionId` | String? | 否 | - | 微信支付交易号（支付成功回写，退款/对账用） |
| `prepayId` | String? | 否 | - | 预支付ID（统一下单返回，排查用） |
| `provider` | String? | 否 | 默认 "wechatpay" | 支付渠道：wechatpay / mock |
| `createdAt` | DateTime | 否 | 默认 now() | - |
| `order` | Order | 是 | 外键 → id | 关联 Order |

## Favorite

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `userId` | String | 是 | - | - |
| `goodId` | String | 是 | - | - |
| `createdAt` | DateTime | 否 | 默认 now() | - |
| `good` | Good | 是 | 外键 → id | 关联 Good |

**索引**

| 类型 | 字段 | 说明 |
|------|------|------|
| unique | `userId`, `goodId` | - |

## Coupon

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `name` | String | 是 | - | - |
| `type` | String | 是 | - | cash | discount |
| `value` | Int? | 否 | - | 现金券面额（分）。type=cash 时使用 |
| `discountValue` | Float? | 否 | - | 折扣率（0~1，如 0.85）。type=discount 时使用，非金额故仍 Float |
| `minAmount` | Int | 否 | 默认 0 | 满减门槛（分） |
| `scopeType` | String | 否 | 默认 "all" | - |
| `totalCount` | Int | 是 | - | - |
| `usedCount` | Int | 否 | 默认 0 | - |
| `expireTime` | DateTime | 是 | - | - |
| `status` | String | 否 | 默认 "active" | active | disabled。disabled 后不再发放，已发放的不影响使用 |
| `userCoupons` | UserCoupon[] | 是（数组） | - | 数组 |

## UserCoupon

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `userId` | String | 是 | - | - |
| `couponId` | String | 是 | - | - |
| `status` | String | 否 | 默认 "usable" | usable, used, expired |
| `usedAt` | DateTime? | 否 | - | - |
| `createdAt` | DateTime | 否 | 默认 now() | - |
| `user` | User | 是 | 外键 → id | 关联 User |
| `coupon` | Coupon | 是 | 外键 → id | 关联 Coupon |

## ChannelReport

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `source` | String | 是 | - | koc | card |
| `kocId` | String? | 否 | - | - |
| `batchId` | String? | 否 | - | - |
| `createdAt` | DateTime | 否 | 默认 now() | - |

**索引**

| 类型 | 字段 | 说明 |
|------|------|------|
| index | `kocId` | - |
| index | `batchId` | - |

## KocProfile

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `userId` | String | 是 | 唯一 | - |
| `realName` | String | 是 | - | - |
| `phone` | String | 是 | - | - |
| `socialAccount` | String? | 否 | - | - |
| `introduction` | String? | 否 | - | - |
| `status` | String | 否 | 默认 "pending" | - |
| `rejectReason` | String? | 否 | - | - |
| `commissionRate` | Float? | 否 | - | 佣金率 0~1，null 表示用系统默认阶梯（按 orderCount 0.05/0.07/0.1） |
| `reviewedAt` | DateTime? | 否 | - | - |
| `createdAt` | DateTime | 否 | 默认 now() | - |
| `updatedAt` | DateTime | 是 | 自动更新 | - |
| `user` | User | 是 | 外键 → id | 关联 User |

## ChatSession

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `userId` | String | 是 | - | - |
| `goodId` | String? | 否 | - | 商品页发起时携带，可为空 |
| `title` | String? | 否 | - | 会话标题（商品名或「客服咨询」） |
| `lastMessage` | String? | 否 | - | 最近一条消息内容（冗余，列表展示用） |
| `lastAt` | DateTime | 否 | 默认 now() | 最近消息时间，列表排序用 |
| `userUnread` | Int | 否 | 默认 0 | 未读计数：userUnread = 客服回了用户没看；adminUnread = 用户发了客服没看 |
| `adminUnread` | Int | 否 | 默认 0 | - |
| `closed` | Boolean | 否 | 默认 false | 客服可关闭会话 |
| `createdAt` | DateTime | 否 | 默认 now() | - |
| `updatedAt` | DateTime | 是 | 自动更新 | - |
| `user` | User | 是 | 外键 → id | 关联 User |
| `messages` | ChatMessage[] | 是（数组） | - | 数组 |

## ChatMessage

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `sessionId` | String | 是 | - | - |
| `sender` | String | 是 | - | "user" | "admin" |
| `content` | String | 是 | - | - |
| `createdAt` | DateTime | 否 | 默认 now() | - |
| `session` | ChatSession | 是 | 外键 → id, 级联Cascade | 关联 ChatSession |

## Aftersale

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `id` | String | 否 | 主键 / 默认 cuid() | - |
| `aftersaleSn` | String | 是 | 唯一 | - |
| `userId` | String | 是 | - | - |
| `orderId` | String | 是 | - | - |
| `orderItemId` | String? | 否 | - | - |
| `packageIndex` | Int | 否 | 默认 0 | - |
| `type` | Int | 是 | - | - |
| `reason` | String | 是 | - | - |
| `description` | String? | 否 | - | - |
| `evidenceImages` | Json | 是 | - | 凭证图 URL 数组，以 MySQL 原生 JSON 存储 |
| `refundAmount` | Int | 是 | - | - |
| `refundNo` | String? | 否 | - | - |
| `refundId` | String? | 否 | - | 微信退款单号（区别于自生成的 refundNo=out_refund_no） |
| `refundStatus` | String? | 否 | - | 微信退款状态：PROCESSING / SUCCESS / CLOSED / ABNORMAL |
| `adminRemark` | String? | 否 | - | - |
| `status` | Int | 否 | 默认 0 | - |
| `createdAt` | DateTime | 否 | 默认 now() | - |
| `updatedAt` | DateTime | 是 | 自动更新 | - |
| `user` | User | 是 | 外键 → id | 关联 User |
| `order` | Order | 是 | 外键 → id | 关联 Order |

**索引**

| 类型 | 字段 | 说明 |
|------|------|------|
| index | `userId` | - |
| index | `orderId` | - |
| index | `status` | - |

## AppSetting

| 字段 | 类型 | 必填 | 约束/默认值 | 说明 |
|------|------|:--:|------|------|
| `key` | String | 是 | 主键 | - |
| `value` | String | 是 | - | - |
| `updatedAt` | DateTime | 是 | 自动更新 | - |
