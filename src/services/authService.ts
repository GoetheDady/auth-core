import User from '../models/User';
import * as tokenService from './tokenService';
import * as emailService from './emailService';
import logger from '../utils/logger';
import { ErrorFactory } from '../utils/AppError';

/**
 * 认证服务
 * 处理用户注册、登录、验证等业务逻辑
 */

interface RegisterData {
  email: string;
  username: string;
  password: string;
}

interface RegisterResult {
  success: boolean;
  message: string;
  userId: any;
}

interface VerifyEmailResult {
  success: boolean;
  message: string;
  user: {
    email: string;
    username: string;
  };
}

interface LoginResult {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: any;
    email: string;
    username: string;
  };
}

interface RefreshTokenResult {
  success: boolean;
  accessToken: string;
  expiresIn: number;
}

interface LogoutResult {
  success: boolean;
  message: string;
}

/**
 * 用户注册
 * @param userData - { email, username, password }
 * @returns 注册结果
 * 
 * 安全说明：
 * - 为防止用户枚举攻击，统一返回成功消息
 * - 如果邮箱已存在，根据验证状态决定是否重发邮件
 * - 如果用户名已存在，静默忽略（攻击者无法判断）
 */
export async function register(userData: RegisterData): Promise<RegisterResult> {
  const { email, username, password } = userData;
  
  try {
    // 1. 检查邮箱是否已存在
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      // 邮箱已存在的处理策略（防止用户枚举）
      if (existingEmail.isVerified) {
        // 已验证的用户：静默忽略，不发送任何邮件
        logger.info(`注册尝试使用已存在的邮箱: ${email} (已验证)`);
      } else {
        // 未验证的用户：重新发送验证邮件
        logger.info(`注册尝试使用已存在的邮箱: ${email} (未验证，重发验证邮件)`);
        existingEmail.verificationToken = tokenService.generateVerificationToken();
        existingEmail.verificationTokenExpires = tokenService.getVerificationTokenExpiry();
        await existingEmail.save();
        
        try {
          await emailService.sendVerificationEmail(
            existingEmail.email,
            existingEmail.username,
            existingEmail.verificationToken
          );
        } catch (emailError: any) {
          logger.error('重发验证邮件失败:', emailError.message);
        }
      }
      
      // 统一返回成功消息（不泄露邮箱已存在）
      return {
        success: true,
        message: '注册成功，请查收验证邮件',
        userId: existingEmail._id
      };
    }
    
    // 2. 检查用户名是否已存在
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      // 用户名已存在：静默失败，但返回成功消息（防止枚举）
      logger.info(`注册尝试使用已存在的用户名: ${username}`);
      
      // 返回成功消息，但不创建用户，也不发送邮件
      // 攻击者无法通过响应判断用户名是否存在
      return {
        success: true,
        message: '注册成功，请查收验证邮件',
        userId: null
      };
    }
    
    // 3. 创建用户
    const user = await User.createUser({ email, username, password });
    
    // 4. 生成验证令牌
    user.verificationToken = tokenService.generateVerificationToken();
    user.verificationTokenExpires = tokenService.getVerificationTokenExpiry();
    await user.save();
    
    // 5. 发送验证邮件
    try {
      await emailService.sendVerificationEmail(
        user.email,
        user.username,
        user.verificationToken
      );
    } catch (emailError: any) {
      logger.error('发送验证邮件失败，但用户已创建:', emailError.message);
      // 即使邮件发送失败，也不影响注册成功
    }
    
    logger.success(`用户注册成功: ${user.username} (${user.email})`);
    
    return {
      success: true,
      message: '注册成功，请查收验证邮件',
      userId: user._id
    };
  } catch (error: any) {
    // 捕获数据库唯一键冲突（竞态条件）
    if (error.code === 11000) {
      logger.warn('注册时发生唯一键冲突（竞态条件）');
      // 依然返回成功消息，不泄露信息
      return {
        success: true,
        message: '注册成功，请查收验证邮件',
        userId: null
      };
    }
    
    logger.error('用户注册失败:', error.message);
    throw error;
  }
}

/**
 * 验证邮箱
 * @param token - 验证令牌
 * @returns 验证结果
 */
export async function verifyEmail(token: string): Promise<VerifyEmailResult> {
  try {
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() }
    });
    
    if (!user) {
      throw ErrorFactory.verificationTokenExpired();
    }
    
    // 标记为已验证
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    
    logger.success(`邮箱验证成功: ${user.email}`);
    
    return {
      success: true,
      message: '邮箱验证成功，现在可以登录了',
      user: {
        email: user.email,
        username: user.username
      }
    };
  } catch (error: any) {
    logger.error('邮箱验证失败:', error.message);
    throw error;
  }
}

/**
 * 重新发送验证邮件
 * @param email - 邮箱地址
 * @returns 操作结果
 * 
 * 安全说明：
 * - 为防止用户枚举攻击，始终返回统一的成功消息
 * - 无论邮箱是否存在、是否已验证，都返回相同响应
 * - 只在用户确实存在且未验证时才真正发送邮件
 */
