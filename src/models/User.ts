import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * 用户模型
 * 支持邮箱和用户名双登录方式
 * 包含邮箱验证功能
 */

// Refresh Token 接口
interface IRefreshToken {
  token: string;
  createdAt: Date;
  expiresAt: Date;
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
  addRefreshToken(token: string, expiresAt: Date): void;
  removeRefreshToken(token: string): void;
  cleanExpiredTokens(): void;
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
    default: new Map()
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
 * @param password - 明文密码
 * @returns 是否匹配
 */
userSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.passwordHash);
};

/**
 * 实例方法：添加 Refresh Token
 * @param token - Refresh Token
 * @param expiresAt - 过期时间
 */
userSchema.methods.addRefreshToken = function(token: string, expiresAt: Date): void {
  this.refreshTokens.push({ token, expiresAt, createdAt: new Date() });
};

/**
 * 实例方法：移除 Refresh Token
 * @param token - 要移除的 Refresh Token
 */
userSchema.methods.removeRefreshToken = function(token: string): void {
  this.refreshTokens = this.refreshTokens.filter((rt: IRefreshToken) => rt.token !== token);
};

/**
 * 实例方法：清理过期的 Refresh Tokens
 */
userSchema.methods.cleanExpiredTokens = function(): void {
  const now = new Date();
  this.refreshTokens = this.refreshTokens.filter((rt: IRefreshToken) => rt.expiresAt > now);
};

/**
 * 静态方法：创建用户（自动加密密码）
 * @param userData - 用户数据
 * @returns 用户实例
 */
userSchema.statics.createUser = async function(
  userData: { email: string; username: string; password: string }
): Promise<IUser> {
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

