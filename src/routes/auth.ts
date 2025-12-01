import express, { Request, Response, NextFunction, Router } from 'express';
import * as authService from '../services/authService';
import config from '../config';
import {
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateEmail
} from '../middlewares/validator';

const router: Router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 用户注册
 *     tags: [认证]
 *     description: 注册新用户，注册成功后会发送验证邮件到用户邮箱
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: 请求过于频繁
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', validateRegister, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, username, password } = req.body;
    const result = await authService.register({ email, username, password });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: 验证邮箱
 *     tags: [认证]
 *     description: 通过邮件中的验证链接验证用户邮箱
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: 验证令牌（从邮件链接中获取）
 *     responses:
 *       200:
 *         description: 验证成功，返回 HTML 页面
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       400:
 *         description: 验证失败，返回 HTML 页面
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
router.get('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>验证失败</title>
          <style>
            body { font-family: Arial; text-align: center; padding: 50px; }
            .error { color: #e74c3c; font-size: 20px; }
          </style>
        </head>
        <body>
          <h1 class="error">❌ 验证失败</h1>
          <p>验证链接无效或已过期</p>
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            如果您需要重新发送验证邮件，请联系客服或使用"重新发送验证邮件"功能
          </p>
        </body>
        </html>
      `);
      return;
    }
    
    const result = await authService.verifyEmail(token);
    
    // 返回成功页面
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>验证成功</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container {
            background: white;
            color: #333;
            padding: 40px;
            border-radius: 10px;
            display: inline-block;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          }
          .success { color: #27ae60; font-size: 24px; margin: 20px 0; }
          .info { color: #666; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="success">✅ 邮箱验证成功！</h1>
          <p class="info">您的账号：<strong>${result.user.username}</strong></p>
          <p class="info">邮箱：<strong>${result.user.email}</strong></p>
          <p style="margin-top: 30px;">现在可以使用您的账号登录了</p>
        </div>
      </body>
      </html>
    `);
  } catch (error: any) {
    // 安全处理：不暴露详细错误信息，防止信息泄露
    const safeMessage = '验证链接无效或已过期';
    
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>验证失败</title>
        <style>
          body { font-family: Arial; text-align: center; padding: 50px; }
          .error { color: #e74c3c; font-size: 20px; }
        </style>
      </head>
      <body>
        <h1 class="error">❌ 验证失败</h1>
        <p>${safeMessage}</p>
        <p style="margin-top: 20px; font-size: 14px; color: #666;">
          如果您需要重新发送验证邮件，请使用"重新发送验证邮件"功能
        </p>
      </body>
      </html>
    `);
  }
});

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: 重新发送验证邮件
 *     tags: [认证]
 *     description: 为未验证的用户重新发送验证邮件（限流：5分钟1次）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendVerificationRequest'
 *     responses:
 *       200:
 *         description: 邮件发送成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: 请求参数错误或邮箱已验证
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: 请求过于频繁
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/resend-verification', validateEmail, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const result = await authService.resendVerificationEmail(email);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     tags: [认证]
 *     description: 使用邮箱或用户名登录，返回 Access Token 和 Refresh Token（限流：15分钟5次）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: 账号或密码错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 邮箱未验证
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: 请求过于频繁
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', validateLogin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { account, password } = req.body;
    const result = await authService.login(account, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: 刷新 Access Token
 *     tags: [认证]
 *     description: 使用 Refresh Token 获取新的 Access Token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: 刷新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshTokenResponse'
 *       400:
 *         description: Refresh Token 无效或已过期
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh', validateRefreshToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 用户登出
 *     tags: [认证]
 *     description: 登出用户，删除 Refresh Token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh Token
 *                 example: '550e8400-e29b-41d4-a716-446655440000'
 *     responses:
 *       200:
 *         description: 登出成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.logout(refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/public-key:
 *   get:
 *     summary: 获取 RSA 公钥
 *     tags: [认证]
 *     description: 获取用于验证 JWT Token 的 RSA 公钥（供业务系统使用）
 *     responses:
 *       200:
 *         description: 返回公钥内容
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: |
 *                 -----BEGIN PUBLIC KEY-----
 *                 MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
 *                 -----END PUBLIC KEY-----
 */
router.get('/public-key', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send(config.jwt.publicKey);
});

export default router;

