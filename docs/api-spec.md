# 生鲜商城小程序 · 接口清单

> 基于 PRD v1.0 + 数据模型 | 日期：2026-06-14

---

## 一、接口总览

| 模块 | 接口数 | 说明 |
|------|:------:|------|
| 用户与授权 | 5 | 登录、用户信息、地址管理 |
| 首页与发现 | 4 | Banner、推荐、分类、搜索 |
| 商品 | 3 | 详情、评价、收藏 |
| 购物车 | 5 | 增删改查、校验 |
| 订单 | 5 | 创建、列表、详情、取消、确认收货 |
| 支付 | 1 | 微信统一下单 |
| 物流 | 1 | 物流轨迹查询 |
| 售后 | 4 | 申请、列表、详情、取消 |
| 优惠券 | 3 | 我的券、领券、可用券 |
| KOC 分销 | 9 | 入驻、工作台、推广、收益、提现 |
| 渠道追踪 | 1 | 渠道上报 |
| **合计** | **41** | |

---

## 二、通用约定

### 2.1 基础信息

```
Base URL: https://api.example.com/v1
Content-Type: application/json; charset=utf-8
Auth: Header Authorization: Bearer <token>
```

### 2.2 统一响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "timestamp": 1700000000000
}
```

| code | 含义 |
|:----:|------|
| 0 | 成功 |
| 401 | 未登录 / Token 过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 422 | 参数校验失败 |
| 500 | 服务器错误 |

### 2.3 分页请求/响应

```json
// Request
{ "page": 1, "pageSize": 20 }

