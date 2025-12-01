const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');

/**
 * 路由汇总
 */

// 认证相关路由
router.use('/auth', authRoutes);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: 健康检查
 *     tags: [健康检查]
 *     description: 检查服务是否正常运行
 *     responses:
 *       200:
 *         description: 服务正常
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: AuthCore 认证中心运行正常
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2024-12-01T10:00:00.000Z
 *                 env:
 *                   type: string
 *                   example: development
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AuthCore 认证中心运行正常',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;

