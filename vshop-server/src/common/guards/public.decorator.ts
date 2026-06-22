import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 标记接口为公开访问，豁免 JWT 鉴权。
 * 用法：@Public() 装饰在 controller 方法或类上。
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
