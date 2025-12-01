import mongoose from 'mongoose';
import logger from '../utils/logger';

/**
 * 连接 MongoDB 数据库
 */
export async function connectDB(): Promise<void> {
  try {
    // 如果已经连接,先关闭之前的连接
    if (mongoose.connection.readyState !== 0) {
      logger.warn('检测到已有 MongoDB 连接，正在关闭...');
      await mongoose.connection.close();
    }
    
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/authCore';
    
    // 从 URI 中解析数据库名称
    let dbNameFromURI = 'authCore';
    try {
      const url = new URL(mongoURI);
      // MongoDB URI 格式: mongodb://[username:password@]host[:port][/database][?options]
      const pathParts = url.pathname.split('/').filter(p => p);
      if (pathParts.length > 0) {
        dbNameFromURI = pathParts[0];
      }
    } catch (e) {
      // 如果 URI 解析失败，尝试正则匹配
      const match = mongoURI.match(/\/([^/?]+)(\?|$)/);
      if (match && match[1]) {
        dbNameFromURI = match[1];
      }
    }
    
    // 隐藏密码信息用于日志输出
    const safeURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    logger.info(`正在连接 MongoDB: ${safeURI}`);
    logger.info(`预期数据库名称: ${dbNameFromURI}`);
    
    await mongoose.connect(mongoURI, {
      // 认证相关配置
      authSource: 'admin',
      // 连接超时设置
      serverSelectionTimeoutMS: 5000,
      // 心跳频率
      heartbeatFrequencyMS: 10000,
    });
    
    // 获取实际连接的数据库名称
    const actualDbName = mongoose.connection.db?.databaseName || 'unknown';
    logger.success(`MongoDB 连接成功！数据库: ${actualDbName}`);
    
    // 验证数据库名称是否匹配
    if (actualDbName !== dbNameFromURI) {
      logger.warn(`⚠️  警告：URI 中指定的数据库名称 (${dbNameFromURI}) 与实际连接的数据库名称 (${actualDbName}) 不一致！`);
      logger.warn(`实际使用的数据库: ${actualDbName}`);
    }
    
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
    logger.error('MongoDB 连接失败:', (error as Error).message);
    process.exit(1);
  }
}

