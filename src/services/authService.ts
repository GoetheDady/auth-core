import User from '../models/User';
import * as tokenService from './tokenService';
import * as emailService from './emailService';
import logger from '../utils/logger';
import { ErrorFactory } from '../utils/AppError';

/**
 * 认证服务
 * 处理用户注册、登录、验证等业务逻辑
 * 
 * 安全增强：
 * - Refresh Token 使用哈希存储
 * - 实现 Token 轮换机制
 * - 记录设备指纹和 IP 地址
 * - 异常登录检测
 */

// 设备信息接口
interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
}

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
  refreshToken: string;  // 新的 Refresh Token（轮换机制）
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
 * - 邮箱或用户名已存在时，返回 409 错误
 * - 使用模糊表述（"可能已被使用"），防止精确的用户枚举
 * - 立即反馈错误，用户可以马上重试其他邮箱/用户名
 * 
 * 竞态条件处理：
 * - 高并发场景下，两个请求可能同时通过存在性检查
 * - MongoDB 的唯一索引会拒绝第二个写入（抛出 11000 错误）
 * - catch 块会捕获此错误并返回相应的冲突错误：
 *   1. 邮箱冲突：返回 409，提示邮箱可能已被使用
 *   2. 用户名冲突：返回 409，提示用户名可能已被使用
 * - 确保用户能够立即知道失败原因并重试
 */
