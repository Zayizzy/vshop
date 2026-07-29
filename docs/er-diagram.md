# Vshop 数据库 ER 图

> 基于 `vshop-server/prisma/schema.prisma` 生成  
> 共 24 张表 | 更新时间：2026-07-08

## 完整 ER 图 (Mermaid)

```mermaid
erDiagram
    %% ==================== 用户域 ====================
    User {
        string id PK "用户ID"
        string openid UK "微信OpenID"
        string unionId UK "微信UnionID"
        string nickname "昵称"
        string avatar "头像URL"
        string phone "手机号"
        string location "城市"
        boolean isKoc "是否KOC"
        datetime kocApprovedAt "KOC通过时间"
        datetime createdAt
        datetime updatedAt
    }

    Address {
        string id PK
        string userId FK
        string name "收货人"
        string phone "手机号"
        string province "省"
        string city "市"
        string district "区"
        string detail "详细地址"
        boolean isDefault "默认地址"
        datetime createdAt
        datetime updatedAt
    }

    Favorite {
        string id PK
        string userId FK
        string goodId FK
        datetime createdAt
    }

    CartItem {
        string id PK
        string userId FK
        string skuId FK
        int quantity "数量"
    }

    %% ==================== 商品域 ====================
    Category {
        string id PK
        string name "名称"
        string icon "图标URL"
        int sort "排序"
        string status "状态"
    }

    SubCategory {
        string id PK
        string categoryId FK
        string name "名称"
        int sort "排序"
    }

    Good {
        string id PK
        string subCategoryId FK
        string name "商品名"
        string description "简介"
        string detail "详情"
        int sales "销量"
        string status "状态"
        float discountRate "折扣率"
        boolean isRecommended "推荐"
        int recommendSort "推荐排序"
        datetime createdAt
        datetime updatedAt
    }

    GoodImage {
        string id PK
        string goodId FK
        string url "图片URL"
        int sort "排序"
    }

    GoodDetailImage {
        string id PK
        string goodId FK
        string url "图片URL"
        int sort "排序"
    }

    Sku {
        string id PK
        string goodId FK
        string name "SKU名"
        json specValues "规格组合"
        int price "售价(分)"
        int marketPrice "划线价(分)"
        int stock "库存"
        string platformSkuId "店管家SKU ID"
    }

    %% ==================== 供应链域 ====================
    Supplier {
        string id PK
        string name "名称"
        string contactName "联系人"
        string contactPhone "联系电话"
        json deliveryRegions "配送区域"
        float fulfillRate "履约率"
        string status "状态"
        datetime createdAt
    }

    GoodSupplier {
        string id PK
        string goodId FK
        string supplierId FK
        string skuId FK
        int price "供货价(分)"
        int stock "供货库存"
        int freight "运费(分)"
        string status "状态"
    }

    %% ==================== 交易域 ====================
    Order {
        string id PK
        string orderSn UK "订单号"
        string userId FK
        string addressId FK
        string supplierId FK
        string status "状态"
        int totalAmount "总金额(分)"
        int discountAmount "优惠(分)"
        int freightAmount "运费(分)"
        int payAmount "实付(分)"
        string remark "备注"
        string platformOrderId "店管家单号"
        string dianjiaSyncStatus "同步状态"
        datetime dianjiaSyncedAt "同步时间"
        string kocId "分销员ID"
        datetime createdAt
        datetime updatedAt
    }

    OrderItem {
        string id PK
        string orderId FK
        string skuId FK
        string goodTitle "商品标题"
        string specName "规格名"
        string image "商品图"
        int price "单价(分)"
        int quantity "数量"
    }

    OrderPackage {
        string id PK
        string orderId FK
        string supplierId "供应商ID"
        string supplierName "供应商名"
        int status "物流状态"
        string expressCompany "快递公司"
        string expressNo "运单号"
    }

    Payment {
        string id PK
        string orderId UK_FK
        int amount "金额(分)"
        string status "状态"
        datetime payTime "支付时间"
        string transactionId "微信交易号"
        string prepayId "预支付ID"
        string provider "渠道"
        datetime createdAt
    }

    Aftersale {
        string id PK
        string aftersaleSn UK "售后单号"
        string userId FK
        string orderId FK
        string orderItemId "售后商品项"
        int packageIndex "包裹序号"
        int type "类型"
        string reason "原因"
        string description "描述"
        json evidenceImages "凭证图"
        int refundAmount "退款(分)"
        string refundNo "退款单号"
        string refundId "微信退款号"
        string refundStatus "退款状态"
        string adminRemark "备注"
        int status "审核状态"
        datetime createdAt
        datetime updatedAt
    }

    %% ==================== 营销域 ====================
    Coupon {
        string id PK
        string name "名称"
        string type "类型"
        int value "面额(分)"
        float discountValue "折扣率"
        int minAmount "门槛(分)"
        string scopeType "范围"
        int totalCount "总量"
        int usedCount "已领"
        datetime expireTime "过期时间"
        string status "状态"
    }

    UserCoupon {
        string id PK
        string userId FK
        string couponId FK
        string status "状态"
        datetime usedAt "使用时间"
        datetime createdAt "领取时间"
    }

    ChannelReport {
        string id PK
        string source "渠道"
        string kocId "KOC ID"
        string batchId "批次"
        datetime createdAt
    }

    KocProfile {
        string id PK
        string userId UK_FK
        string realName "真实姓名"
        string phone "手机号"
        string socialAccount "社交账号"
        string introduction "介绍"
        string status "审核状态"
        string rejectReason "驳回原因"
        float commissionRate "佣金率"
        datetime reviewedAt "审核时间"
        datetime createdAt
        datetime updatedAt
    }

    %% ==================== 客服域 ====================
    ChatSession {
        string id PK
        string userId FK
        string goodId "商品ID"
        string title "标题"
        string lastMessage "最后消息"
        datetime lastAt "最后时间"
        int userUnread "用户未读"
        int adminUnread "客服未读"
        boolean closed "已关闭"
        datetime createdAt
        datetime updatedAt
    }

    ChatMessage {
        string id PK
        string sessionId FK
        string sender "发送者"
        string content "内容"
        datetime createdAt
    }

    %% ==================== 系统域 ====================
    AppSetting {
        string key PK
        string value "值"
        datetime updatedAt
    }

    %% ==================== 关联关系 ====================

    %% 用户域关联
    User ||--o{ Address : "拥有"
    User ||--o{ Favorite : "收藏"
    User ||--o{ CartItem : "购物车"
    User ||--o{ Order : "下单"
    User ||--o{ UserCoupon : "持有"
    User ||--o{ ChatSession : "咨询"
    User ||--o{ Aftersale : "申请售后"
    User ||--|| KocProfile : "分销资料"

    %% 地址 → 订单
    Address ||--o{ Order : "收货"

    %% 商品域关联
    Category ||--o{ SubCategory : "包含"
    SubCategory ||--o{ Good : "归属"
    Good ||--o{ GoodImage : "轮播图"
    Good ||--o{ GoodDetailImage : "详情图"
    Good ||--o{ Sku : "规格"
    Good ||--o{ GoodSupplier : "供货"
    Good ||--o{ Favorite : "被收藏"

    %% SKU 关联
    Sku ||--o{ CartItem : "加入购物车"
    Sku ||--o{ OrderItem : "下单明细"
    Sku ||--o{ GoodSupplier : "供货规格"

    %% 供应链关联
    Supplier ||--o{ GoodSupplier : "供应"
    Supplier ||--o{ Order : "履约"

    %% 交易域关联
    Order ||--o{ OrderItem : "商品明细"
    Order ||--o{ OrderPackage : "包裹"
    Order ||--|| Payment : "支付"
    Order ||--o{ Aftersale : "售后"

    %% 营销域关联
    Coupon ||--o{ UserCoupon : "发放"

    %% 客服域关联
    ChatSession ||--o{ ChatMessage : "消息"
```

