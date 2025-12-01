/**
 * 增强的错误处理中间件
 * 支持：
 * - 自定义错误类处理
 * - 详细的错误日志
 * - 请求 ID 追踪
 * - 结构化错误响应
 * - 开发/生产环境区分
 */

import { Request, Response, NextFunction } from 'express';
import logger, { LogLevel } from '../utils/logger';
import { AppError, ErrorCode } from '../utils/AppError';

/**
 * 错误响应接口
 */
interface ErrorResponse {
  success: false;
  message: string;
  errorCode?: ErrorCode;
  requestId?: string;
  timestamp: string;
  path?: string;
  details?: any;
  stack?: string;
}

/**
 * 全局错误处理中间件
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  // 获取请求 ID
  const requestId = req.id || 'unknown';
  
  // 默认错误信息
  let statusCode = 500;
  let message = '服务器内部错误';
  let errorCode: ErrorCode | undefined;
  let details: any;
  let isOperational = false;

  // 处理自定义 AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.errorCode;
    details = err.details;
    isOperational = err.isOperational;
    
    // 记录错误日志
    if (isOperational) {
      // 操作性错误（预期的错误）- INFO 级别
      logger.logStructured(LogLevel.INFO, {
        type: 'operational_error',
        requestId,
        method: req.method,
        path: req.path,
        statusCode,
        errorCode,
        message,
        details,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    } else {
      // 程序性错误（非预期的错误）- ERROR 级别
      logger.logStructured(LogLevel.ERROR, {
        type: 'programming_error',
        requestId,
        method: req.method,
        path: req.path,
        statusCode,
        errorCode,
        message,
        stack: err.stack,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    }
  }
  // 处理 Mongoose 验证错误
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = '数据验证失败';
    errorCode = ErrorCode.VALIDATION_ERROR;
    details = Object.values(err.errors).map((e: any) => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    
    logger.logStructured(LogLevel.WARN, {
      type: 'validation_error',
      requestId,
      method: req.method,
      path: req.path,
      details,
      ip: req.ip
    });
  }
  // 处理 Mongoose 重复键错误
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} 已存在`;
    errorCode = ErrorCode.DUPLICATE_KEY;
    details = {
      field,
      value: err.keyValue?.[field]
    };
    
    logger.logStructured(LogLevel.WARN, {
      type: 'duplicate_key_error',
      requestId,
      method: req.method,
      path: req.path,
      field,
      ip: req.ip
    });
  }
  // 处理 JWT 错误
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token 无效';
    errorCode = ErrorCode.INVALID_TOKEN;
    
    logger.logStructured(LogLevel.WARN, {
      type: 'jwt_error',
      requestId,
      method: req.method,
      path: req.path,
      message: err.message,
      ip: req.ip
    });
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token 已过期';
    errorCode = ErrorCode.TOKEN_EXPIRED;
    
    logger.logStructured(LogLevel.WARN, {
      type: 'token_expired',
      requestId,
      method: req.method,
      path: req.path,
      expiredAt: err.expiredAt,
      ip: req.ip
    });
  }
  // 处理 Express Validator 错误
  else if (err.array && typeof err.array === 'function') {
    statusCode = 400;
    message = '请求参数验证失败';
    errorCode = ErrorCode.VALIDATION_ERROR;
    details = err.array();
    
    logger.logStructured(LogLevel.WARN, {
      type: 'request_validation_error',
      requestId,
      method: req.method,
      path: req.path,
      details,
      ip: req.ip
    });
  }
  // 处理其他未知错误
  else {
    statusCode = err.statusCode || 500;
    message = err.message || '服务器内部错误';
    errorCode = ErrorCode.INTERNAL_ERROR;
    
    // 未知错误记录完整堆栈
    logger.logStructured(LogLevel.ERROR, {
      type: 'unknown_error',
      requestId,
      method: req.method,
      path: req.path,
      message,
      stack: err.stack,
      error: err,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  }

  // 构建错误响应
  const errorResponse: ErrorResponse = {
    success: false,
    message,
    errorCode,
    requestId,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // 添加详细信息（如果有）
  if (details) {
    errorResponse.details = details;
  }

  // 开发环境返回堆栈信息
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }

  // 发送错误响应
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 错误处理中间件
 */
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = req.id || 'unknown';
  
  logger.logStructured(LogLevel.WARN, {
    type: 'not_found',
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    message: `路由 ${req.method} ${req.path} 不存在`,
    errorCode: ErrorCode.NOT_FOUND,
    requestId,
    timestamp: new Date().toISOString(),
    path: req.path
  });
}

/**
 * 异步错误包装器
 * 用于包装异步路由处理器，自动捕获 Promise 错误
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 未捕获异常处理
 */
export function setupUncaughtExceptionHandlers(): void {
  // 处理未捕获的异常
  process.on('uncaughtException', (error: Error) => {
    logger.error('未捕获的异常:', error);
    logger.error('堆栈信息:', error.stack);
    
    // 记录到文件
    logger.logStructured(LogLevel.ERROR, {
      type: 'uncaught_exception',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // 优雅退出
    process.exit(1);
  });

  // 处理未处理的 Promise 拒绝
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('未处理的 Promise 拒绝:', reason);
    
    // 记录到文件
    logger.logStructured(LogLevel.ERROR, {
      type: 'unhandled_rejection',
      reason: reason?.message || reason,
      stack: reason?.stack,
      timestamp: new Date().toISOString()
    });
    
    // 不立即退出，给应用机会处理
    // 但在生产环境中可能需要退出
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
}

export default errorHandler;

