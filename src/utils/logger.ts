/**
 * 简单的日志工具
 * 支持彩色输出和不同日志级别
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function getTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: string, color: string, ...args: any[]): void {
  const timestamp = getTimestamp();
  console.log(`${color}[${timestamp}] [${level}]${colors.reset}`, ...args);
}

const logger = {
  info(...args: any[]): void {
    formatMessage('INFO', colors.blue, ...args);
  },

  success(...args: any[]): void {
    formatMessage('SUCCESS', colors.green, ...args);
  },

  warn(...args: any[]): void {
    formatMessage('WARN', colors.yellow, ...args);
  },

  error(...args: any[]): void {
    formatMessage('ERROR', colors.red, ...args);
  },

  debug(...args: any[]): void {
    if (process.env.NODE_ENV !== 'production') {
      formatMessage('DEBUG', colors.magenta, ...args);
    }
  },
};

export default logger;