## 业务域分组视图

```
┌─────────────────────────────────────────────────────────────┐
│  用户域                                                      │
│  ┌──────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ User │───▶│ Address  │    │ Favorite │    │ CartItem │  │
│  └──┬───┘    └──────────┘    └──────────┘    └──────────┘  │
│     │                                                        │
├─────┼────────────────────────────────────────────────────────┤
│  商品域                                     │                │
│  ┌──────────┐   ┌────────────┐   ┌──────┐  │                │
│  │ Category │──▶│ SubCategory│──▶│ Good │  │                │
│  └──────────┘   └────────────┘   └──┬───┘  │                │
│                    ┌────────────────┼───────┤                │
│                    ▼                ▼        ▼               │
│              ┌──────────┐   ┌───────┐  ┌──────────────┐    │
│              │ GoodImage│   │  Sku  │  │GoodDetailImg │    │
│              └──────────┘   └───┬───┘  └──────────────┘    │
│                                 │                            │
├─────────────────────────────────┼────────────────────────────┤
│  供应链域                        │                            │
│  ┌──────────┐   ┌──────────────┐│                            │
│  │ Supplier │──▶│ GoodSupplier │◀┘                           │
│  └──────────┘   └──────────────┘                             │
├──────────────────────────────────────────────────────────────┤
│  交易域                                                        │
│  ┌───────┐    ┌───────────┐    ┌──────────┐    ┌─────────┐ │
│  │ Order │───▶│ OrderItem │    │ Payment  │    │Aftersale│ │
│  └───┬───┘    └───────────┘    └──────────┘    └─────────┘ │
│      │         ┌──────────────┐                              │
│      └────────▶│ OrderPackage │                              │
│                └──────────────┘                              │
├──────────────────────────────────────────────────────────────┤
│  营销域                                                        │
│  ┌────────┐   ┌────────────┐   ┌──────────────┐             │
│  │ Coupon │──▶│ UserCoupon │   │ChannelReport │             │
│  └────────┘   └────────────┘   └──────────────┘             │
│  ┌────────────┐                                               │
│  │ KocProfile │                                               │
│  └────────────┘                                               │
├──────────────────────────────────────────────────────────────┤
│  客服域                                                        │
│  ┌─────────────┐   ┌─────────────┐                           │
│  │ ChatSession │──▶│ ChatMessage │                           │
│  └─────────────┘   └─────────────┘                           │
├──────────────────────────────────────────────────────────────┤
│  系统域                                                        │
│  ┌────────────┐                                               │
│  │ AppSetting │                                               │
│  └────────────┘                                               │
└──────────────────────────────────────────────────────────────┘
```

