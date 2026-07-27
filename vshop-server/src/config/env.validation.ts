import { plainToClass } from 'class-transformer';
import { IsString, IsOptional, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  WX_APPID?: string;

  @IsOptional()
  @IsString()
  WX_SECRET?: string;

  // COS 对象存储（云托管元数据 STS 自动鉴权；以下全部可选，有默认值）
  @IsOptional()
  @IsString()
  COS_BUCKET?: string;

  @IsOptional()
  @IsString()
  COS_REGION?: string;

  // 指定服务角色名（不配则按候选顺序自动尝试：TCBRunInvokerRole / TCBRunRole / TcbRunRole）
  @IsOptional()
  @IsString()
  COS_ROLE_NAME?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints || {}).join(', '))
      .filter(Boolean)
      .join('; ');
    throw new Error(`环境变量校验失败: ${messages}`);
  }
  return validated;
}
