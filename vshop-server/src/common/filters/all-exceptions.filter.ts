import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * 统一异常过滤器：把所有异常转为前端约定的响应结构 { code, message, data }。
 * 成功响应仍由各 controller 返回 { code: 0, message, data }。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 500;
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = status;
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : (res as any).message || exception.message;
      if (status === HttpStatus.UNAUTHORIZED) code = 401;
    } else if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      exception.code === 'P2025'
    ) {
      // Prisma: 记录未找到（update/delete 命中 0 行）
      status = HttpStatus.NOT_FOUND;
      code = 404;
      message = '资源不存在或无权操作';
    } else {
      this.logger.error('未处理异常', (exception as any)?.stack || exception);
    }

    // 库存扣减依赖的条件更新失败用 BadRequest 抛出，这里保证 message 透传
    if (
      !(exception instanceof HttpException) &&
      exception instanceof Error &&
      exception.message
    ) {
      // 业务校验错误（BadRequestException 已在上面处理，这里兜底非 Http 的 Error）
      if (!message || message === '服务器内部错误') {
        message = exception.message;
      }
    }

    response.status(status).json({ code, message, data: null });
  }
}
