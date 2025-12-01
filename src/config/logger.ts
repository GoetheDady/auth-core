/**
 * Winston 日志配置
 * 根据环境变量配置日志行为
 */

export interface WinstonLoggerConfiguration {
  // 日志级别: debug | info | success | warn | error
  level: string;
  
  // 是否启用控制台输出
  enableConsole: boolean;
  
  // 是否启用文件输出
  enableFile: boolean;
  
  // 日志文件目录
  logDir: string;
  
  // 单个日志文件最大大小（如：'10m', '20m'）
  maxFileSize: string;
  
  // 保留的日志文件（如：'7d', '14d' 或数字）
  maxFiles: string;
  
  // 是否压缩归档的日志文件
  zippedArchive: boolean;
  
  // 日期格式
  datePattern: string;
}

/**
 * 获取日志级别
 */
function getLogLevel(): string {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  
  // 验证日志级别
  const validLevels = ['debug', 'info', 'success', 'warn', 'error'];
  if (validLevels.includes(level || '')) {
    return level!;
  }
  
  // 生产环境默认 info，开发环境默认 debug
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

/**
 * Winston 日志配置
 */
const loggerConfig: WinstonLoggerConfiguration = {
  // 日志级别
  level: getLogLevel(),
  
  // 是否启用控制台输出（默认启用）
  enableConsole: process.env.LOG_CONSOLE !== 'false',
  
  // 是否启用文件输出（生产环境默认启用）
  enableFile: process.env.LOG_FILE === 'true' || process.env.NODE_ENV === 'production',
  
  // 日志文件目录
  logDir: process.env.LOG_DIR || 'logs',
  
  // 单个日志文件最大大小
  maxFileSize: process.env.LOG_MAX_FILE_SIZE || '20m',
  
  // 保留的日志文件（14天）
  maxFiles: process.env.LOG_MAX_FILES || '14d',
  
  // 是否压缩归档的日志文件
  zippedArchive: process.env.LOG_ZIPPED === 'true' || process.env.NODE_ENV === 'production',
  
  // 日期格式
  datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
};

/**
 * 日志配置说明
 * 
 * 环境变量：
 * - LOG_LEVEL: 日志级别 (debug | info | success | warn | error)
 * - LOG_CONSOLE: 是否启用控制台输出 (true | false)
 * - LOG_FILE: 是否启用文件输出 (true | false)
 * - LOG_DIR: 日志文件目录
 * - LOG_MAX_FILE_SIZE: 单个日志文件最大大小 (如：'10m', '20m', '100m')
 * - LOG_MAX_FILES: 保留的日志文件 (如：'7d', '14d', '30d' 或数字 '10')
 * - LOG_ZIPPED: 是否压缩归档的日志文件 (true | false)
 * - LOG_DATE_PATTERN: 日期格式 (默认：'YYYY-MM-DD')
 * 
 * 示例配置：
 * 
 * 开发环境：
 * LOG_LEVEL=debug
 * LOG_CONSOLE=true
 * LOG_FILE=false
 * 
 * 生产环境：
 * LOG_LEVEL=info
 * LOG_CONSOLE=true
 * LOG_FILE=true
 * LOG_DIR=/var/log/authcore
 * LOG_MAX_FILE_SIZE=50m
 * LOG_MAX_FILES=30d
 * LOG_ZIPPED=true
 */

export default loggerConfig;

