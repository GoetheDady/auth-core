const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * 连接 MongoDB 数据库
 */
async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/authCore';
    
    // 隐藏密码信息用于日志输出
    const safeURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    logger.info(`正在连接 MongoDB: ${safeURI}`);
    
    await mongoose.connect(mongoURI, {
      // 使用新的 URL 解析器
      useNewUrlParser: true,
      // 使用新的服务器发现和监控引擎
      useUnifiedTopology: true,
      // 认证相关配置
      authSource: 'admin',
      // 连接超时设置
      serverSelectionTimeoutMS: 5000,
      // 心跳频率
      heartbeatFrequencyMS: 10000,
    });
    
    // 获取数据库名称
    const dbName = mongoose.connection.db.databaseName;
    logger.success(`MongoDB 连接成功！数据库: ${dbName}`);
    
    // 监听连接事件
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB 连接错误:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB 连接断开');
    });
    
    // 优雅关闭
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB 连接已关闭（应用终止）');
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('MongoDB 连接失败:', error.message);
    process.exit(1);
  }
}

module.exports = { connectDB };

