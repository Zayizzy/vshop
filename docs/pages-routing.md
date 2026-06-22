# 生鲜商城小程序 · 页面路由表

> 基于 PRD v1.0 | 日期：2026-06-14

---

## 一、导航结构总览

```
Tab Bar（底部 5 标签）
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│   首页    │   分类    │  购物车   │   订单    │   我的    │
│  home    │ category │   cart   │  order   │   mine   │
└──────────┴──────────┴──────────┴──────────┴──────────┘
     │          │          │          │          │
     ├─ 搜索    │          ├─ 结算    ├─ 详情    ├─ KOC入口
     ├─ 商品详情│          │          ├─ 物流    ├─ 优惠券
     └─ ...     │          │          ├─ 售后    ├─ 收藏
                                           └─ ...     └─ ...
```

### 微信小程序 Tab Bar 配置（app.json）

```json
{
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#07C160",
    "backgroundColor": "#FFFFFF",
    "borderStyle": "black",
    "list": [
      { "pagePath": "pages/home/index",        "text": "首页",   "iconPath": "...", "selectedIconPath": "..." },
      { "pagePath": "pages/category/index",    "text": "分类",   "iconPath": "...", "selectedIconPath": "..." },
      { "pagePath": "pages/cart/index",        "text": "购物车", "iconPath": "...", "selectedIconPath": "..." },
      { "pagePath": "pages/order/list",        "text": "订单",   "iconPath": "...", "selectedIconPath": "..." },
      { "pagePath": "pages/mine/index",        "text": "我的",   "iconPath": "...", "selectedIconPath": "..." }
    ]
  }
}
```

---

## 二、完整页面清单

### 图例说明

| 标记 | 含义 |
|:----:|------|
| 🏠  | Tab 页（底部导航） |
| 🔑  | P0（MVP 必须） |
| ⭐  | P1（二期上线） |
| 💎  | P2（三期优化） |
| 🔗  | 带路由参数 |

---

### 2.1 首页模块

| 序号 | 页面 | 路径 | 优先级 | 说明 |
|:----:|------|------|:------:|------|
| 1 | 🏠 首页 | `pages/home/index` | 🔑 | Tab页。Banner轮播、分类导航、今日推荐瀑布流、截单倒计时、新人专区 |
| 2 | 搜索结果 | `pages/search/result` | 🔑 | 从首页搜索框进入。商品列表，支持排序筛选 |
| 3 | 限时活动 | `pages/activity/flash` | ⭐ | 秒杀/拼团活动落地页 |

**路由参数：**

| 页面 | 参数 | 说明 |
|------|------|------|
| `pages/home/index` | `?source=card&batchId=xxx` | 包裹卡片扫码进入，带渠道溯源 |
| `pages/home/index` | `?kocId=xxx` | KOC推广链接进入，带KOC标识 |
| `pages/search/result` | `?keyword=xxx` | 搜索关键词 |

---

### 2.2 分类模块

| 序号 | 页面 | 路径 | 优先级 | 说明 |
|:----:|------|------|:------:|------|
| 4 | 🏠 分类 | `pages/category/index` | 🔑 | Tab页。左一级分类 + 右二级分类+商品列表 |

---

### 2.3 商品模块

| 序号 | 页面 | 路径 | 优先级 | 说明 |
|:----:|------|------|:------:|------|
| 5 | 商品详情 | `pages/goods/detail` | 🔑 | 主图轮播、规格、价格、库存、产地溯源、供应商标注 |
| 6 | 商品评价 | `pages/goods/reviews` | ⭐ | 用户评价列表、带图评价 |

**路由参数：**

| 页面 | 参数 | 说明 |
|------|------|------|
| `pages/goods/detail` | `?id=xxx&kocId=xxx` | 商品ID + KOC追踪标识 |

---

### 2.4 购物车与下单模块

