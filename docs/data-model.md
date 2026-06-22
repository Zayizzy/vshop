# 生鲜商城小程序 · 数据模型设计

> 基于 PRD v1.0 + 路由表 | 日期：2026-06-14

---

## 一、实体关系图

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│   User   │────▶│   Address    │     │   Supplier   │
│  用户     │ 1:N │   收货地址    │     │   供应商      │
└────┬─────┘     └──────────────┘     └──────┬───────┘
     │                                      │ 1:N
     │ 1:1                                 │
     ▼                                      ▼
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│   KOC    │     │    Goods     │◀────│   Category   │
│  分销员   │     │    商品      │     │    分类       │
└────┬─────┘     └──────┬───────┘     └──────────────┘
     │                  │
     │ N:M              │ 1:N
     ▼                  ▼
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│ KOC_Order│     │  Goods_Sku   │     │  Goods_Image │
│ 推广订单  │     │   商品规格    │     │   商品图片    │
└──────────┘     └──────┬───────┘     └──────────────┘
                        │
                        │ 1:N
                        ▼
                 ┌──────────────┐
                 │    Order     │────▶ Address (snapshot)
                 │    订单      │────▶ User
                 └──────┬───────┘
                        │ 1:N
                        ▼
                 ┌──────────────┐
                 │ Order_Item   │────▶ Goods + Goods_Sku
                 │  订单商品项   │
                 └──────┬───────┘
                        │ 1:1
                        ▼
                 ┌──────────────┐
                 │ Order_Package│────▶ Supplier
                 │  包裹(拆单)   │
                 └──────┬───────┘
                        │ 1:1
                        ▼
                 ┌──────────────┐
                 │  Logistics   │
                 │   物流信息    │
                 └──────────────┘

                 ┌──────────────┐
                 │ AfterSale    │────▶ Order_Package / Order_Item
                 │   售后单     │
                 └──────────────┘

                 ┌──────────────┐
                 │   Coupon     │────▶ User (N:M via UserCoupon)
                 │   优惠券     │
                 └──────────────┘

                 ┌──────────────┐
                 │ Channel_Track│
                 │  渠道追踪    │
                 └──────────────┘
