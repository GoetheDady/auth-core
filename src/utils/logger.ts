/**
 * Winston 日志系统
 * 支持：
 * - 彩色控制台输出
 * - 文件输出（带日志轮转）
 * - 结构化日志
 * - 不同日志级别
 * - 请求 ID 追踪
 * - 多种传输方式
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// 日志级别枚举（保持向后兼容）
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  SUCCESS = 2,
  WARN = 3,
  ERROR = 4,
}

// Winston 日志级别映射
const winstonLevels = {
  error: 0,
  warn: 1,
  success: 2,
  info: 3,
  debug: 4,
};

// Winston 日志颜色
const winstonColors = {
  error: 'red',
  warn: 'yellow',
  success: 'green',
  info: 'blue',
  debug: 'magenta',
};

// 添加自定义颜色
winston.addColors(winstonColors);

// 获取日志级别
function getLogLevel(): string {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  if (['debug', 'info', 'success', 'warn', 'error'].includes(level || '')) {
    return level!;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

// 自定义格式：添加时间戳和格式化
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 控制台格式（彩色，易读）
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `[${timestamp}] [${level}]`;
    
    // 添加请求 ID（如果有）
    if (meta.requestId) {
      msg += ` [${meta.requestId}]`;
      delete meta.requestId;
    }
    
    msg += ` ${message}`;
    
    // 添加其他元数据
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0 && metaKeys[0] !== 'timestamp') {
      msg += ` ${JSON.stringify(meta)}`;
    }
    
    return msg;
  })
);

// 创建传输器数组
const transports: winston.transport[] = [];

// 控制台传输器（始终启用，除非明确禁用）
if (process.env.LOG_CONSOLE !== 'false') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// 文件传输器（生产环境默认启用，或通过环境变量启用）
const enableFileLogging = process.env.LOG_FILE === 'true' || process.env.NODE_ENV === 'production';

if (enableFileLogging) {
  const logDir = process.env.LOG_DIR || 'logs';
  const maxSize = process.env.LOG_MAX_FILE_SIZE || '20m';
  const maxFiles = process.env.LOG_MAX_FILES || '14d';

  // 错误日志文件（仅记录错误）
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize,
      maxFiles,
      format: customFormat,
      zippedArchive: true,
    })
  );

  // 组合日志文件（所有级别）
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize,
      maxFiles,
      format: customFormat,
      zippedArchive: true,
    })
  );
}

// 创建 Winston logger 实例
const winstonLogger = winston.createLogger({
  levels: winstonLevels,
  level: getLogLevel(),
  defaultMeta: { service: 'authcore' },
  transports,
  // 处理未捕获的异常和拒绝
  exceptionHandlers: enableFileLogging
    ? [
        new DailyRotateFile({
          filename: path.join(process.env.LOG_DIR || 'logs', 'exceptions-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          zippedArchive: true,
        }),
      ]
    : [],
  rejectionHandlers: enableFileLogging
    ? [
        new DailyRotateFile({
          filename: path.join(process.env.LOG_DIR || 'logs', 'rejections-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          zippedArchive: true,
        }),
      ]
    : [],
});

/**
 * Logger 包装类（保持向后兼容）
 */
class Logger {
  /**
   * 调试日志
   */
  debug(...args: any[]): void {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    winstonLogger.debug(message);
  }

  /**
   * 信息日志
   */
  info(...args: any[]): void {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    winstonLogger.info(message);
  }

  /**
   * 成功日志
   */
  success(...args: any[]): void {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    winstonLogger.log('success', message);
  }

  /**
   * 警告日志
   */
  warn(...args: any[]): void {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    winstonLogger.warn(message);
  }

  /**
   * 错误日志
   */
  error(...args: any[]): void {
    const message = args.map(arg => {
      if (arg instanceof Error) {
        return arg.stack || arg.message;
      }
      return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
    }).join(' ');
    winstonLogger.error(message);
  }

  /**
   * 结构化日志（JSON 格式）
   */
  logStructured(level: LogLevel, data: Record<string, any>): void {
    const levelName = LogLevel[level].toLowerCase();
    const winstonLevel = levelName === 'success' ? 'success' : levelName;
    
    // 提取 message 字段
    const { message, type, ...meta } = data;
    const logMessage = message || type || 'Structured log';
    
    winstonLogger.log(winstonLevel, logMessage, meta);
  }

  /**
   * 带请求 ID 的日志
   */
  logWithRequestId(level: string, message: string, requestId?: string, meta?: any): void {
    winstonLogger.log(level, message, { requestId, ...meta });
  }

  /**
   * 获取 Winston 实例（用于高级用法）
   */
  getWinstonInstance(): winston.Logger {
    return winstonLogger;
  }
}

// 创建默认 logger 实例
const logger = new Logger();

// 导出
export default logger;
export { Logger, winstonLogger };

// 导出便捷方法
export const logWithRequestId = (level: string, message: string, requestId?: string, meta?: any) => {
  logger.logWithRequestId(level, message, requestId, meta);
};