| 序号 | 页面 | 路径 | 优先级 | 说明 |
|:----:|------|------|:------:|------|
| 7 | 🏠 购物车 | `pages/cart/index` | 🔑 | Tab页。商品列表、拆包提示、库存校验 |
| 8 | 确认订单 | `pages/checkout/index` | 🔑 | 地址、多包裹确认、优惠券、运费、支付 |
| 9 | 地址列表 | `pages/address/list` | 🔑 | 管理收货地址 |
| 10 | 地址编辑 | `pages/address/edit` | 🔑 | 新增/编辑 / 设为默认 |
| 11 | 支付结果 | `pages/payment/result` | 🔑 | 支付成功/失败结果页 |

**路由参数：**

| 页面 | 参数 | 说明 |
|------|------|------|
| `pages/checkout/index` | `?type=cart` 或 `?type=buy&goodsId=xxx&skuId=xxx&num=1` | 购物车结算 / 立即购买 |
| `pages/address/edit` | `?id=xxx` | 编辑已有地址；无参数=新增 |
| `pages/payment/result` | `?orderId=xxx&status=success\|fail` | 订单ID + 支付结果 |

---

### 2.5 订单模块

| 序号 | 页面 | 路径 | 优先级 | 说明 |
|:----:|------|------|:------:|------|
| 12 | 🏠 订单列表 | `pages/order/list` | 🔑 | Tab页。Tab切换：全部/待付款/待发货/待收货/已完成 |
| 13 | 订单详情 | `pages/order/detail` | 🔑 | 商品信息、金额、多包裹物流入口、状态时间线 |
| 14 | 物流详情 | `pages/order/logistics` | 🔑 | 物流轨迹时间线、快递公司+单号 |

**路由参数：**

| 页面 | 参数 | 说明 |
|------|------|------|
| `pages/order/detail` | `?id=xxx` | 订单ID |
| `pages/order/logistics` | `?orderId=xxx&packageIndex=0` | 订单ID + 包裹序号 |

---

### 2.6 售后模块

| 序号 | 页面 | 路径 | 优先级 | 说明 |
|:----:|------|------|:------:|------|
| 15 | 申请售后 | `pages/aftersale/apply` | 🔑 | 选择商品、售后类型、原因、上传凭证 |
| 16 | 售后详情 | `pages/aftersale/detail` | 🔑 | 售后进度、协商记录 |
| 17 | 售后列表 | `pages/aftersale/list` | ⭐ | 用户所有售后记录 |

**路由参数：**

| 页面 | 参数 | 说明 |
|------|------|------|
| `pages/aftersale/apply` | `?orderId=xxx&packageIndex=0&goodsId=xxx` | 订单+包裹+商品定位 |
| `pages/aftersale/detail` | `?id=xxx` | 售后单ID |

---

### 2.7 我的模块

| 序号 | 页面 | 路径 | 优先级 | 说明 |
|:----:|------|------|:------:|------|
| 18 | 🏠 我的 | `pages/mine/index` | 🔑 | Tab页。用户信息、订单入口、KOC入口、优惠券、收藏 |
| 19 | 优惠券 | `pages/coupon/list` | ⭐ | 我的优惠券列表 |
| 20 | 我的收藏 | `pages/collection/index` | 💎 | 收藏商品列表 |
| 21 | 关于我们 | `pages/about/index` | 💎 | 平台介绍 |
| 22 | 联系客服 | `pages/service/index` | ⭐ | 在线客服/电话 |
| 23 | 设置 | `pages/settings/index` | 💎 | 清理缓存、关于 |

---

### 2.8 KOC 分销模块

> 入口：`pages/mine/index` → "成为分销员" 或 "KOC工作台"