```

---

## 二、用户体系

### 2.1 User（C端用户）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键，自增 |
| `openid` | varchar(64) | ✓ | 微信 openid，唯一索引 |
| `unionid` | varchar(64) | | 微信 unionid |
| `nickname` | varchar(64) | | 微信昵称 |
| `avatar` | varchar(512) | | 头像 URL |
| `phone` | varchar(20) | | 手机号（微信授权获取） |
| `gender` | tinyint | | 0未知 1男 2女 |
| `is_koc` | tinyint | ✓ | 0普通用户 1KOC申请中 2已通过 3已驳回 |
| `register_time` | datetime | ✓ | 注册时间 |
| `last_login_time` | datetime | | 最近登录 |
| `source_channel` | varchar(64) | | 首次来源渠道（card/koc/natural） |
| `source_koc_id` | bigint | | 若通过KOC进入，记录首次绑定KOC |
| `source_card_batch` | varchar(64) | | 若通过卡片进入，记录卡片批次 |
| `status` | tinyint | ✓ | 0正常 1禁用 |
| `created_at` | datetime | ✓ | |
| `updated_at` | datetime | ✓ | |

> 说明：`source_koc_id` 和 `source_card_batch` 在用户首次进入时写入，用于长期归因。

---

## 三、商品体系

### 3.1 Category（商品分类）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `name` | varchar(32) | ✓ | 分类名称 |
| `parent_id` | bigint | | 上级分类ID（null=一级） |
| `icon` | varchar(256) | | 分类图标 |
| `sort` | int | ✓ | 排序，越小越前 |
| `status` | tinyint | ✓ | 0禁用 1启用 |
| `created_at` | datetime | ✓ | |
| `updated_at` | datetime | ✓ | |

### 3.2 Goods（商品）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `title` | varchar(128) | ✓ | 商品名称 |
| `subtitle` | varchar(256) | | 副标题/卖点 |
| `category_id` | bigint | ✓ | 所属二级分类 |
| `supplier_id` | bigint | ✓ | 归属供应商 |
| `cover_image` | varchar(512) | ✓ | 封面主图 |
| `description` | text | | 商品详情（富文本） |
| `origin_place` | varchar(128) | | 产地 |
| `origin_desc` | varchar(512) | | 产地溯源描述 |
| `unit` | varchar(16) | ✓ | 单位：斤/份/箱/kg |
| `shelf_life` | int | | 保质期(天) |
| `storage_method` | varchar(32) | | 储存方式：常温/冷藏/冷冻 |
| `sales_volume` | int | | 累计销量（展示用） |
| `sort` | int | ✓ | 排序权重 |
| `status` | tinyint | ✓ | 0下架 1上架 2售罄 |
| `is_recommend` | tinyint | | 0否 1首页推荐 |
| `created_at` | datetime | ✓ | |
| `updated_at` | datetime | ✓ | |

### 3.3 GoodsSku（商品规格）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `goods_id` | bigint | ✓ | 关联商品 |
| `spec_name` | varchar(64) | ✓ | 规格名：500g / 1kg / 2斤装 |
| `price` | decimal(10,2) | ✓ | 售价（元） |
| `market_price` | decimal(10,2) | | 市场价/划线价 |
| `cost_price` | decimal(10,2) | | 成本价（后台用） |
| `stock` | int | ✓ | 当前库存 |
| `weight` | int | | 重量(克)，用于运费计算 |
| `sku_code` | varchar(64) | | 供应商自定义编码 |
| `status` | tinyint | ✓ | 0禁用 1启用 |
| `created_at` | datetime | ✓ | |
| `updated_at` | datetime | ✓ | |

### 3.4 GoodsImage（商品图片）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `goods_id` | bigint | ✓ | 关联商品 |
| `url` | varchar(512) | ✓ | 图片 URL |
| `type` | tinyint | ✓ | 1轮播图 2详情图 |
| `sort` | int | ✓ | 排序 |
| `created_at` | datetime | ✓ | |

---

## 四、订单体系

> 订单体系是系统最复杂的部分，核心设计原则：
> 1. **一个订单可以拆成多个包裹**（不同供应商商品）
> 2. **每个包裹独立发货、独立物流**
> 3. **售后按包裹维度发起**

### 4.1 Order（订单主表）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `order_no` | varchar(32) | ✓ | 订单号（唯一，生成规则：日期+序号） |
| `user_id` | bigint | ✓ | 下单用户 |
| `total_amount` | decimal(10,2) | ✓ | 商品总金额 |
| `discount_amount` | decimal(10,2) | | 优惠总金额 |
| `freight_amount` | decimal(10,2) | | 运费总金额 |
| `pay_amount` | decimal(10,2) | ✓ | 实付金额 |
| `pay_type` | varchar(16) | | 支付方式：wechat |
| `pay_time` | datetime | | 支付时间 |
| `transaction_id` | varchar(64) | | 微信支付流水号 |
| `status` | tinyint | ✓ | 0待付款 1已支付 2已取消 3已完成 4已关闭 |
| `cancel_reason` | varchar(256) | | 取消原因 |
| `cutoff_hint` | varchar(64) | | 截单提示："预计X月X日送达" |
| `remark` | varchar(256) | | 用户备注 |
| `receiver_name` | varchar(32) | ✓ | 收货人（下单时快照） |
| `receiver_phone` | varchar(20) | ✓ | 收货电话 |
| `receiver_province` | varchar(32) | ✓ | 省 |
| `receiver_city` | varchar(32) | ✓ | 市 |
| `receiver_district` | varchar(32) | ✓ | 区 |
| `receiver_address` | varchar(256) | ✓ | 详细地址 |
| `channel_source` | varchar(32) | | 渠道来源：card/koc/natural |
| `channel_koc_id` | bigint | | 如果是KOC渠道，记录KOC ID |
| `channel_card_batch` | varchar(64) | | 如果是卡片渠道，记录卡片批次 |
| `created_at` | datetime | ✓ | 下单时间 |

> 地址信息在下单时冗余快照，避免用户后续修改地址影响已下单数据。

### 4.2 OrderItem（订单商品项）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `order_id` | bigint | ✓ | 关联订单 |
| `goods_id` | bigint | ✓ | 商品ID |
| `sku_id` | bigint | ✓ | 规格ID |
| `goods_title` | varchar(128) | ✓ | 商品名称快照 |
| `goods_image` | varchar(512) | ✓ | 商品图片快照 |
| `spec_name` | varchar(64) | ✓ | 规格名称快照 |
| `price` | decimal(10,2) | ✓ | 单价 |
| `quantity` | int | ✓ | 数量 |
| `subtotal` | decimal(10,2) | ✓ | 小计 |
| `supplier_id` | bigint | ✓ | 归属供应商ID（订单拆分依据） |
| `supplier_name` | varchar(64) | ✓ | 供应商名称快照 |
| `package_id` | bigint | | 分配到的包裹ID（拆单后写入） |
| `created_at` | datetime | ✓ | |

### 4.3 OrderPackage（包裹 / 拆单）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `order_id` | bigint | ✓ | 关联订单 |
| `package_index` | int | ✓ | 包裹序号（从0开始，页面展示"包裹1/2/3"） |
| `supplier_id` | bigint | ✓ | 发货供应商 |
| `supplier_name` | varchar(64) | ✓ | 供应商名称快照 |
| `status` | tinyint | ✓ | 0待发货 1已打单 2已拣货 3已出库 4运输中 5已签收 |
| `express_company` | varchar(64) | | 快递公司 |
| `express_no` | varchar(64) | | 快递单号 |
| `wms_system` | varchar(32) | | WMS系统：djg / jst |
| `wms_order_no` | varchar(64) | | WMS端订单号 |
| `wms_push_time` | datetime | | 推送WMS时间 |
| `wms_sync_time` | datetime | | WMS最近回传时间 |
| `picked_time` | datetime | | 拣货完成时间 |
| `shipped_time` | datetime | | 出库/发货时间 |
| `signed_time` | datetime | | 签收时间 |
| `created_at` | datetime | ✓ | |

### 4.4 PackageLogistics（物流轨迹）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `package_id` | bigint | ✓ | 关联包裹 |
| `status` | varchar(32) | ✓ | 物流状态节点 |
| `description` | varchar(256) | ✓ | 轨迹描述 |
| `location` | varchar(128) | | 所在城市/网点 |
| `time` | datetime | ✓ | 轨迹时间 |
| `created_at` | datetime | ✓ | |

---

## 五、供应商体系

### 5.1 Supplier（供应商）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `name` | varchar(64) | ✓ | 供应商名称 |
| `short_name` | varchar(32) | ✓ | 简称（包裹展示用） |
| `logo` | varchar(256) | | Logo |
| `contact_name` | varchar(32) | ✓ | 联系人 |
| `contact_phone` | varchar(20) | ✓ | 联系电话 |
| `province` | varchar(32) | ✓ | 发货仓所在省 |
| `city` | varchar(32) | ✓ | 发货仓所在市 |
| `district` | varchar(32) | | 发货仓所在区 |
| `warehouse_address` | varchar(256) | | 仓库详细地址 |
| `service_regions` | text | ✓ | 配送区域 JSON: `["福建省/厦门市/思明区",...]` |
| `wms_system` | varchar(16) | ✓ | 对接WMS：djg / jst |
| `wms_config` | text | | WMS接口配置 JSON |
| `wms_shop_id` | varchar(64) | | WMS端店铺ID |
| `settlement_rate` | decimal(5,4) | ✓ | 结算费率（如0.05=5%） |
| `settlement_cycle` | varchar(16) | ✓ | 结算周期：weekly / monthly / T+7 |
| `rating` | decimal(2,1) | | 评分 1.0-5.0 |
| `status` | tinyint | ✓ | 0待审核 1已通过 2已驳回 3已停用 |
| `created_at` | datetime | ✓ | |
| `updated_at` | datetime | ✓ | |

### 5.2 SupplierGoodsBinding（商品与供应商绑定关系）

> 一个商品可能由多个供应商供货（主供+备供），一个供应商供应多个商品

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `goods_id` | bigint | ✓ | 商品ID |
| `supplier_id` | bigint | ✓ | 供应商ID |
| `is_primary` | tinyint | ✓ | 0备供 1主供（订单优先分配主供） |
| `priority` | int | ✓ | 优先级，越小越高（备供之间排序） |
| `price` | decimal(10,2) | ✓ | 该供应商的供货价 |
| `stock` | int | ✓ | 该供应商的库存（同步自WMS） |
| `stock_updated_at` | datetime | | 库存最后同步时间 |
| `status` | tinyint | ✓ | 0禁用 1启用 |
| `created_at` | datetime | ✓ | |
| `updated_at` | datetime | ✓ | |

### 5.3 SupplierSettlement（供应商结算记录）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `supplier_id` | bigint | ✓ | 供应商ID |
| `period_start` | date | ✓ | 结算周期开始 |
| `period_end` | date | ✓ | 结算周期结束 |
| `order_count` | int | ✓ | 订单数 |
| `total_amount` | decimal(10,2) | ✓ | 订单总金额 |
| `settlement_amount` | decimal(10,2) | ✓ | 结算金额 |
| `status` | tinyint | ✓ | 0待确认 1已确认 2已打款 |
| `paid_at` | datetime | | 打款时间 |
| `created_at` | datetime | ✓ | |

---

## 六、KOC 分销体系

### 6.1 Koc（分销员）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `user_id` | bigint | ✓ | 关联用户（1:1） |
| `koc_code` | varchar(16) | ✓ | KOC唯一推广码（短码，用于链接生成） |
| `real_name` | varchar(32) | ✓ | 真实姓名 |
| `phone` | varchar(20) | ✓ | 联系电话 |
| `social_account` | varchar(128) | | 社交账号（微信号/其他平台） |
| `level` | tinyint | ✓ | 等级：0初级 1中级 2高级 |
| `avatar` | varchar(256) | | 头像（申请时提交） |
| `introduction` | varchar(256) | | 自我介绍 |
| `verify_status` | tinyint | ✓ | 0待审核 1已通过 2已驳回 |
| `verify_remark` | varchar(256) | | 审核备注/驳回原因 |
| `total_fans` | int | | 累计粉丝数 |
| `total_orders` | int | | 累计推广订单数 |
| `total_gmv` | decimal(12,2) | | 累计推广GMV |
| `total_commission` | decimal(10,2) | | 累计佣金 |
| `balance` | decimal(10,2) | | 可提现余额 |
| `frozen_balance` | decimal(10,2) | | 待结算余额（未过售后期） |
| `status` | tinyint | ✓ | 0正常 1冻结 2清退 |
| `agreed_at` | datetime | | 协议签署时间 |
| `verified_at` | datetime | | 审核通过时间 |
| `created_at` | datetime | ✓ | |
| `updated_at` | datetime | ✓ | |

### 6.2 KocCommissionConfig（佣金配置）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `level` | tinyint | ✓ | 对应KOC等级 |
| `target_type` | varchar(16) | ✓ | 适用范围：category / goods / global |
| `target_id` | bigint | | 分类ID 或 商品ID（global 时为 null） |
| `commission_type` | varchar(8) | ✓ | 佣金类型：rate(按比例) / fixed(固定金额) |
| `commission_value` | decimal(10,2) | ✓ | 佣金值（rate则0.05=5%，fixed则单位元） |
| `status` | tinyint | ✓ | 0禁用 1启用 |
| `created_at` | datetime | ✓ | |
| `updated_at` | datetime | ✓ | |

> 匹配优先级：target_type=goods > category > global

### 6.3 KocCommission（佣金明细）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `koc_id` | bigint | ✓ | 关联KOC |
| `order_id` | bigint | ✓ | 关联订单 |
| `order_amount` | decimal(10,2) | ✓ | 订单实付金额 |
| `commission_rate` | decimal(5,4) | | 佣金比例（若按比例） |
| `commission_amount` | decimal(10,2) | ✓ | 佣金金额 |
| `status` | tinyint | ✓ | 0待结算 1已结算 2已失效(退款) |
| `settlement_period` | varchar(32) | | 结算周期标识 |
| `settled_at` | datetime | | 结算时间 |
| `created_at` | datetime | ✓ | |

### 6.4 KocWithdraw（提现记录）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `koc_id` | bigint | ✓ | 关联KOC |
| `withdraw_no` | varchar(32) | ✓ | 提现单号 |
| `amount` | decimal(10,2) | ✓ | 提现金额 |
| `status` | tinyint | ✓ | 0待处理 1处理中 2已到账 3已驳回 |
| `remark` | varchar(256) | | 驳回备注 |
| `transfer_no` | varchar(64) | | 微信转账单号 |
| `processed_at` | datetime | | 处理时间 |
| `created_at` | datetime | ✓ | |

### 6.5 KocTrack（KOC推广追踪日志）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `koc_id` | bigint | ✓ | 关联KOC |
| `user_id` | bigint | | 点击用户（未登录则为 null） |
| `event` | varchar(32) | ✓ | 事件：view / click / cart / order / pay |
| `goods_id` | bigint | | 关联商品 |
| `share_type` | varchar(16) | | 分享类型：moment / group / video / link |
| `source_page` | varchar(64) | | 来源页面路径 |
| `ip` | varchar(64) | | 用户IP |
| `user_agent` | varchar(256) | | UA |
| `created_at` | datetime | ✓ | |

---

## 七、售后体系

### 7.1 AfterSale（售后单）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `aftersale_no` | varchar(32) | ✓ | 售后单号 |
| `user_id` | bigint | ✓ | 发起用户 |
| `order_id` | bigint | ✓ | 关联订单 |
| `package_id` | bigint | ✓ | 关联包裹 |
| `order_item_id` | bigint | ✓ | 关联订单商品项 |
| `type` | tinyint | ✓ | 1仅退款 2退货退款 |
| `reason` | varchar(64) | ✓ | 售后原因 |
| `description` | varchar(512) | | 问题描述 |
| `evidence_images` | text | | 凭证图片 JSON: ["url1","url2"] |
| `refund_amount` | decimal(10,2) | ✓ | 退款金额 |
| `status` | tinyint | ✓ | 0待审核 1已同意 2已拒绝 3退款中 4已退款 5已完成 |
| `supplier_remark` | varchar(256) | | 供应商处理备注 |
| `refund_no` | varchar(64) | | 微信退款单号 |
| `refund_time` | datetime | | 退款时间 |
| `return_express_company` | varchar(64) | | 用户退货快递公司 |
| `return_express_no` | varchar(64) | | 用户退货快递单号 |
| `return_received` | tinyint | | 0未收到 1已收到退货 |
| `created_at` | datetime | ✓ | |
| `updated_at` | datetime | ✓ | |

---

## 八、营销体系

### 8.1 Coupon（优惠券模板）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `name` | varchar(64) | ✓ | 券名称 |
| `type` | tinyint | ✓ | 1满减券 2折扣券 3新人券 |
| `discount_type` | varchar(8) | ✓ | reduce(满减) / rate(折扣) |
| `threshold` | decimal(10,2) | | 使用门槛（满X元可用） |
| `discount_value` | decimal(10,2) | ✓ | 优惠值（减X元 或 打X折） |
| `max_discount` | decimal(10,2) | | 最大优惠金额（折扣券上限） |
| `total_count` | int | ✓ | 发行总量 |
| `received_count` | int | | 已领取量 |
| `per_user_limit` | int | | 每人限领 |
| `scope_type` | varchar(16) | ✓ | 适用范围：all / category / goods |
| `scope_ids` | text | | 范围ID JSON |
| `valid_days` | int | ✓ | 领取后有效天数 |
| `usable_time_start` | datetime | | 可用开始时间（二选一） |
| `usable_time_end` | datetime | | 可用结束时间 |
| `status` | tinyint | ✓ | 0禁用 1启用 |
| `created_at` | datetime | ✓ | |

### 8.2 UserCoupon（用户优惠券）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `user_id` | bigint | ✓ | 用户ID |
| `coupon_id` | bigint | ✓ | 券模板ID |
| `status` | tinyint | ✓ | 0未使用 1已使用 2已过期 |
| `used_order_id` | bigint | | 使用的订单ID |
| `used_time` | datetime | | 使用时间 |
| `expire_time` | datetime | ✓ | 过期时间 |
| `created_at` | datetime | ✓ | |

---

## 九、渠道追踪

### 9.1 ChannelCardBatch（包裹卡片批次）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `batch_no` | varchar(32) | ✓ | 批次号 |
| `name` | varchar(64) | ✓ | 批次名称 |
| `total_count` | int | ✓ | 卡片总数 |
| `scan_count` | int | | 扫码量 |
| `enter_count` | int | | 进入小程序量 |
| `order_count` | int | | 下单量 |
| `gmv` | decimal(12,2) | | GMV |
| `qrcode_url` | varchar(512) | | 小程序码图片URL |
| `short_link` | varchar(128) | | 短链 |
| `created_at` | datetime | ✓ | |

### 9.2 ChannelCardScan（卡片扫码记录）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `id` | bigint | ✓ | 主键 |
| `batch_id` | bigint | ✓ | 批次ID |
| `card_id` | varchar(64) | | 单张卡片标识 |
| `user_id` | bigint | | 扫码用户（登录后关联） |
| `ip` | varchar(64) | | |
| `user_agent` | varchar(256) | | |
| `region` | varchar(64) | | 扫码所在地市 |
| `converted` | tinyint | | 0仅扫码 1已下单 |
| `order_id` | bigint | | 关联订单 |
| `created_at` | datetime | ✓ | |

---

## 十、关键设计决策

### 10.1 订单拆单逻辑

```
下单时每个 OrderItem 已标注 supplier_id
↓
支付成功后，路由引擎按 supplier_id 分组 → 每组生成一个 OrderPackage
↓
每个 OrderPackage 独立推送对应供应商和 WMS
↓
物流轨迹通过 PackageLogistics 记录，回传到 OrderPackage.status
```

### 10.2 库存防超卖

```
商品详情页展示的库存 = min(所有供应商 binding.stock 之和, 虚拟上限)
下单时：
  1. 路由引擎确定目标供应商
  2. 对该供应商的 binding.stock 执行扣减（行锁 + 乐观锁）
  3. WMS 实时/定时同步 binding.stock
  4. binding.stock ≤ 0 时自动切换备供
```

### 10.3 KOC 佣金结算流程

```
用户通过 KOC 链接进入 → 下单时写入 channel_koc_id
↓
支付成功后生成 KocCommission（status=待结算）
↓
售后期过后（T+7）→ status 变为已结算 → frozen_balance 转入 balance
↓
KOC 申请提现 → KocWithdraw → 微信转账
```

### 10.4 地址快照策略

下单时 `Order` 表冗余完整收货地址字段，而非仅存 address_id。原因：用户下单后修改地址不应影响已有订单的配送。

---

> **版本历史**：v1.0 | 2026-06-14 | 初始版本，覆盖用户/商品/订单/供应商/KOC/售后/营销/渠道 8 大体系
