const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * 用户模型
 * 支持邮箱和用户名双登录方式
 * 包含邮箱验证功能
 */
const userSchema = new mongoose.Schema({
  // 邮箱（登录凭证 1）
  email: {
    type: String,
    required: [true, '邮箱不能为空'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, '邮箱格式不正确']
  },
  
  // 用户名（登录凭证 2）
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少 3 个字符'],
    maxlength: [20, '用户名最多 20 个字符'],
    match: [/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线']
  },
  
  // 密码哈希
  passwordHash: {
    type: String,
    required: [true, '密码不能为空']
  },
  
  // 邮箱是否已验证
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // 邮箱验证令牌
  verificationToken: {
    type: String,
    sparse: true // 稀疏索引，允许多个 null 值
  },
  
  // 验证令牌过期时间
  verificationTokenExpires: {
    type: Date
  },
  
  // Refresh Token 列表（支持多设备登录）
  refreshTokens: [{
    token: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    }
  }],
  
  // 预留字段：用户基本信息
  profile: {
    type: Map,
    of: String,
    default: {}
  }
}, {
  timestamps: true // 自动添加 createdAt 和 updatedAt
});

// 索引
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ verificationToken: 1 }, { sparse: true });

/**
 * 实例方法：验证密码
 * @param {string} password - 明文密码
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.passwordHash);
};

/**
 * 实例方法：添加 Refresh Token
 * @param {string} token - Refresh Token
 * @param {Date} expiresAt - 过期时间
 */
userSchema.methods.addRefreshToken = function(token, expiresAt) {
  this.refreshTokens.push({ token, expiresAt });
};

/**
 * 实例方法：移除 Refresh Token
 * @param {string} token - 要移除的 Refresh Token
 */
userSchema.methods.removeRefreshToken = function(token) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
};

/**
 * 实例方法：清理过期的 Refresh Tokens
 */
userSchema.methods.cleanExpiredTokens = function() {
  const now = new Date();
  this.refreshTokens = this.refreshTokens.filter(rt => rt.expiresAt > now);
};

/**
 * 静态方法：创建用户（自动加密密码）
 * @param {Object} userData - 用户数据
 * @returns {Promise<User>}
 */
userSchema.statics.createUser = async function(userData) {
  const { email, username, password } = userData;
  
  // 加密密码
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  
  // 创建用户
  const user = new this({
    email,
    username,
    passwordHash
  });
  
  return await user.save();
};

/**
 * 静态方法：根据账号查找用户（支持邮箱或用户名）
 * @param {string} account - 邮箱或用户名
 * @returns {Promise<User|null>}
 */
userSchema.statics.findByAccount = async function(account) {
  return await this.findOne({
    $or: [
      { email: account.toLowerCase() },
      { username: account }
    ]
  });
};

// 导出模型
const User = mongoose.model('User', userSchema);

module.exports = User;

