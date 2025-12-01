/**
 * 配置统一导出
 */

import { connectDB } from './db';
import jwtConfig from './jwt';
import emailConfig, { EmailConfig } from './email';

export interface ServerConfig {
  port: number;
  env: string;
}

export interface CorsConfig {
  origins: string[];
  credentials: boolean;
}

export interface Config {
  connectDB: typeof connectDB;
  jwt: typeof jwtConfig;
  email: EmailConfig;
  server: ServerConfig;
  cors: CorsConfig;
}

const config: Config = {
  // 数据库
  connectDB,
  
  // JWT 配置
  jwt: jwtConfig,
  
  // 邮件配置
  email: emailConfig,
  
  // 服务器配置
  server: {
    port: parseInt(process.env.PORT || '3000'),
    env: process.env.NODE_ENV || 'development'
  },
  
  // 跨域配置
  cors: {
    origins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3001').split(','),
    credentials: true
  }
};

export default config;