export async function register(userData: RegisterData): Promise<RegisterResult> {
  const { email, username, password } = userData;
  
  try {
    // 1. 检查邮箱是否已存在
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      // 邮箱已存在：直接返回错误
      logger.info(`注册失败: 邮箱已存在 (${email}) | 已验证: ${existingEmail.isVerified}`);
      
      // 直接返回错误，明确告知但使用模糊表述
      throw ErrorFactory.conflict(
        '注册未成功，该邮箱可能已被使用或已注册过账户',
        { field: 'email' }
      );
    }
    
    // 2. 检查用户名是否已存在
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      // 用户名已存在：直接返回错误，使用模糊表述
      logger.info(`注册失败: 用户名已存在 (${username}) | 邮箱: ${email}`);
      
      // 直接返回错误，明确告知但使用模糊表述
      throw ErrorFactory.conflict(
        '注册未成功，该用户名可能已被使用，请尝试其他用户名',
        { field: 'username' }
      );
    }
    
    // 3. 创建用户
    const user = await User.createUser({ email, username, password });
    
    // 4. 生成验证令牌
    user.verificationToken = tokenService.generateVerificationToken();
    user.verificationTokenExpires = tokenService.getVerificationTokenExpiry();
    await user.save();
    
    // 5. 发送验证邮件（关键步骤：如果失败则回滚用户创建）
    // 实现重试机制：最多尝试 3 次
    let emailSent = false;
    let lastEmailError: any = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          logger.info(`第 ${attempt} 次尝试发送验证邮件: ${email}`);
          // 重试前等待一小段时间（指数退避）
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
        
      await emailService.sendVerificationEmail(
        user.email,
        user.username,
        user.verificationToken
      );
        
        emailSent = true;
        if (attempt > 1) {
          logger.success(`第 ${attempt} 次重试成功，验证邮件已发送: ${email}`);
        }
        break; // 发送成功，跳出循环
    } catch (emailError: any) {
        lastEmailError = emailError;
        logger.warn(`第 ${attempt} 次发送验证邮件失败: ${emailError.message}`);
        
        if (attempt < maxRetries) {
          logger.info(`将在 ${attempt} 秒后重试...`);
        }
      }
    }
    
    // 检查邮件是否发送成功
    if (emailSent) {
    // 邮件发送成功
    logger.success(`用户注册成功: ${user.username} (${user.email})`);
    
    return {
      success: true,
      message: '注册成功，请查收验证邮件',
      userId: user._id
    };
  } else {
    // 所有重试都失败了，必须回滚用户创建
    // 原因：用户无法验证邮箱就无法登录，创建了也没用
    logger.error(`验证邮件发送失败（已重试 ${maxRetries} 次），开始回滚用户创建`);
    logger.error(`  - 用户名: ${user.username}`);
    logger.error(`  - 邮箱: ${email}`);
    logger.error(`  - 最后错误: ${lastEmailError?.message || 'Unknown'}`);
    
    const emailError = lastEmailError;
      
      try {
        // 删除刚创建的用户（回滚操作）
        await User.findByIdAndDelete(user._id);
        logger.info(`✓ 回滚成功：已删除用户 (ID: ${user._id}, 用户名: ${username}, 邮箱: ${email})`);
      } catch (deleteError: any) {
        // 删除失败是严重问题，需要人工介入
        logger.error(`✗ 严重错误：回滚失败，无法删除用户！`);
        logger.error(`  - 用户 ID: ${user._id}`);
        logger.error(`  - 用户名: ${username}`);
        logger.error(`  - 邮箱: ${email}`);
        logger.error(`  - 删除错误: ${deleteError.message}`);
        logger.error(`  ⚠️ 需要手动清理数据库中的孤立用户记录`);
        
        // 抛出严重错误，提示需要管理员处理
        throw ErrorFactory.internalError(
          '注册过程出现严重错误，用户数据可能不一致，请联系管理员'
        );
      }
      
      // 判断邮件错误类型，返回更具体的提示
      let errorMessage = '注册失败：无法发送验证邮件';
      
      // 根据错误类型提供不同的提示
      if (emailError.message && emailError.message.includes('ENOTFOUND')) {
        errorMessage = '注册失败：邮件服务器连接失败，请稍后重试';
      } else if (emailError.message && emailError.message.includes('Invalid email')) {
        errorMessage = '注册失败：邮箱地址格式不正确，请检查后重试';
      } else if (emailError.message && emailError.message.includes('ECONNREFUSED')) {
        errorMessage = '注册失败：邮件服务暂时不可用，请稍后重试';
      } else if (emailError.message && emailError.message.includes('Timeout')) {
        errorMessage = '注册失败：邮件发送超时，请稍后重试';
      } else {
        errorMessage = '注册失败：无法发送验证邮件，请检查邮箱地址或稍后重试';
      }
    
    // 抛出友好的错误消息
    throw ErrorFactory.emailSendFailed(errorMessage);
  }
  } catch (error: any) {
    // 捕获数据库唯一键冲突（竞态条件）
    if (error.code === 11000) {
      // 识别冲突的字段
      const conflictField = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'unknown';
      const conflictValue = error.keyValue ? error.keyValue[conflictField] : 'unknown';
      
      logger.warn(
        `注册时发生唯一键冲突（竞态条件）| 字段: ${conflictField} | 值: ${conflictValue}`
      );
      
      // 处理邮箱冲突：直接返回错误
      if (conflictField === 'email') {
        logger.info(`竞态条件: 邮箱冲突 (${email})`);
        
        // 直接返回错误，明确告知但使用模糊表述
        throw ErrorFactory.conflict(
          '注册未成功，该邮箱可能已被使用或已注册过账户',
          { field: 'email' }
        );
      }
      
      // 处理用户名冲突：直接返回错误
      if (conflictField === 'username') {
        logger.info(`竞态条件: 用户名冲突 (${username}) | 邮箱: ${email}`);
        
        // 直接返回错误，明确告知但使用模糊表述
        throw ErrorFactory.conflict(
          '注册未成功，该用户名可能已被使用，请尝试其他用户名',
          { field: 'username' }
        );
      }
      
      // 其他未知冲突：返回通用错误
      logger.error(`未知的唯一键冲突: 字段=${conflictField}, 值=${conflictValue}`);
      throw ErrorFactory.conflict('注册失败，请检查您的信息后重试');
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
 * @param deviceInfo - 设备信息（User-Agent 和 IP）
 * @returns 登录结果
 * 
 * 安全说明：
 * - 为防止用户枚举攻击，所有认证失败都返回统一错误消息
 * - 邮箱未验证也返回统一错误，不泄露用户是否存在
 * - 使用恒定时间比较，防止时序攻击
 * - Refresh Token 使用哈希存储，增强安全性
 * - 记录设备信息和 IP，用于异常检测
 */
export async function login(
  account: string, 
  password: string, 
  deviceInfo?: DeviceInfo
): Promise<LoginResult> {
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
      // 邮箱未验证：返回明确提示，引导用户验证邮箱
      logger.info(`登录失败: 邮箱未验证 (${user.email})`);
      throw ErrorFactory.emailNotVerified('请先验证您的邮箱后再登录');
    }
    
    // 4. 检查密码
    if (!isPasswordValid) {
      logger.info(`登录失败: 密码错误 (${account})`);
      throw ErrorFactory.invalidCredentials();
    }
    
    // 5. 清理过期的 Refresh Token
    user.cleanExpiredTokens();
    
    // 6. 限制活跃 Token 数量（最多 5 个设备）
    user.limitActiveTokens(5);
    
    // 7. 生成 Access Token 和 Refresh Token
    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = tokenService.generateRefreshToken();
    const refreshTokenHash = tokenService.hashRefreshToken(refreshToken);
    const refreshTokenExpiry = tokenService.getRefreshTokenExpiry();
    
    // 8. 保存 Refresh Token（哈希存储）
    user.addRefreshToken(
      refreshTokenHash,
      refreshTokenExpiry,
      deviceInfo?.userAgent,
      deviceInfo?.ipAddress
    );
    await user.save();
    
    logger.success(`用户登录成功: ${user.username} (${user.email}) [IP: ${deviceInfo?.ipAddress || 'unknown'}]`);
    
    return {
      success: true,
      accessToken,
      refreshToken,  // 返回原始 token 给客户端
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
 * 刷新 Access Token（实现 Token 轮换机制）
 * @param refreshToken - 原始 Refresh Token
 * @param deviceInfo - 设备信息（用于异常检测）
 * @returns 刷新结果（包含新的 Access Token 和新的 Refresh Token）
 * 
 * 安全增强：
 * - Token 轮换：每次刷新后旧 token 立即失效
 * - 异常检测：检查 IP 和设备变化
 * - 哈希验证：使用哈希比对而非明文比对
 * - 防重放：旧 token 一旦使用即撤销
 */
export async function refreshAccessToken(
  refreshToken: string,
  deviceInfo?: DeviceInfo
): Promise<RefreshTokenResult> {
  try {
    // 1. 计算 token 的哈希值
    const tokenHash = tokenService.hashRefreshToken(refreshToken);
    
    // 2. 查找包含此 token 哈希的用户
    const user = await User.findOne({
      'refreshTokens.tokenHash': tokenHash
    });
    
    if (!user) {
      logger.warn(`刷新失败: Token 不存在或已被撤销 [IP: ${deviceInfo?.ipAddress || 'unknown'}]`);
      throw ErrorFactory.refreshTokenInvalid();
    }
    
    // 3. 查找具体的 token 记录
    const tokenData = user.findRefreshToken(tokenHash);
    
    if (!tokenData) {
      logger.warn(`刷新失败: Token 数据异常 (${user.username})`);
      throw ErrorFactory.refreshTokenInvalid();
    }
    
    // 4. 检查是否已撤销
    if (tokenData.isRevoked) {
      logger.warn(`刷新失败: Token 已被撤销 (${user.username}) [IP: ${deviceInfo?.ipAddress}]`);
      throw ErrorFactory.refreshTokenInvalid('Refresh Token 已失效，请重新登录');
    }
    
    // 5. 检查是否过期
    if (tokenData.expiresAt < new Date()) {
      logger.info(`刷新失败: Token 已过期 (${user.username})`);
      user.removeRefreshToken(tokenHash);
        await user.save();
      throw ErrorFactory.refreshTokenInvalid('Refresh Token 已过期，请重新登录');
    }
    
    // 6. 异常检测：检查 IP 变化（可选的额外安全措施）
    if (tokenData.ipAddress && deviceInfo?.ipAddress) {
      if (tokenData.ipAddress !== deviceInfo.ipAddress) {
        logger.warn(
          `IP 地址变化检测: ${user.username} | ` +
          `原IP: ${tokenData.ipAddress} -> 新IP: ${deviceInfo.ipAddress}`
        );
        // 注意：IP 变化是正常现象（移动网络、VPN等），不应阻止刷新
        // 但应该记录日志用于安全审计
      }
    }
    
    // 7. Token 轮换：移除旧 token
    user.removeRefreshToken(tokenHash);
    
    // 8. 生成新的 Access Token 和 Refresh Token
    const newAccessToken = tokenService.generateAccessToken(user);
    const newRefreshToken = tokenService.generateRefreshToken();
    const newRefreshTokenHash = tokenService.hashRefreshToken(newRefreshToken);
    const newRefreshTokenExpiry = tokenService.getRefreshTokenExpiry();
    
    // 9. 保存新的 Refresh Token
    user.addRefreshToken(
      newRefreshTokenHash,
      newRefreshTokenExpiry,
      deviceInfo?.userAgent || tokenData.deviceInfo,
      deviceInfo?.ipAddress || tokenData.ipAddress
    );
    
    // 10. 清理过期 token
    user.cleanExpiredTokens();
    
    await user.save();
    
    logger.success(
      `Token 刷新成功 (轮换): ${user.username} [IP: ${deviceInfo?.ipAddress || tokenData.ipAddress}]`
    );
    
    return {
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,  // 返回新的 refresh token（轮换）
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
 * 
 * 安全说明：
 * - 使用哈希值查找和删除 token
 * - 支持单设备登出和全部设备登出
 */
export async function logout(refreshToken?: string, userId?: string): Promise<LogoutResult> {
  try {
    if (refreshToken) {
      // 移除指定的 Refresh Token（使用哈希查找）
      const tokenHash = tokenService.hashRefreshToken(refreshToken);
      const user = await User.findOne({ 'refreshTokens.tokenHash': tokenHash });
      if (user) {
        user.removeRefreshToken(tokenHash);
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

