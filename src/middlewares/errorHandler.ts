import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * 全局错误处理中间件
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  // 记录错误日志
  logger.error(`${req.method} ${req.path} - ${err.message}`);
  
  // Mongoose 验证错误
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e: any) => ({
      field: e.path,
      message: e.message
    }));
    
    res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors
    });
    return;
  }
  
  // Mongoose 重复键错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    res.status(409).json({
      success: false,
      message: `${field} 已存在`
    });
    return;
  }
  
  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Token 无效'
    });
    return;
  }
  
  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Token 已过期'
    });
    return;
  }
  
  // 默认错误
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * 404 错误处理
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `路由 ${req.method} ${req.path} 不存在`
  });
}