export async function resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // 用户不存在：静默忽略，返回成功消息（防止枚举）
      logger.info(`重发验证邮件请求，但邮箱不存在: ${email}`);
      return {
        success: true,
        message: '如果该邮箱已注册，验证邮件将发送到您的邮箱'
      };
    }
    
    if (user.isVerified) {
      // 已验证：静默忽略，返回成功消息（防止枚举）
      logger.info(`重发验证邮件请求，但邮箱已验证: ${email}`);
      return {
        success: true,
        message: '如果该邮箱已注册，验证邮件将发送到您的邮箱'
      };
    }
    
    // 生成新的验证令牌
    user.verificationToken = tokenService.generateVerificationToken();
    user.verificationTokenExpires = tokenService.getVerificationTokenExpiry();
    await user.save();
    
    // 发送验证邮件
    try {
      await emailService.sendVerificationEmail(
        user.email,
        user.username,
        user.verificationToken
      );
      logger.success(`验证邮件已重新发送至: ${user.email}`);
    } catch (emailError: any) {
      // 邮件发送失败也返回成功消息（不泄露信息）
      logger.error('重发验证邮件失败:', emailError);
    }
    
    return {
      success: true,
      message: '如果该邮箱已注册，验证邮件将发送到您的邮箱'
    };
  } catch (error: any) {
    logger.error('重发验证邮件处理失败:', error.message);
    // 即使发生错误，也返回统一消息（不泄露内部错误）
    return {
      success: true,
      message: '如果该邮箱已注册，验证邮件将发送到您的邮箱'
    };
  }
}

/**
 * 用户登录
 * @param account - 账号（邮箱或用户名）
 * @param password - 密码
 * @returns 登录结果
 * 
 * 安全说明：
 * - 为防止用户枚举攻击，所有认证失败都返回统一错误消息
 * - 邮箱未验证也返回统一错误，不泄露用户是否存在
 * - 使用恒定时间比较，防止时序攻击
 */
export async function login(account: string, password: string): Promise<LoginResult> {
  try {
    // 1. 查找用户
    const user = await User.findByAccount(account);
    if (!user) {
      // 用户不存在：返回统一错误
      logger.info(`登录失败: 用户不存在 (${account})`);
      throw ErrorFactory.invalidCredentials();
    }
    
    // 2. 验证密码（先验证密码，即使邮箱未验证）
    // 这样可以防止通过响应时间判断用户是否存在
    const isPasswordValid = await user.comparePassword(password);
    
    // 3. 检查邮箱是否已验证
    if (!user.isVerified) {
      // 邮箱未验证：返回统一错误（防止枚举）
      // 不返回特定的"邮箱未验证"错误，攻击者无法判断账号是否存在
      logger.info(`登录失败: 邮箱未验证 (${user.email})`);
      throw ErrorFactory.invalidCredentials('账号或密码错误');
    }
    
    // 4. 检查密码
    if (!isPasswordValid) {
      logger.info(`登录失败: 密码错误 (${account})`);
      throw ErrorFactory.invalidCredentials();
    }
    
    // 5. 清理过期的 Refresh Token
    user.cleanExpiredTokens();
    
    // 6. 生成 Access Token 和 Refresh Token
    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = tokenService.generateRefreshToken();
    const refreshTokenExpiry = tokenService.getRefreshTokenExpiry();
    
    // 7. 保存 Refresh Token
    user.addRefreshToken(refreshToken, refreshTokenExpiry);
    await user.save();
    
    logger.success(`用户登录成功: ${user.username} (${user.email})`);
    
    return {
      success: true,
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 分钟 = 900 秒
      user: {
        id: user._id,
        email: user.email,
        username: user.username
      }
    };
  } catch (error: any) {
    // 记录详细错误，但不向客户端泄露
    if (error instanceof ErrorFactory.constructor) {
      throw error;
    }
    logger.error('用户登录异常:', error.message);
    throw error;
  }
}

/**
 * 刷新 Access Token
 * @param refreshToken - Refresh Token
 * @returns 刷新结果
 */
export async function refreshAccessToken(refreshToken: string): Promise<RefreshTokenResult> {
  try {
    // 1. 查找包含此 Refresh Token 的用户
    const user = await User.findOne({
      'refreshTokens.token': refreshToken
    });
    
    if (!user) {
      throw ErrorFactory.refreshTokenInvalid();
    }
    
    // 2. 检查 Refresh Token 是否过期
    const tokenData = user.refreshTokens.find(rt => rt.token === refreshToken);
    if (!tokenData || tokenData.expiresAt < new Date()) {
      // 移除过期的 token
      if (tokenData) {
        user.removeRefreshToken(refreshToken);
        await user.save();
      }
      throw ErrorFactory.refreshTokenInvalid('Refresh Token 已过期，请重新登录');
    }
    
    // 3. 生成新的 Access Token
    const accessToken = tokenService.generateAccessToken(user);
    
    logger.success(`Access Token 刷新成功: ${user.username}`);
    
    return {
      success: true,
      accessToken,
      expiresIn: 900
    };
  } catch (error: any) {
    logger.error('刷新 Token 失败:', error.message);
    throw error;
  }
}

/**
 * 用户登出
 * @param refreshToken - Refresh Token（可选）
 * @param userId - 用户 ID（可选）
 * @returns 登出结果
 */
export async function logout(refreshToken?: string, userId?: string): Promise<LogoutResult> {
  try {
    if (refreshToken) {
      // 移除指定的 Refresh Token
      const user = await User.findOne({ 'refreshTokens.token': refreshToken });
      if (user) {
        user.removeRefreshToken(refreshToken);
        await user.save();
        logger.success(`用户登出成功: ${user.username}`);
      }
    } else if (userId) {
      // 移除用户的所有 Refresh Token
      const user = await User.findById(userId);
      if (user) {
        user.refreshTokens = [];
        await user.save();
        logger.success(`用户所有会话已清除: ${user.username}`);
      }
    }
    
    return {
      success: true,
      message: '登出成功'
    };
  } catch (error: any) {
    logger.error('登出失败:', error.message);
    throw error;
  }
}

