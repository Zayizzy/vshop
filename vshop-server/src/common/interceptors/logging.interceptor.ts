import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * 请求日志拦截器：记录请求方法、路径、耗时和状态码。
 * 便于排查慢接口和异常请求。
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = request;
    const userId = (request as any).user?.userId;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const status = context.switchToHttp().getResponse().statusCode;
          this.logger.log(
            `${method} ${originalUrl} ${status} ${duration}ms${userId ? ` user=${userId}` : ''}`,
          );
        },
        error: (err) => {
          const duration = Date.now() - start;
          const status = err?.status || 500;
          this.logger.error(
            `${method} ${originalUrl} ${status} ${duration}ms${userId ? ` user=${userId}` : ''} - ${err?.message || ''}`,
          );
        },
      }),
    );
  }
}
