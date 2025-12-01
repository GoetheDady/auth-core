const User = require('../models/User');
const tokenService = require('./tokenService');
const emailService = require('./emailService');
const logger = require('../utils/logger');

/**
 * 认证服务
 * 处理用户注册、登录、验证等业务逻辑
 */

/**
 * 用户注册
 * @param {Object} userData - { email, username, password }
 * @returns {Promise<Object>}
 */
async function register(userData) {
  const { email, username, password } = userData;
  
  try {
    // 1. 检查邮箱是否已存在
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      throw new Error('该邮箱已被注册');
    }
    
    // 2. 检查用户名是否已存在
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      throw new Error('该用户名已被使用');
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
    } catch (emailError) {
      logger.error('发送验证邮件失败，但用户已创建:', emailError.message);
      // 即使邮件发送失败，也不影响注册成功
    }
    
    logger.success(`用户注册成功: ${user.username} (${user.email})`);
    
    return {
      success: true,
      message: '注册成功，请查收验证邮件',
      userId: user._id
    };
  } catch (error) {
    logger.error('用户注册失败:', error.message);
    throw error;
  }
}

/**
 * 验证邮箱
 * @param {string} token - 验证令牌
 * @returns {Promise<Object>}
 */
async function verifyEmail(token) {
  try {
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() }
    });
    
    if (!user) {
      throw new Error('验证令牌无效或已过期');
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
  } catch (error) {
    logger.error('邮箱验证失败:', error.message);
    throw error;
  }
}

/**
 * 重新发送验证邮件
 * @param {string} email - 邮箱地址
 * @returns {Promise<Object>}
 */
async function resendVerificationEmail(email) {
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      throw new Error('该邮箱未注册');
    }
    
    if (user.isVerified) {
      throw new Error('该邮箱已经验证过了');
    }
    
    // 生成新的验证令牌
    user.verificationToken = tokenService.generateVerificationToken();
    user.verificationTokenExpires = tokenService.getVerificationTokenExpiry();
    await user.save();
    
    // 发送验证邮件
    await emailService.sendVerificationEmail(
      user.email,
      user.username,
      user.verificationToken
    );
    
    logger.success(`验证邮件已重新发送至: ${user.email}`);
    
    return {
      success: true,
      message: '验证邮件已重新发送'
    };
  } catch (error) {
    logger.error('重发验证邮件失败:', error.message);
    throw error;
  }
}

/**
 * 用户登录
 * @param {string} account - 账号（邮箱或用户名）
 * @param {string} password - 密码
 * @returns {Promise<Object>}
 */
async function login(account, password) {
  try {
    // 1. 查找用户
    const user = await User.findByAccount(account);
    if (!user) {
      throw new Error('账号或密码错误');
    }
    
    // 2. 检查邮箱是否已验证
    if (!user.isVerified) {
      throw new Error('请先验证邮箱后再登录');
    }
    
    // 3. 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('账号或密码错误');
    }
    
    // 4. 清理过期的 Refresh Token
    user.cleanExpiredTokens();
    
    // 5. 生成 Access Token 和 Refresh Token
    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = tokenService.generateRefreshToken();
    const refreshTokenExpiry = tokenService.getRefreshTokenExpiry();
    
    // 6. 保存 Refresh Token
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
  } catch (error) {
    logger.error('用户登录失败:', error.message);
    throw error;
  }
}

/**
 * 刷新 Access Token
 * @param {string} refreshToken - Refresh Token
 * @returns {Promise<Object>}
 */
async function refreshAccessToken(refreshToken) {
  try {
    // 1. 查找包含此 Refresh Token 的用户
    const user = await User.findOne({
      'refreshTokens.token': refreshToken
    });
    
    if (!user) {
      throw new Error('Refresh Token 无效');
    }
    
    // 2. 检查 Refresh Token 是否过期
    const tokenData = user.refreshTokens.find(rt => rt.token === refreshToken);
    if (!tokenData || tokenData.expiresAt < new Date()) {
      // 移除过期的 token
      if (tokenData) {
        user.removeRefreshToken(refreshToken);
        await user.save();
      }
      throw new Error('Refresh Token 已过期，请重新登录');
    }
    
    // 3. 生成新的 Access Token
    const accessToken = tokenService.generateAccessToken(user);
    
    logger.success(`Access Token 刷新成功: ${user.username}`);
    
    return {
      success: true,
      accessToken,
      expiresIn: 900
    };
  } catch (error) {
    logger.error('刷新 Token 失败:', error.message);
    throw error;
  }
}

/**
 * 用户登出
 * @param {string} refreshToken - Refresh Token（可选）
 * @param {string} userId - 用户 ID（可选）
 * @returns {Promise<Object>}
 */
async function logout(refreshToken, userId) {
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
  } catch (error) {
    logger.error('登出失败:', error.message);
    throw error;
  }
}

module.exports = {
  register,
  verifyEmail,
  resendVerificationEmail,
  login,
  refreshAccessToken,
  logout
};