## 核心关联链路

### 下单链路
```
User → CartItem → Sku → Good
User → Order → OrderItem (快照: goodTitle, specName, image, price)
             → Payment (1:1)
             → OrderPackage (1:N, 一单多包)
             → Address (收货地址快照)
             → Supplier (履约供应商)
```

### 售后链路
```
User → Aftersale → Order → Payment (退款)
                      → OrderItem (退货商品)
```

### KOC 分销链路
```
User(iskoc=true) → KocProfile (审核、佣金率)
Order.kocId → KOC 归属溯源
ChannelReport.source=koc → 渠道归因
```

### 供应链链路
```
Supplier → GoodSupplier (供货价/库存/运费)
         → Good (商品)
         → Sku (规格)
Order.supplierId → 订单路由到供应商
Good.platformSkuId / Order.platformOrderId → 店管家对接
```

### 客服链路
```
User → ChatSession (按商品/通用)
     → ChatMessage (user/admin 对话)
     → 未读计数 (userUnread / adminUnread)
```

## 关系基数速查

| 主表 | 关联表 | 基数 | 外键 |
|------|--------|------|------|
| User | Address | 1:N | userId |
| User | Order | 1:N | userId |
| User | CartItem | 1:N | userId |
| User | Favorite | 1:N | userId |
| User | UserCoupon | 1:N | userId |
| User | KocProfile | 1:1 | userId |
| User | ChatSession | 1:N | userId |
| User | Aftersale | 1:N | userId |
| Category | SubCategory | 1:N | categoryId |
| SubCategory | Good | 1:N | subCategoryId |
| Good | GoodImage | 1:N | goodId |
| Good | GoodDetailImage | 1:N | goodId |
| Good | Sku | 1:N | goodId |
| Good | GoodSupplier | 1:N | goodId |
| Good | Favorite | 1:N | goodId |
| Sku | CartItem | 1:N | skuId |
| Sku | OrderItem | 1:N | skuId |
| Sku | GoodSupplier | 1:N | skuId |
| Supplier | GoodSupplier | 1:N | supplierId |
| Supplier | Order | 1:N | supplierId |
| Order | OrderItem | 1:N | orderId |
| Order | OrderPackage | 1:N | orderId |
| Order | Payment | 1:1 | orderId |
| Order | Aftersale | 1:N | orderId |
| Address | Order | 1:N | addressId |
| Coupon | UserCoupon | 1:N | couponId |
| ChatSession | ChatMessage | 1:N | sessionId |
