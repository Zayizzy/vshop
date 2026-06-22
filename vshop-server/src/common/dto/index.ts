import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsInt,
  ArrayMinSize,
  IsBoolean,
  IsIn,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

/** 登录请求体（小程序 wx.login 拿到的临时 code） */
export class WechatLoginDto {
  @IsString()
  code!: string;
}

/** 渠道上报请求体（KOC 推广扫码进入时上报） */
export class ChannelReportDto {
  @IsString()
  source!: string;

  @IsOptional()
  @IsString()
  kocId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;
}

// ===== 购物车 =====

export class AddCartItemDto {
  @IsString()
  skuId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class UpdateCartItemDto {
  @IsString()
  skuId!: string;

  // 允许 0 用于「数量改 0 → 删除条目」的接口语义
  @IsInt()
  @Min(0)
  quantity!: number;
}

// ===== 地址 =====

export class CreateAddressDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsString()
  province!: string;

  @IsString()
  city!: string;

  @IsString()
  district!: string;

  @IsString()
  detail!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() detail?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

// ===== 订单 =====

/**
 * 下单条目：服务端只信任 skuId + quantity，
 * 价格一律由 service 层根据 GoodSupplier/Sku 重算（参见 OrderService.createOrder）。
 * 因此即便前端传了 price，DTO 也不暴露该字段。
 */
export class OrderItemDto {
  @IsString()
  skuId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @IsString()
  addressId!: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  kocId?: string;

  @IsOptional()
  @IsString()
  couponId?: string;
}

export class OrderIdDto {
  @IsString()
  orderId!: string;
}

// ===== 商品 =====

export class ToggleFavoriteDto {
  @IsString()
  goodId!: string;

  @IsBoolean()
  isCollected!: boolean;
}

// ===== 后台 =====

export class AdminLoginDto {
  @IsString()
  username!: string;

  @IsString()
  password!: string;
}

// ===== 优惠券管理（admin） =====
// 金额字段（value/minAmount）以「元」传入，service 层 yuanToCent 转分存储。
// discountValue 为折扣率 0~1（如 0.85），非金额。

export class CreateCouponDto {
  @IsString()
  name!: string;

  @IsIn(['cash', 'discount'])
  type!: string;

  /** 现金券面额（元）。type=cash 时必填 */
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  /** 折扣率 0~1。type=discount 时必填 */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  discountValue?: number;

  /** 满减门槛（元），默认 0 */
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsString()
  scopeType?: string;

  @IsInt()
  @Min(1)
  totalCount!: number;

  @IsDateString()
  expireTime!: string;
}

export class UpdateCouponDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsIn(['cash', 'discount']) type?: string;
  @IsOptional() @IsNumber() @Min(0) value?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) discountValue?: number;
  @IsOptional() @IsNumber() @Min(0) minAmount?: number;
  @IsOptional() @IsString() scopeType?: string;
  @IsOptional() @IsInt() @Min(1) totalCount?: number;
  @IsOptional() @IsDateString() expireTime?: string;
}

export class CouponStatusDto {
  @IsIn(['active', 'disabled'])
  status!: string;
}

export class GrantCouponDto {
  @IsString()
  couponId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds!: string[];
}

