import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * 用户模型
 * 支持邮箱和用户名双登录方式
 * 包含邮箱验证功能
 */

// Refresh Token 接口（增强安全性）
interface IRefreshToken {
  tokenHash: string;        // Token 的 SHA-256 哈希值（安全存储）
  createdAt: Date;          // 创建时间
  expiresAt: Date;          // 过期时间
  lastUsedAt?: Date;        // 最后使用时间
  deviceInfo?: string;      // 设备信息（User-Agent）
  ipAddress?: string;       // IP 地址
  isRevoked?: boolean;      // 是否已撤销
}

// 用户文档接口
export interface IUser extends Document {
  email: string;
  username: string;
  passwordHash: string;
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  refreshTokens: IRefreshToken[];
  profile: Map<string, string>;
  createdAt: Date;
  updatedAt: Date;
  
  // 实例方法
  comparePassword(password: string): Promise<boolean>;
  addRefreshToken(tokenHash: string, expiresAt: Date, deviceInfo?: string, ipAddress?: string): void;
  removeRefreshToken(tokenHash: string): void;
  findRefreshToken(tokenHash: string): IRefreshToken | undefined;
  updateRefreshTokenUsage(tokenHash: string): void;
  cleanExpiredTokens(): void;
  limitActiveTokens(maxTokens: number): void;
}

// 用户模型接口（包含静态方法）
interface IUserModel extends Model<IUser> {
  createUser(userData: { email: string; username: string; password: string }): Promise<IUser>;
  findByAccount(account: string): Promise<IUser | null>;
}

const userSchema = new Schema<IUser, IUserModel>({
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
  
  // Refresh Token 列表（支持多设备登录，增强安全性）
  refreshTokens: [{
    tokenHash: {
      type: String,
      required: true,
      index: true  // 索引以提高查询性能
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    lastUsedAt: {
      type: Date
    },
    deviceInfo: {
      type: String
    },
    ipAddress: {
      type: String
    },
    isRevoked: {
      type: Boolean,
      default: false
    }
  }],
  
  // 预留字段：用户基本信息
  profile: {
    type: Map,
    of: String,
    default: new Map()
  }
}, {
  timestamps: true // 自动添加 createdAt 和 updatedAt
});

// 索引（防止重复和优化查询性能）
// unique: true 确保唯一性，防止重复数据
// sparse: true 允许多个文档该字段为 null
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ verificationToken: 1 }, { sparse: true });
userSchema.index({ 'refreshTokens.tokenHash': 1 });  // 优化 refresh token 查询

/**
 * 实例方法：验证密码
 * @param password - 明文密码
 * @returns 是否匹配
 */
userSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.passwordHash);
};

/**
 * 实例方法：添加 Refresh Token（哈希存储）
 * @param tokenHash - Refresh Token 的哈希值
 * @param expiresAt - 过期时间
 * @param deviceInfo - 设备信息（User-Agent）
 * @param ipAddress - IP 地址
 * 
 * 安全说明：
 * - 只存储 token 的哈希值，不存储原始 token
 * - 记录设备信息和 IP，用于异常检测
 */
userSchema.methods.addRefreshToken = function(
  tokenHash: string, 
  expiresAt: Date, 
  deviceInfo?: string, 
  ipAddress?: string
): void {
  this.refreshTokens.push({ 
    tokenHash, 
    expiresAt, 
    createdAt: new Date(),
    deviceInfo,
    ipAddress,
    isRevoked: false
  });
};

/**
 * 实例方法：移除 Refresh Token
 * @param tokenHash - 要移除的 Token 哈希值
 */
userSchema.methods.removeRefreshToken = function(tokenHash: string): void {
  this.refreshTokens = this.refreshTokens.filter((rt: IRefreshToken) => rt.tokenHash !== tokenHash);
};

/**
 * 实例方法：查找 Refresh Token
 * @param tokenHash - Token 哈希值
 * @returns Token 对象或 undefined
 */
userSchema.methods.findRefreshToken = function(tokenHash: string): IRefreshToken | undefined {
  return this.refreshTokens.find((rt: IRefreshToken) => rt.tokenHash === tokenHash);
};

/**
 * 实例方法：更新 Token 使用时间
 * @param tokenHash - Token 哈希值
 */
userSchema.methods.updateRefreshTokenUsage = function(tokenHash: string): void {
  const token = this.refreshTokens.find((rt: IRefreshToken) => rt.tokenHash === tokenHash);
  if (token) {
    token.lastUsedAt = new Date();
  }
};

/**
 * 实例方法：清理过期的 Refresh Tokens
 */
userSchema.methods.cleanExpiredTokens = function(): void {
  const now = new Date();
  this.refreshTokens = this.refreshTokens.filter((rt: IRefreshToken) => 
    rt.expiresAt > now && !rt.isRevoked
  );
};

/**
 * 实例方法：限制活跃 Token 数量
 * @param maxTokens - 最大允许的 Token 数量
 * 
 * 安全说明：
 * - 防止 Token 无限累积
 * - 当超过限制时，删除最旧的 Token
 * - 默认建议 5 个设备
 */
userSchema.methods.limitActiveTokens = function(maxTokens: number = 5): void {
  if (this.refreshTokens.length > maxTokens) {
    // 按创建时间排序，保留最新的 maxTokens 个
    this.refreshTokens.sort((a: IRefreshToken, b: IRefreshToken) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
    this.refreshTokens = this.refreshTokens.slice(0, maxTokens);
  }
};

/**
 * 静态方法：创建用户（自动加密密码）
 * @param userData - 用户数据
 * @returns 用户实例
 * 
 * 注意：
 * - 如果邮箱或用户名已存在，会抛出 MongoError (code: 11000)
 * - 调用方需要处理唯一键冲突异常
 * - 密码使用 bcrypt 加密（saltRounds: 10）
 */
userSchema.statics.createUser = async function(
  userData: { email: string; username: string; password: string }
): Promise<IUser> {
  const { email, username, password } = userData;
  
  // 加密密码（bcrypt 自带盐值生成）
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  
  // 创建用户文档
  const user = new this({
    email: email.toLowerCase(),  // 确保邮箱小写
    username,
    passwordHash
  });
  
  // 保存到数据库（可能抛出 11000 唯一键冲突错误）
  return await user.save();
};

/**
 * 静态方法：根据账号查找用户（支持邮箱或用户名）
 * @param account - 邮箱或用户名
 * @returns 用户实例或 null
 */
userSchema.statics.findByAccount = async function(account: string): Promise<IUser | null> {
  return await this.findOne({
    $or: [
      { email: account.toLowerCase() },
      { username: account }
    ]
  });
};

// 导出模型
const User = mongoose.model<IUser, IUserModel>('User', userSchema);

export default User;

