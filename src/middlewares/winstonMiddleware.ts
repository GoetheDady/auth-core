/**
 * Express Winston 中间件配置
 * 自动记录 HTTP 请求和错误日志
 */

import expressWinston from 'express-winston';
import { Request, Response, NextFunction } from 'express';
import { winstonLogger } from '../utils/logger';

/**
 * HTTP 请求日志中间件
 * 记录所有 HTTP 请求的详细信息
 */
export const requestLogger = expressWinston.logger({
  winstonInstance: winstonLogger,
  
  // 元数据配置
  meta: true, // 包含请求元数据
  msg: 'HTTP {{req.method}} {{req.url}}', // 日志消息格式
  expressFormat: false, // 不使用默认的 Express 格式
  colorize: false, // 文件日志不需要颜色
  
  // 动态元数据
  dynamicMeta: (req, res) => {
    return {
      requestId: req.id, // 请求 ID
      ip: req.ip, // 客户端 IP
      userAgent: req.headers['user-agent'], // User-Agent
      responseTime: res.get('X-Response-Time'), // 响应时间
    };
  },
  
  // 忽略某些路由（如健康检查）
  ignoreRoute: (req, res) => {
    // 忽略健康检查接口
    return req.path === '/api/health' || req.path === '/health';
  },
  
  // 状态码级别映射
  statusLevels: true, // 根据状态码自动选择日志级别
  level: (req, res) => {
    let level = 'info';
    if (res.statusCode >= 500) {
      level = 'error';
    } else if (res.statusCode >= 400) {
      level = 'warn';
    } else if (res.statusCode >= 300) {
      level = 'info';
    }
    return level;
  },
  
  // 请求白名单（记录这些字段）
  requestWhitelist: [
    'url',
    'method',
    'httpVersion',
    'originalUrl',
    'query',
  ],
  
  // 响应白名单
  responseWhitelist: [
    'statusCode',
  ],
  
  // 请求体白名单（小心敏感信息）
  bodyWhitelist: [], // 不记录请求体，避免泄露密码等敏感信息
  bodyBlacklist: ['password', 'token', 'refreshToken'], // 黑名单
  
  // 跳过某些字段
  skip: (req, res) => {
    // 可以根据条件跳过某些请求
    return false;
  },
});

/**
 * HTTP 错误日志中间件
 * 记录所有 HTTP 错误的详细信息
 */
export const errorLogger: any = expressWinston.errorLogger({
  winstonInstance: winstonLogger,
  
  // 元数据配置
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}} - Error: {{err.message}}',
  
  // 动态元数据
  dynamicMeta: (req, res, err) => {
    return {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      errorName: err.name,
      errorCode: (err as any).errorCode,
      errorStack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    };
  },
  
  // 请求白名单
  requestWhitelist: [
    'url',
    'method',
    'httpVersion',
    'originalUrl',
    'query',
  ],
  
  // 黑名单
  blacklistedMetaFields: ['password', 'token', 'refreshToken'],
  
  // 跳过某些错误
  skip: (req, res, err) => {
    // 可以根据条件跳过某些错误
    return false;
  },
  
  // 日志级别
  level: 'error',
});

/**
 * 自定义请求日志中间件（更灵活）
 * 可以根据需要自定义日志内容
 */
export const customRequestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // 记录请求开始
  winstonLogger.debug('Request started', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    ip: req.ip,
  });
  
  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // 根据状态码选择日志级别
    let level = 'info';
    if (res.statusCode >= 500) {
      level = 'error';
    } else if (res.statusCode >= 400) {
      level = 'warn';
    }
    
    // 记录请求完成
    winstonLogger.log(level, 'Request completed', {
      requestId: req.id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  });
  
  next();
};

const winstonMiddleware = {
  requestLogger,
  errorLogger,
  customRequestLogger,
};

export default winstonMiddleware;

