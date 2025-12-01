import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * 请求验证中间件
 * 使用 express-validator 进行数据验证
 */

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
 * 注册验证规则
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
    .isLength({ min: 8 })
    .withMessage('密码至少 8 个字符')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('密码必须包含字母和数字'),
  
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

