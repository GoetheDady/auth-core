import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * 请求验证中间件
 * 使用 express-validator 进行数据验证
 * 
 * 安全增强：
 * - 强密码策略：大小写字母 + 数字 + 特殊字符
 * - 弱密码黑名单检查
 */

/**
 * 常见弱密码黑名单
 * 防止用户使用过于简单或常见的密码
 */
const WEAK_PASSWORDS = [
  'password', 'password123', 'password1234', 'password12345',
  '12345678', '123456789', '1234567890',
  'qwerty', 'qwerty123', 'qwertyuiop',
  'abc123', 'abc12345', 'abcd1234',
  '11111111', '00000000',
  'admin123', 'admin1234',
  'welcome123', 'welcome1234',
  'Password1!', 'Password123!', 'Password@123',
  'Aa123456!', 'Aa123456@', 'Aa111111!',
];

/**
 * 检查密码是否在弱密码黑名单中（不区分大小写）
 */
const isWeakPassword = (password: string): boolean => {
  const lowerPassword = password.toLowerCase();
  return WEAK_PASSWORDS.some(weak => lowerPassword === weak.toLowerCase());
};

/**
 * 处理验证结果
 */
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: '请求参数验证失败',
      errors: errors.array().map(err => ({
        field: 'path' in err ? err.path : 'unknown',
        message: err.msg
      }))
    });
    return;
  }
  next();
};

/**
 * 注册验证规则（增强密码安全性）
 */
export const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('邮箱格式不正确')
    .normalizeEmail(),
  
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在 3-20 个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  
  body('password')
    .isLength({ min: 10, max: 128 })
    .withMessage('密码长度必须在 10-128 个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('密码必须包含大写字母、小写字母、数字和特殊字符（@$!%*?&）')
    .custom((value) => {
      if (isWeakPassword(value)) {
        throw new Error('该密码过于简单或常见，请使用更强的密码');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * 登录验证规则
 */
export const validateLogin = [
  body('account')
    .trim()
    .notEmpty()
    .withMessage('账号不能为空'),
  
  body('password')
    .notEmpty()
    .withMessage('密码不能为空'),
  
  handleValidationErrors
];

/**
 * 刷新 Token 验证规则
 */
export const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh Token 不能为空'),
  
  handleValidationErrors
];

/**
 * 邮箱验证规则
 */
export const validateEmail = [
  body('email')
    .isEmail()
    .withMessage('邮箱格式不正确')
    .normalizeEmail(),
  
  handleValidationErrors
];

