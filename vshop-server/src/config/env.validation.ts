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

  // COS 对象存储（生产环境必填，本地开发可不配则回退本地磁盘存储）
  @IsOptional()
  @IsString()
  COS_SECRET_ID?: string;

  @IsOptional()
  @IsString()
  COS_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  COS_BUCKET?: string;

  @IsOptional()
  @IsString()
  COS_REGION?: string;
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
