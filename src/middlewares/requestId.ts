/**
 * 请求 ID 追踪中间件
 * 为每个请求生成唯一 ID，方便日志追踪和问题排查
 */

import { Request, Response, NextFunction } from 'express';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

/**
 * 请求 ID 中间件
 * 从请求头读取或生成新的请求 ID
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 尝试从请求头获取请求 ID（支持分布式追踪）
  const requestId = (req.headers['x-request-id'] as string) || 
                    (req.headers['x-correlation-id'] as string) || 
                    uuidv4();
  
  // 将请求 ID 挂载到 request 对象
  req.id = requestId;
  
  // 在响应头中返回请求 ID
  res.setHeader('X-Request-ID', requestId);
  
  next();
}

export default requestIdMiddleware;

