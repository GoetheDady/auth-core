/**
 * 简单的日志工具
 * 用于统一的日志输出格式
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * 格式化时间戳
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * 信息日志
 */
function info(message, ...args) {
  console.log(`${colors.blue}[INFO]${colors.reset} [${getTimestamp()}] ${message}`, ...args);
}

/**
 * 成功日志
 */
function success(message, ...args) {
  console.log(`${colors.green}[SUCCESS]${colors.reset} [${getTimestamp()}] ${message}`, ...args);
}

/**
 * 警告日志
 */
function warn(message, ...args) {
  console.warn(`${colors.yellow}[WARN]${colors.reset} [${getTimestamp()}] ${message}`, ...args);
}

/**
 * 错误日志
 */
function error(message, ...args) {
  console.error(`${colors.red}[ERROR]${colors.reset} [${getTimestamp()}] ${message}`, ...args);
}

/**
 * 调试日志（仅在开发环境显示）
 */
function debug(message, ...args) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${colors.magenta}[DEBUG]${colors.reset} [${getTimestamp()}] ${message}`, ...args);
  }
}

module.exports = {
  info,
  success,
  warn,
  error,
  debug
};

