import { Document, Model } from 'mongoose';
import { Request } from 'express';

// ==================== 用户相关 ====================

export interface IUser extends Document {
  _id: any;
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

export interface IUserModel extends Model<IUser> {
  createUser(userData: { 
    email: string; 
    username: string; 
    password: string 
  }): Promise<IUser>;
  findByAccount(account: string): Promise<IUser | null>;
}

export interface IRefreshToken {
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

// ==================== JWT 相关 ====================

export interface IJwtPayload {
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

// 扩展 Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        username: string;
      };
    }
  }
}

// ==================== API 请求/响应 ====================

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  account: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ResendVerificationRequest {
  email: string;
}

// ==================== 配置相关 ====================

export interface JwtConfig {
  algorithm: 'RS256';
  privateKey: string;
  publicKey: string;
  accessTokenExpire: string;
  refreshTokenExpire: string;
  issuer: string;
  audience: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface DatabaseConfig {
  uri: string;
  options: {
    maxPoolSize: number;
    minPoolSize: number;
    socketTimeoutMS: number;
    serverSelectionTimeoutMS: number;
  };
}

export interface ServerConfig {
  port: number;
  env: string;
}

export interface CorsConfig {
  origins: string[];
  credentials: boolean;
}

export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  email: EmailConfig;
  cors: CorsConfig;
  connectDB: () => Promise<void>;
}