| 序号 | 页面 | 路径 | 优先级 | 说明 |
|:----:|------|------|:------:|------|
| 24 | KOC 入驻 | `pages/koc/register` | 🔑 | 填写资料、签署协议、提交审核 |
| 25 | KOC 审核状态 | `pages/koc/status` | 🔑 | 审核中/已通过/已驳回状态展示 |
| 26 | 🏠 KOC 工作台 | `pages/koc/dashboard` | 🔑 | 数据概览：曝光/点击/转化/订单/佣金 |
| 27 | KOC 推广订单 | `pages/koc/orders` | 🔑 | 推广带来的订单明细列表 |
| 28 | 推广工具 | `pages/koc/tools` | 🔑 | 推广码、短链、海报、商品推广页入口 |
| 29 | 海报生成 | `pages/koc/poster` | 🔑 | 选商品 → 生成带推广码的海报 |
| 30 | 素材库 | `pages/koc/materials` | ⭐ | 平台提供的商品图、文案模板 |
| 31 | KOC 收益 | `pages/koc/earnings` | 🔑 | 佣金明细、累计收益、可提现余额 |
| 32 | KOC 提现 | `pages/koc/withdraw` | 🔑 | 提现到微信零钱 |
| 33 | KOC 收益排行 | `pages/koc/ranking` | 💎 | KOC收益排行榜 |
| 34 | KOC 粉丝 | `pages/koc/fans` | ⭐ | 通过该KOC进来的用户列表 |

**路由参数：**

| 页面 | 参数 | 说明 |
|------|------|------|
| `pages/koc/poster` | `?goodsId=xxx` | 指定商品生成海报 |

---

## 三、页面全量索引（按路径排序）

| # | 路径 | 页面名 | 优先级 | 版本 |
|:--|------|--------|:------:|:----:|
| 1 | `pages/home/index` | 首页 | 🔑 | v1.0 |
| 2 | `pages/category/index` | 分类 | 🔑 | v1.0 |
| 3 | `pages/goods/detail` | 商品详情 | 🔑 | v1.0 |
| 4 | `pages/goods/reviews` | 商品评价 | ⭐ | v1.2 |
| 5 | `pages/search/result` | 搜索结果 | 🔑 | v1.0 |
| 6 | `pages/activity/flash` | 限时活动 | ⭐ | v1.2 |
| 7 | `pages/cart/index` | 购物车 | 🔑 | v1.0 |
| 8 | `pages/checkout/index` | 确认订单 | 🔑 | v1.0 |
| 9 | `pages/address/list` | 地址列表 | 🔑 | v1.0 |
| 10 | `pages/address/edit` | 地址编辑 | 🔑 | v1.0 |
| 11 | `pages/payment/result` | 支付结果 | 🔑 | v1.0 |
| 12 | `pages/order/list` | 订单列表 | 🔑 | v1.0 |
| 13 | `pages/order/detail` | 订单详情 | 🔑 | v1.0 |
| 14 | `pages/order/logistics` | 物流详情 | 🔑 | v1.0 |
| 15 | `pages/aftersale/apply` | 申请售后 | 🔑 | v1.0 |
| 16 | `pages/aftersale/detail` | 售后详情 | 🔑 | v1.0 |
| 17 | `pages/aftersale/list` | 售后列表 | ⭐ | v1.1 |
| 18 | `pages/mine/index` | 我的 | 🔑 | v1.0 |
| 19 | `pages/coupon/list` | 优惠券 | ⭐ | v1.2 |
| 20 | `pages/collection/index` | 我的收藏 | 💎 | v2.0 |
| 21 | `pages/about/index` | 关于我们 | 💎 | v2.0 |
| 22 | `pages/service/index` | 联系客服 | ⭐ | v1.1 |
| 23 | `pages/settings/index` | 设置 | 💎 | v2.0 |
| 24 | `pages/koc/register` | KOC入驻 | 🔑 | v1.0 |
| 25 | `pages/koc/status` | KOC审核状态 | 🔑 | v1.0 |
| 26 | `pages/koc/dashboard` | KOC工作台 | 🔑 | v1.1 |
| 27 | `pages/koc/orders` | KOC推广订单 | 🔑 | v1.1 |
| 28 | `pages/koc/tools` | 推广工具 | 🔑 | v1.1 |
| 29 | `pages/koc/poster` | 海报生成 | 🔑 | v1.1 |
| 30 | `pages/koc/materials` | 素材库 | ⭐ | v1.2 |
| 31 | `pages/koc/earnings` | KOC收益 | 🔑 | v1.1 |
| 32 | `pages/koc/withdraw` | KOC提现 | 🔑 | v1.1 |
| 33 | `pages/koc/ranking` | 收益排行 | 💎 | v2.0 |
| 34 | `pages/koc/fans` | KOC粉丝 | ⭐ | v1.2 |