// Response
{
  "code": 0,
  "data": {
    "list": [],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}
```

### 2.4 优先级标记

| 标记 | 含义 |
|:----:|------|
| 🔑 | P0 · MVP 必须 |
| ⭐ | P1 · v1.1-1.2 上线 |
| 💎 | P2 · v2.0 |

---

## 三、用户与授权

### 3.1 微信登录 🔑

```
POST /auth/wechat-login
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| code | string | ✓ | wx.login() 返回的临时 code |

**响应：**

```json
{
  "token": "eyJhbG...",
  "user": {
    "id": 1,
    "nickname": "张三",
    "avatar": "https://...",
    "phone": "138****0000",
    "isKoc": 2,
    "isNewUser": false
  }
}
```

### 3.2 获取用户手机号 🔑

```
POST /auth/phone
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| code | string | ✓ | `<button open-type="getPhoneNumber">` 的加密数据 code |

### 3.3 更新用户信息 ⭐

```
PUT /users/profile
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| nickname | string | | 昵称 |
| avatar | string | | 头像 URL |
| gender | int | | 0未知 1男 2女 |

### 3.4 地址管理 🔑

```
GET    /addresses              # 地址列表
POST   /addresses              # 新增地址
PUT    /addresses/:id          # 修改地址
DELETE /addresses/:id          # 删除地址
POST   /addresses/:id/default  # 设为默认
```

**Address 对象：**

```json
{
  "id": 1,
  "name": "张三",
  "phone": "13800000000",
  "province": "福建省",
  "city": "厦门市",
  "district": "思明区",
  "detail": "软件园二期100号",
  "isDefault": true
}
```

---

## 四、首页与发现

### 4.1 首页数据 🔑

```
GET /home
```

**响应：**

```json
{
  "banners": [
    { "id": 1, "image": "https://...", "linkType": "goods", "linkId": 100 }
  ],
  "categories": [
    { "id": 1, "name": "水果", "icon": "https://..." },
    { "id": 2, "name": "蔬菜", "icon": "https://..." }
  ],
  "recommendList": [
    {
      "id": 1, "title": "新疆哈密瓜", "coverImage": "https://...",
      "minPrice": 19.90, "unit": "份", "salesVolume": 1234,
      "supplierShortName": "本地仓", "status": 1
    }
  ],
  "cutoffTime": "20:00",
  "cutoffHint": "距今日截单还有 2小时15分"
}
```

### 4.2 商品搜索 🔑

```
GET /goods/search
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| keyword | string | ✓ | 搜索词 |
| categoryId | int | | 分类筛选 |
| sort | string | | default / price_asc / price_desc / sales |
| page | int | | 页码 |
| pageSize | int | | 每页数量 |

### 4.3 分类商品列表 🔑

```
GET /goods/list
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| categoryId | int | ✓ | 二级分类ID |
| sort | string | | default / price_asc / price_desc / sales |
| page | int | | 页码 |
| pageSize | int | | 每页数量 |

### 4.4 限时活动商品 ⭐

```
GET /activities/flash
```

---

## 五、商品

### 5.1 商品详情 🔑

```
GET /goods/:id
```

**响应：**

```json
{
  "id": 100,
  "title": "新疆哈密瓜",
  "subtitle": "产地直采，甜度高",
  "coverImage": "https://...",
  "images": ["https://...", "https://..."],
  "description": "<p>商品详情富文本...</p>",
  "originPlace": "新疆吐鲁番",
  "originDesc": "当日采摘，空运直达",
  "unit": "份",
  "storageMethod": "常温",
  "salesVolume": 1234,
  "skus": [
    { "id": 1001, "specName": "2-3斤装", "price": 19.90, "marketPrice": 29.90, "stock": 200, "status": 1 },
    { "id": 1002, "specName": "4-5斤装", "price": 35.90, "marketPrice": 49.90, "stock": 150, "status": 1 }
  ],
  "supplier": {
    "id": 1,
    "shortName": "本地仓",
    "serviceRegions": ["福建省/厦门市/思明区", "福建省/厦门市/湖里区"]
  },
  "categoryChain": ["水果", "瓜类"],
  "isCollected": false
}
```

### 5.2 商品评价列表 ⭐

```
GET /goods/:id/reviews
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| page | int | | 页码 |
| pageSize | int | | 每页数量 |
| hasImage | int | | 0全部 1带图评价 |

### 5.3 收藏/取消收藏 💎

```
POST /goods/:id/collect       # 收藏
DELETE /goods/:id/collect     # 取消
GET /users/collections        # 收藏列表
```

---

## 六、购物车

### 6.1 购物车列表 🔑

```
GET /cart
```

```json
// Response
{
  "items": [
    {
      "id": 1, "goodsId": 100, "skuId": 1001,
      "goodsTitle": "新疆哈密瓜", "goodsImage": "https://...",
      "specName": "2-3斤装", "price": 19.90, "quantity": 2,
      "stock": 200, "supplierId": 1, "supplierName": "本地仓"
    }
  ],
  "supplierGroups": [
    { "supplierId": 1, "supplierName": "本地仓", "itemCount": 3, "subtotal": 88.70 }
  ],
  "totalCount": 3,
  "totalPrice": 88.70
}
```

### 6.2 加入购物车 🔑

```
POST /cart
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| goodsId | int | ✓ | |
| skuId | int | ✓ | |
| quantity | int | ✓ | 数量 |

### 6.3 修改购物车项 🔑

```
PUT /cart/:itemId
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| quantity | int | ✓ | 新数量 |

### 6.4 删除购物车项 🔑

```
DELETE /cart/:itemId
```

### 6.5 购物车校验 🔑

```
POST /cart/validate
```

> 进入结算前调用，校验库存变化、是否配送、是否下架等。返回不可下单的 item 及原因。

```json
// Response
{
  "valid": true,
  "invalidItems": [
    { "itemId": 1, "reason": "stock_insufficient", "currentStock": 0 }
  ]
}
```

---

## 七、订单

### 7.1 创建订单 🔑

```
POST /orders
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| addressId | int | ✓ | 收货地址ID |
| items | array | ✓ | `[{ "goodsId": 100, "skuId": 1001, "quantity": 2 }]` |
| couponId | int | | 使用的优惠券ID |
| remark | string | | 备注 |

**响应：**

```json
{
  "orderId": 10086,
  "orderNo": "2024061410086",
  "totalAmount": 88.70,
  "freightAmount": 0,
  "discountAmount": 5.00,
  "payAmount": 83.70,
  "packages": [
    { "packageIndex": 0, "supplierName": "本地仓", "itemCount": 3, "subtotal": 88.70 }
  ],
  "expireTime": "2024-06-14T20:30:00",
  "cutoffHint": "预计6月15日送达"
}
```

### 7.2 订单列表 🔑

```
GET /orders
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| status | string | | all / pending / paid / shipped / received / done |
| page | int | | 页码 |
| pageSize | int | | 每页数量 |

**响应：**

```json
{
  "list": [
    {
      "id": 10086,
      "orderNo": "2024061410086",
      "status": 1,
      "statusText": "待发货",
      "payAmount": 83.70,
      "packages": [
        { "packageIndex": 0, "supplierName": "本地仓", "status": 1, "statusText": "已打单",
          "expressCompany": "顺丰快递", "expressNo": "SF1234567890" }
      ],
      "goodsList": [
        { "goodsTitle": "新疆哈密瓜", "goodsImage": "https://...", "specName": "2-3斤装",
          "price": 19.90, "quantity": 2 }
      ],
      "createdAt": "2024-06-14T19:30:00"
    }
  ],
  "total": 10,
  "page": 1,
  "pageSize": 20,
  "hasMore": false
}
```

### 7.3 订单详情 🔑

```
GET /orders/:id
```

**额外字段（相对于列表）：**

```json
{
  "receiverName": "张三",
  "receiverPhone": "13800000000",
  "receiverAddress": "福建省厦门市思明区软件园二期100号",
  "remark": "请放门卫",
  "payTime": "2024-06-14T19:35:00",
  "items": [...],  // 完整 OrderItem 列表
  "packages": [
    {
      "packageIndex": 0,
      "supplierId": 1,
      "supplierName": "本地仓",
      "status": 2,
      "statusText": "运输中",
      "expressCompany": "顺丰快递",
      "expressNo": "SF1234567890",
      "items": [...]  // 该包裹商品项
    }
  ]
}
```

### 7.4 取消订单 🔑

```
POST /orders/:id/cancel
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| reason | string | | 取消原因 |
| 限制 | — | — | 仅待付款状态可取消；已支付需走售后 |

### 7.5 确认收货 🔑

```
POST /orders/:id/confirm
```

> 按包裹维度确认：`POST /orders/:id/packages/:packageIndex/confirm`

---

## 八、支付

### 8.1 微信统一下单 🔑

```
POST /payment/unified-order
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| orderId | int | ✓ | |

**响应：**

```json
{
  "paymentParams": {
    "timeStamp": "1700000000",
    "nonceStr": "xxx",
    "package": "prepay_id=wx...",
    "signType": "RSA",
    "paySign": "xxx"
  }
}
```

---

## 九、物流

### 9.1 物流轨迹 🔑

```
GET /orders/:id/packages/:packageIndex/logistics
```

**响应：**

```json
{
  "packageIndex": 0,
  "expressCompany": "顺丰快递",
  "expressNo": "SF1234567890",
  "status": 4,
  "statusText": "运输中",
  "tracks": [
    { "status": "picked", "description": "已揽收", "location": "厦门市", "time": "2024-06-14T21:00:00" },
    { "status": "transit", "description": "运输中", "location": "厦门市", "time": "2024-06-15T03:00:00" }
  ]
}
```

---

## 十、售后

### 10.1 申请售后 🔑

```
POST /aftersales
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| orderId | int | ✓ | |
| packageIndex | int | ✓ | |
| orderItemId | int | ✓ | |
| type | int | ✓ | 1仅退款 2退货退款 |
| reason | string | ✓ | |
| description | string | | |
| evidenceImages | array | | `["url1","url2"]` |
| refundAmount | number | ✓ | |

### 10.2 售后列表 ⭐

```
GET /aftersales
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| status | string | | all / pending / approved / rejected / refunding / done |
| page | int | | |
| pageSize | int | | |

### 10.3 售后详情 🔑

```
GET /aftersales/:id
```

### 10.4 取消售后 🔑

```
POST /aftersales/:id/cancel
```

> 仅"待审核"状态可取消

---

## 十一、优惠券

### 11.1 我的优惠券 ⭐

```
GET /coupons/my
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| status | string | | usable / used / expired |

### 11.2 可用优惠券列表 ⭐

```
GET /coupons/available
```

> 结算时调用，返回当前订单可使用的优惠券

### 11.3 领取优惠券 ⭐

```
POST /coupons/:id/receive
```

---

## 十二、KOC 分销

### 12.1 KOC 入驻申请 🔑

```
POST /koc/register
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| realName | string | ✓ | |
| phone | string | ✓ | |
| socialAccount | string | | 微信号等 |
| introduction | string | | 自我介绍 |
| avatar | string | | |

### 12.2 KOC 审核状态 🔑

```
GET /koc/status
```

**响应：**

```json
{
  "status": 0,
  "statusText": "审核中",
  "remark": "",
  "appliedAt": "2024-06-14T19:00:00"
}
```

> status: 0待审核 1已通过 2已驳回

### 12.3 KOC 工作台数据 🔑

```
GET /koc/dashboard
```

**响应：**

```json
{
  "stats": {
    "today":   { "views": 120, "clicks": 80, "orders": 5, "gmv": 499.50, "commission": 49.95 },
    "week":    { "views": 850, "clicks": 560, "orders": 35, "gmv": 3496.50, "commission": 349.65 },
    "total":   { "views": 12340, "clicks": 8230, "orders": 520, "gmv": 51948.00, "commission": 5194.80 }
  },
  "rank": 15,
  "totalKoc": 200,
  "level": 2,
  "levelText": "高级分销员",
  "balance": 2345.60,
  "frozenBalance": 450.00
}
```

### 12.4 KOC 推广订单列表 🔑

```
GET /koc/orders
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| page | int | | |
| pageSize | int | | |

### 12.5 推广工具 🔑

```
GET /koc/tools
```

**响应：**

```json
{
  "kocCode": "KOC12345",
  "qrcodeUrl": "https://.../koc_qrcode.png",
  "shortLink": "https://xxx.cn/s/AbCdE",
  "shareAppPath": "/pages/home/index?kocId=12345"
}
```

### 12.6 生成推广海报 🔑

```
POST /koc/poster
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| goodsId | int | ✓ | |

**响应：**

```json
{
  "posterUrl": "https://.../poster_12345_100.png"
}
```

### 12.7 素材库 ⭐

```
GET /koc/materials
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| type | string | | goods / copywriting / activity |
| page | int | | |
| pageSize | int | | |

### 12.8 收益明细 🔑

```
GET /koc/earnings
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| type | string | | all / settled / frozen |
| page | int | | |
| pageSize | int | | |

**响应每一项：**

```json
{
  "id": 1,
  "orderId": 10086,
  "orderAmount": 83.70,
  "commissionAmount": 8.37,
  "status": 1,
  "statusText": "已结算",
  "settledAt": "2024-06-21T00:00:00",
  "createdAt": "2024-06-14T19:30:00"
}
```

### 12.9 申请提现 🔑

```
POST /koc/withdraw
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| amount | number | ✓ | 提现金额 |

**响应：**

```json
{
  "withdrawNo": "W20240614001",
  "amount": 500.00,
  "status": 0,
  "statusText": "待处理"
}
```

### 12.10 提现记录

```
GET /koc/withdraws
```

### 12.11 粉丝列表 ⭐

```
GET /koc/fans
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| page | int | | |
| pageSize | int | | |

### 12.12 收益排行 💎

```
GET /koc/ranking
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| type | string | | week / month / total |

---

## 十三、渠道追踪

### 13.1 渠道上报 🔑

```
POST /channel/report
```

> 用户进入小程序时调用，上报渠道来源。后端生成 Session 级追踪。

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| source | string | ✓ | card / koc / natural |
| kocId | int | | KOC ID（source=koc时必填） |
| batchId | int | | 卡片批次ID（source=card时必填） |
| cardId | string | | 单张卡片ID |
| shareType | string | | moment / group / video / link |

---

## 十四、版本 → 接口映射

### v1.0 MVP（20 个接口）🔑

```
Auth       POST /auth/wechat-login
           POST /auth/phone

Address    GET /addresses (list)
           POST /addresses (create)
           PUT /addresses/:id (update)
           DELETE /addresses/:id

Home       GET /home

Goods      GET /goods/search
           GET /goods/list
           GET /goods/:id

Cart       GET /cart
           POST /cart
           PUT /cart/:itemId
           DELETE /cart/:itemId
           POST /cart/validate

Order      POST /orders
           GET /orders
           GET /orders/:id
           POST /orders/:id/cancel
           POST /orders/:id/confirm

Payment    POST /payment/unified-order

Logistics  GET /orders/:id/packages/:packageIndex/logistics

AfterSale  POST /aftersales
           GET /aftersales/:id
           POST /aftersales/:id/cancel

KOC        POST /koc/register
           GET /koc/status

Channel    POST /channel/report
```

### v1.1 KOC 分销完整上线（+7 个）

```
KOC        GET /koc/dashboard
           GET /koc/orders
           GET /koc/tools
           POST /koc/poster
           GET /koc/earnings
           POST /koc/withdraw
           GET /koc/withdraws

AfterSale  GET /aftersales
```

### v1.2 营销深化（+7 个）

```
User       PUT /users/profile
Coupon     GET /coupons/my
           GET /coupons/available
           POST /coupons/:id/receive
Activity   GET /activities/flash
KOC        GET /koc/materials
           GET /koc/fans
Goods      GET /goods/:id/reviews
```

### v2.0 体验升级（+3 个）

```
KOC        GET /koc/ranking
Goods      POST /goods/:id/collect
           DELETE /goods/:id/collect
           GET /users/collections
```

---

## 十五、接口命名规范

| 规则 | 示例 |
|------|------|
| 资源用复数名词 | `/orders` `/addresses` `/coupons` |
| 子资源层级表达 | `/orders/:id/packages/:idx/logistics` |
| 动作用 POST | `/orders/:id/cancel` `/koc/withdraw` |
| 使用标准 HTTP 方法 | GET(查) POST(增) PUT(改) DELETE(删) |
| 版本号放 URL 路径 | `/v1/orders` |
| 分页参数统一 | `page` `pageSize` |

---

> **版本历史**：v1.0 | 2026-06-14 | 覆盖 12 模块 41 接口，含版本映射
