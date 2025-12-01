import jwt from 'jsonwebtoken';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import logger from '../utils/logger';

/**
 * Token 服务
 * 负责 JWT Token 的生成、验证和管理
 */

interface UserPayload {
  userId: string;
  email: string;
  username: string;
}

interface JWTPayload extends UserPayload {
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

interface UserDocument {
  _id: any;
  email: string;
  username: string;
}

/**
 * 生成 Access Token
 * @param user - 用户对象
 * @returns Access Token
 */
export function generateAccessToken(user: UserDocument): string {
  const payload: UserPayload = {
    userId: user._id.toString(),
    email: user.email,
    username: user.username
  };
  
  const options: jwt.SignOptions = {
    algorithm: config.jwt.algorithm as jwt.Algorithm,
    expiresIn: config.jwt.accessTokenExpire as any,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience as string
  };
  
  return jwt.sign(payload, config.jwt.privateKey, options);
}

/**
 * 生成 Refresh Token
 * @returns Refresh Token (UUID v4)
 */
export function generateRefreshToken(): string {
  return uuidv4();
}

/**
 * 验证 Access Token
 * @param token - Access Token
 * @returns 解码后的 payload，验证失败返回 null
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const options: jwt.VerifyOptions = {
      algorithms: [config.jwt.algorithm as jwt.Algorithm],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    };
    
    const decoded = jwt.verify(token, config.jwt.publicKey, options) as JWTPayload;
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      logger.debug('Token 已过期');
    } else if (error.name === 'JsonWebTokenError') {
      logger.debug('Token 无效:', error.message);
    } else {
      logger.error('Token 验证错误:', error.message);
    }
    return null;
  }
}

/**
 * 解析 Token（不验证签名，用于查看过期的 Token）
 * @param token - JWT Token
 * @returns 解码后的 payload
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error: any) {
    logger.error('Token 解析失败:', error.message);
    return null;
  }
}

/**
 * 计算 Refresh Token 过期时间
 * @returns 过期时间
 */
export function getRefreshTokenExpiry(): Date {
  const expireStr = config.jwt.refreshTokenExpire;
  const match = expireStr.match(/^(\d+)([smhd])$/);
  
  if (!match) {
    // 默认 7 天
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  
  return new Date(Date.now() + value * multipliers[unit]);
}

/**
 * 生成邮箱验证令牌
 * @returns 验证令牌
 */
export function generateVerificationToken(): string {
  return uuidv4();
}

/**
 * 计算验证令牌过期时间（24 小时）
 * @returns 过期时间
 */
export function getVerificationTokenExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

