const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Token 服务
 * 负责 JWT Token 的生成、验证和管理
 */

/**
 * 生成 Access Token
 * @param {Object} user - 用户对象
 * @returns {string} Access Token
 */
function generateAccessToken(user) {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    username: user.username
  };
  
  const options = {
    algorithm: config.jwt.algorithm,
    expiresIn: config.jwt.accessTokenExpire,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience
  };
  
  return jwt.sign(payload, config.jwt.privateKey, options);
}

/**
 * 生成 Refresh Token
 * @returns {string} Refresh Token (UUID v4)
 */
function generateRefreshToken() {
  return uuidv4();
}

/**
 * 验证 Access Token
 * @param {string} token - Access Token
 * @returns {Object|null} 解码后的 payload，验证失败返回 null
 */
function verifyAccessToken(token) {
  try {
    const options = {
      algorithms: [config.jwt.algorithm],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    };
    
    const decoded = jwt.verify(token, config.jwt.publicKey, options);
    return decoded;
  } catch (error) {
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
 * @param {string} token - JWT Token
 * @returns {Object|null}
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Token 解析失败:', error.message);
    return null;
  }
}

/**
 * 计算 Refresh Token 过期时间
 * @returns {Date}
 */
function getRefreshTokenExpiry() {
  const expireStr = config.jwt.refreshTokenExpire;
  const match = expireStr.match(/^(\d+)([smhd])$/);
  
  if (!match) {
    // 默认 7 天
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  
  return new Date(Date.now() + value * multipliers[unit]);
}

/**
 * 生成邮箱验证令牌
 * @returns {string}
 */
function generateVerificationToken() {
  return uuidv4();
}

/**
 * 计算验证令牌过期时间（24 小时）
 * @returns {Date}
 */
function getVerificationTokenExpiry() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  decodeToken,
  getRefreshTokenExpiry,
  generateVerificationToken,
  getVerificationTokenExpiry
};