---

## 四、版本 → 页面映射

### v1.0 MVP · 核心交易闭环 （19 页）

```
Tab页        pages/home/index, pages/category/index, pages/cart/index,
             pages/order/list, pages/mine/index

商品&搜索     pages/goods/detail, pages/search/result

下单&支付     pages/checkout/index, pages/address/list, pages/address/edit,
             pages/payment/result

订单&售后     pages/order/detail, pages/order/logistics,
             pages/aftersale/apply, pages/aftersale/detail

KOC基础      pages/koc/register, pages/koc/status
```

### v1.1 KOC分销完整上线 （+8 页）

```
KOC          pages/koc/dashboard, pages/koc/orders, pages/koc/tools,
             pages/koc/poster, pages/koc/earnings, pages/koc/withdraw

售后+服务    pages/aftersale/list, pages/service/index
```

### v1.2 营销与运营深化 （+5 页）

```
营销         pages/activity/flash

优惠券&素材  pages/coupon/list

KOC素材+粉丝 pages/koc/materials, pages/koc/fans

商品评价     pages/goods/reviews
```

### v2.0 体验升级 （+4 页）

```
收藏&设置     pages/collection/index, pages/settings/index

排行&关于     pages/koc/ranking, pages/about/index
```

---

## 五、页面跳转关系图

```
                            包裹卡片/KOC链接(带参数入口)
                                    │
                                    ▼
    ┌──────────────────────────────────────────────────────────────┐
    │                         首页 home/index                       │
    │  Banner → 活动页 │ 金刚位 → 分类 │ 推荐 → 详情 │ 搜索 → 结果   │
    └────┬─────────┬──────────┬──────────┬─────────────────────────┘
         │         │          │          │
    ┌────▼──┐ ┌───▼────┐ ┌──▼──────┐ ┌▼──────────┐
    │ 分类   │ │搜索结果 │ │商品详情  │ │限时活动    │
    │category│ │search/ │ │goods/   │ │activity/  │
    │        │ │result  │ │detail   │ │flash      │
    └────┬───┘ └───┬────┘ └──┬──────┘ └───────────┘
         │         │         │
         │    ┌────▼────┐    │   ┌──────────┐
         │    │购物车    │◄───┘   │商品评价    │
         │    │cart     │        │goods/     │
         │    └────┬────┘        │reviews    │
         │         │             └──────────┘
         │    ┌────▼────┐
         │    │确认订单  │
         │    │checkout │──── 地址管理 ──── 地址编辑
         │    └────┬────┘     address/list  address/edit
         │         │
         │    ┌────▼────┐
         │    │支付结果  │
         │    │payment/ │
         │    │result   │
         │    └────┬────┘
         │         │
         │    ┌────▼──────────────────────┐
         │    │        订单列表 order/list  │
         │    └────────┬──────────────────┘
         │    ┌────────▼────────┐
         │    │   订单详情        │
         │    │   order/detail   │
         │    └──┬──────────┬───┘
         │  ┌────▼───┐ ┌───▼────────┐
         │  │物流详情 │ │申请售后      │
         │  │order/  │ │aftersale/   │
         │  │logistics│ │apply        │
         │  └────────┘ └──┬─────────┘
         │           ┌────▼───────┐
         │           │售后详情      │
         │           │aftersale/   │
         │           │detail       │
         │           └────────────┘
         │
    ┌────▼────────────────────────────────────────────┐
    │                    我的 mine/index                │
    │  ├─ 优惠券 ── coupon/list                        │
    │  ├─ 收藏 ──── collection/index                   │
    │  ├─ 客服 ──── service/index                      │
    │  ├─ 关于 ──── about/index                        │
    │  ├─ 设置 ──── settings/index                     │
    │  └─ KOC入口 ──────────────────────────────────┐  │
    └───────────────────────────────────────────────┼──┘
                                                    │
    ┌───────────────────────────────────────────────▼──────────────────────┐
    │                        KOC 体系                                      │
    │                                                                     │
    │  未入驻 ──→ koc/register ──→ koc/status                             │
    │                                                                     │
    │  已入驻 ──→ koc/dashboard ─────────────────┐                        │
    │              │ 数据概览                      │                       │
    │              ├─ koc/orders  推广订单          │                       │
    │              ├─ koc/earnings 收益明细         │                       │
    │              │   └─ koc/withdraw 提现        │                       │
    │              ├─ koc/tools  推广工具           │                       │
    │              │   └─ koc/poster 海报生成      │                       │
    │              ├─ koc/materials 素材库          │                       │
    │              ├─ koc/fans 粉丝列表             │                       │
    │              └─ koc/ranking 收益排行          │                       │
    └──────────────────────────────────────────────┴───────────────────────┘
```

