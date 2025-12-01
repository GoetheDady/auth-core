import 'dotenv/config';
import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import logger, { LogLevel } from './utils/logger';
import swaggerSpecs from './config/swagger';
import config from './config';
import routes from './routes';
import { errorHandler, notFoundHandler, setupUncaughtExceptionHandlers } from './middlewares/errorHandler';
import { requestIdMiddleware } from './middlewares/requestId';
import { verifyEmailConfig } from './services/emailService';

// 设置未捕获异常处理
setupUncaughtExceptionHandlers();

const app: Application = express();

/**
 * ========================================
 * 1. 安全中间件
 * ========================================
 */

// Helmet - 设置安全相关的 HTTP 头
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https:"],
      "script-src": ["'self'", "'unsafe-inline'"],
    },
  },
}));

// CORS - 跨域资源共享
const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // 允许无 origin 的请求（如 Postman、服务端请求）
    if (!origin) return callback(null, true);
    
    // 检查是否在白名单中
    if (config.cors.origins.indexOf(origin) !== -1 || config.cors.origins.includes('*')) {
      callback(null, true);
    } else {
      logger.warn(`CORS 阻止了来自 ${origin} 的请求`);
      callback(new Error('不允许的跨域请求'));
    }
  },
  credentials: config.cors.credentials,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

/**
 * ========================================
 * 2. 限流中间件
 * ========================================
 */

// 全局限流：每 IP 每 15 分钟最多 100 个请求
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// 登录限流：每 IP 每 15 分钟最多 5 次
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: '登录尝试次数过多，请 15 分钟后再试'
  },
  skipSuccessfulRequests: true,
});

app.use('/api/auth/login', loginLimiter);

// 注册限流：每 IP 每小时最多 3 次
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: '注册次数过多，请 1 小时后再试'
  },
});

app.use('/api/auth/register', registerLimiter);

// 重发验证邮件限流：每 IP 每 5 分钟最多 1 次
const resendLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 1,
  message: {
    success: false,
    message: '操作过于频繁，请 5 分钟后再试'
  },
});

app.use('/api/auth/resend-verification', resendLimiter);

/**
 * ========================================
 * 3. 请求 ID 追踪
 * ========================================
 */

// 为每个请求生成唯一 ID
app.use(requestIdMiddleware);

/**
 * ========================================
 * 4. 请求解析中间件
 * ========================================
 */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * ========================================
 * 5. 增强的日志中间件
 * ========================================
 */

app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  
  // 记录请求开始
  logger.logStructured(LogLevel.DEBUG, {
    type: 'request_start',
    requestId: req.id,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 500 ? LogLevel.ERROR :
                     res.statusCode >= 400 ? LogLevel.WARN :
                     LogLevel.INFO;
    
    logger.logStructured(logLevel, {
      type: 'request_complete',
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
});

/**
 * ========================================
 * 6. Swagger API 文档
 * ========================================
 */

// Swagger 文档路由（仅非生产环境）
if (config.server.env !== 'production') {
  // Swagger UI 配置
  const swaggerOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'AuthCore API 文档',
    customfavIcon: '/favicon.ico'
  };

  // Swagger 文档路由
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, swaggerOptions));
}

/**
 * ========================================
 * 7. 路由
 * ========================================
 */

// API 路由
app.use('/api', routes);

/**
 * 根路由（仅非生产环境）
 * @swagger
 * /:
 *   get:
 *     summary: 获取 API 信息
 *     tags: [健康检查]
 *     description: 返回 API 基本信息和可用端点
 *     responses:
 *       200:
 *         description: API 信息
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
 *                   example: 欢迎使用 AuthCore 统一认证中心
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 endpoints:
 *                   type: object
 *                 documentation:
 *                   type: string
 *                   example: http://localhost:3000/api-docs
 */
if (config.server.env !== 'production') {
  app.get('/', (req: Request, res: Response) => {
    res.json({
      success: true,
      message: '欢迎使用 AuthCore 统一认证中心',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        verify: 'GET /api/auth/verify?token=xxx',
        resendVerification: 'POST /api/auth/resend-verification',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        publicKey: 'GET /api/auth/public-key'
      },
      documentation: `${req.protocol}://${req.get('host')}/api-docs`
    });
  });
}

/**
 * ========================================
 * 8. 错误处理
 * ========================================
 */

// 404 处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

/**
 * ========================================
 * 9. 启动服务器
 * ========================================
 */

async function startServer(): Promise<void> {
  try {
    // 连接数据库
    await config.connectDB();
    
    // 验证邮件配置（不阻塞启动）
    await verifyEmailConfig();
    
    // 启动服务器
    const PORT = config.server.port;
    app.listen(PORT, () => {
      logger.success(`
╔═════════════════════════════════════════════════════════════════════╗
║                                                                     ║
║         🔐 AuthCore 认证中心已启动                                  ║
║                                                                     ║
║         环境: ${config.server.env.padEnd(54)}║
║         端口: ${PORT.toString().padEnd(54)}║
║         地址: http://localhost:${PORT}${' '.repeat(69 - 32 - PORT.toString().length)}║
║                                                                     ║
║         📖 API 文档: http://localhost:${PORT}/api-docs${' '.repeat(69 - 48 - PORT.toString().length)}║
║         ❤️  健康检查: http://localhost:${PORT}/api/health${' '.repeat(69 - 50 - PORT.toString().length)}║
║         🔑 公钥获取: http://localhost:${PORT}/api/auth/public-key${' '.repeat(69 - 59 - PORT.toString().length)}║
║                                                                     ║
╚═════════════════════════════════════════════════════════════════════╝
      `);
    });
    
  } catch (error) {
    logger.error('服务器启动失败:', (error as Error).message);
    process.exit(1);
  }
}

// 启动应用
if (require.main === module) {
  startServer();
}

export default app;

