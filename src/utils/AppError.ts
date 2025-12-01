/**
 * 自定义应用错误类
 * 提供统一的错误处理和错误码管理
 */

export enum ErrorCode {
  // 通用错误 (1000-1999)
  INTERNAL_ERROR = 1000,
  VALIDATION_ERROR = 1001,
  NOT_FOUND = 1002,
  UNAUTHORIZED = 1003,
  FORBIDDEN = 1004,
  CONFLICT = 1005,
  BAD_REQUEST = 1006,
  TOO_MANY_REQUESTS = 1007,

  // 认证相关错误 (2000-2999)
  INVALID_CREDENTIALS = 2000,
  EMAIL_NOT_VERIFIED = 2001,
  EMAIL_ALREADY_EXISTS = 2002,
  USERNAME_ALREADY_EXISTS = 2003,
  USER_NOT_FOUND = 2004,
  INVALID_TOKEN = 2005,
  TOKEN_EXPIRED = 2006,
  REFRESH_TOKEN_INVALID = 2007,
  VERIFICATION_TOKEN_INVALID = 2008,
  VERIFICATION_TOKEN_EXPIRED = 2009,

  // 邮件相关错误 (3000-3999)
  EMAIL_SEND_FAILED = 3000,
  EMAIL_CONFIG_ERROR = 3001,

  // 数据库相关错误 (4000-4999)
  DATABASE_ERROR = 4000,
  DUPLICATE_KEY = 4001,
}

export interface ErrorDetails {
  field?: string;
  value?: any;
  constraint?: string;
  [key: string]: any;
}

/**
 * 应用错误类
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: ErrorDetails | ErrorDetails[];
  public readonly timestamp: string;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: ErrorCode = ErrorCode.INTERNAL_ERROR,
    isOperational: boolean = true,
    details?: ErrorDetails | ErrorDetails[]
  ) {
    super(message);
    
    Object.setPrototypeOf(this, AppError.prototype);
    
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 预定义的错误工厂函数
 */
export class ErrorFactory {
  // 通用错误
  static badRequest(message: string, details?: ErrorDetails | ErrorDetails[]): AppError {
    return new AppError(message, 400, ErrorCode.BAD_REQUEST, true, details);
  }

  static unauthorized(message: string = '未授权访问'): AppError {
    return new AppError(message, 401, ErrorCode.UNAUTHORIZED);
  }

  static forbidden(message: string = '禁止访问'): AppError {
    return new AppError(message, 403, ErrorCode.FORBIDDEN);
  }

  static notFound(message: string = '资源不存在'): AppError {
    return new AppError(message, 404, ErrorCode.NOT_FOUND);
  }

  static conflict(message: string, details?: ErrorDetails | ErrorDetails[]): AppError {
    return new AppError(message, 409, ErrorCode.CONFLICT, true, details);
  }

  static tooManyRequests(message: string = '请求过于频繁'): AppError {
    return new AppError(message, 429, ErrorCode.TOO_MANY_REQUESTS);
  }

  static internalError(message: string = '服务器内部错误'): AppError {
    return new AppError(message, 500, ErrorCode.INTERNAL_ERROR, false);
  }

  // 认证相关错误
  static invalidCredentials(message: string = '账号或密码错误'): AppError {
    return new AppError(message, 401, ErrorCode.INVALID_CREDENTIALS);
  }

  static emailNotVerified(message: string = '邮箱未验证，请先验证邮箱'): AppError {
    return new AppError(message, 403, ErrorCode.EMAIL_NOT_VERIFIED);
  }

  static emailAlreadyExists(email: string): AppError {
    return new AppError(
      '邮箱已被注册',
      409,
      ErrorCode.EMAIL_ALREADY_EXISTS,
      true,
      { field: 'email', value: email }
    );
  }

  static usernameAlreadyExists(username: string): AppError {
    return new AppError(
      '用户名已被使用',
      409,
      ErrorCode.USERNAME_ALREADY_EXISTS,
      true,
      { field: 'username', value: username }
    );
  }

  static userNotFound(message: string = '用户不存在'): AppError {
    return new AppError(message, 404, ErrorCode.USER_NOT_FOUND);
  }

  static invalidToken(message: string = 'Token 无效'): AppError {
    return new AppError(message, 401, ErrorCode.INVALID_TOKEN);
  }

  static tokenExpired(message: string = 'Token 已过期'): AppError {
    return new AppError(message, 401, ErrorCode.TOKEN_EXPIRED);
  }

  static refreshTokenInvalid(message: string = 'Refresh Token 无效或已过期'): AppError {
    return new AppError(message, 401, ErrorCode.REFRESH_TOKEN_INVALID);
  }

  static verificationTokenInvalid(message: string = '验证令牌无效'): AppError {
    return new AppError(message, 400, ErrorCode.VERIFICATION_TOKEN_INVALID);
  }

  static verificationTokenExpired(message: string = '验证令牌已过期，请重新发送验证邮件'): AppError {
    return new AppError(message, 400, ErrorCode.VERIFICATION_TOKEN_EXPIRED);
  }

  // 邮件相关错误
  static emailSendFailed(message: string = '邮件发送失败'): AppError {
    return new AppError(message, 500, ErrorCode.EMAIL_SEND_FAILED);
  }

  // 数据库相关错误
  static databaseError(message: string = '数据库操作失败'): AppError {
    return new AppError(message, 500, ErrorCode.DATABASE_ERROR, false);
  }

  static duplicateKey(field: string, value: any): AppError {
    return new AppError(
      `${field} 已存在`,
      409,
      ErrorCode.DUPLICATE_KEY,
      true,
      { field, value }
    );
  }
}

export default AppError;

