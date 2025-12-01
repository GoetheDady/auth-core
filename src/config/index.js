/**
 * 配置统一导出
 */

const { connectDB } = require('./db');
const jwtConfig = require('./jwt');
const emailConfig = require('./email');

module.exports = {
  // 数据库
  connectDB,
  
  // JWT 配置
  jwt: jwtConfig,
  
  // 邮件配置
  email: emailConfig,
  
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },
  
  // 跨域配置
  cors: {
    origins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3001').split(','),
    credentials: true
  }
};