---

## 六、关键交互说明

### 6.1 渠道来源追踪

所有外部入口进入小程序时，通过 `App.onLaunch` / `App.onShow` 的 `query` 参数获取渠道信息并全局存储：

```
包裹卡片:   ?source=card&batchId=xxx&cardId=xxx
KOC分享:    ?kocId=xxx&shareType=moment|group|video
短链:       ?utm_source=xxx&utm_medium=xxx&utm_campaign=xxx
```

全局埋点 SDK 在所有后续请求中携带渠道参数，确保下单时归因准确。

### 6.2 多包裹物流展示

订单详情页 (`order/detail`) 展示拆包后的包裹列表，点击每个包裹跳转独立物流页：
```
order/detail → order/logistics?orderId=xxx&packageIndex=0
             → order/logistics?orderId=xxx&packageIndex=1
             → ...
```

### 6.3 KOC 入口状态判断

```
我的 mine/index
  │
  ├── 未申请 KOC → 显示"成为分销员"入口 → koc/register
  ├── 审核中      → 显示"审核中"入口     → koc/status
  ├── 审核通过    → 显示"KOC工作台"入口  → koc/dashboard
  └── 审核驳回    → 显示"重新申请"入口   → koc/register (预填)
```

---

## 七、分包建议

小程序主包限制 2MB，建议按模块分包：

```
主包 (main package)
├── pages/home/index          # Tab 页必须放主包
├── pages/category/index      # Tab 页必须放主包
├── pages/cart/index          # Tab 页必须放主包
├── pages/order/list          # Tab 页必须放主包
├── pages/mine/index          # Tab 页必须放主包
├── pages/goods/detail        # 高频入口，放主包
├── pages/search/result       # 高频入口，放主包
└── 全局组件、公共样式

分包A: 下单结算 (subpackage-checkout)
├── pages/checkout/index
├── pages/address/list
├── pages/address/edit
└── pages/payment/result

分包B: 订单售后 (subpackage-order)
├── pages/order/detail
├── pages/order/logistics
├── pages/aftersale/apply
├── pages/aftersale/detail
└── pages/aftersale/list

分包C: KOC体系 (subpackage-koc)
├── pages/koc/*
└── (所有KOC相关页面)

分包D: 其他 (subpackage-extra)
├── pages/coupon/list
├── pages/collection/index
├── pages/activity/flash
├── pages/goods/reviews
├── pages/service/index
├── pages/about/index
└── pages/settings/index
```
