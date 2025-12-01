const logger = require('../utils/logger');

/**
 * 全局错误处理中间件
 */
function errorHandler(err, req, res, next) {
  // 记录错误日志
  logger.error(`${req.method} ${req.path} - ${err.message}`);
  
  // Mongoose 验证错误
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors
    });
  }
  
  // Mongoose 唯一索引冲突
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `该${field === 'email' ? '邮箱' : '用户名'}已被使用`
    });
  }
  
  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token 无效'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token 已过期'
    });
  }
  
  // 自定义业务错误
  if (err.message) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message
    });
  }
  
  // 未知错误
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
}

/**
 * 404 错误处理
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `路由不存在: ${req.method} ${req.path}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};

