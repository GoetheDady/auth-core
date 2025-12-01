require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwtVerify = require('./middleware/jwtVerify');

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * ========================================
 * 业务系统示例应用
 * 演示如何集成 AuthCore 认证中心
 * ========================================
 */

// 中间件
app.use(cors());
app.use(express.json());

// 日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * ========================================
 * 公开接口（无需认证）
 * ========================================
 */

// 首页
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '欢迎访问业务系统示例',
    description: '这是一个演示如何接入 AuthCore 认证中心的示例应用',
    endpoints: {
      public: {
        health: 'GET /health',
        home: 'GET /'
      },
      protected: {
        profile: 'GET /api/profile (需要认证)',
        dashboard: 'GET /api/dashboard (需要认证)',
        settings: 'GET /api/settings (需要认证)'
      }
    },
    howToUse: {
      step1: '在认证中心注册账号: POST http://localhost:3000/api/auth/register',
      step2: '验证邮箱: 点击邮件中的验证链接',
      step3: '登录获取 Token: POST http://localhost:3000/api/auth/login',
      step4: '使用 Token 访问本系统受保护接口',
      tokenFormat: 'Authorization: Bearer <your-access-token>'
    }
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '业务系统运行正常',
    timestamp: new Date().toISOString()
  });
});

/**
 * ========================================
 * 受保护接口（需要认证）
 * ========================================
 */

// 用户资料接口
app.get('/api/profile', jwtVerify, (req, res) => {
  // req.user 由 jwtVerify 中间件注入，包含用户信息
  res.json({
    success: true,
    message: '获取用户资料成功',
    user: req.user,
    // 这里是业务系统自己的数据
    businessData: {
      role: 'member',
      memberLevel: 'gold',
      points: 1580,
      joinedAt: '2024-01-01',
      lastLoginAt: new Date().toISOString()
    }
  });
});

// 仪表盘接口
app.get('/api/dashboard', jwtVerify, (req, res) => {
  res.json({
    success: true,
    message: '欢迎回来',
    user: {
      username: req.user.username,
      email: req.user.email
    },
    stats: {
      totalOrders: 15,
      totalSpent: 3580.50,
      rewardPoints: 1580,
      notifications: 3
    }
  });
});

// 设置接口
app.get('/api/settings', jwtVerify, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    settings: {
      notifications: {
        email: true,
        sms: false,
        push: true
      },
      privacy: {
        profileVisible: true,
        showEmail: false
      },
      theme: 'light'
    }
  });
});

// 更新设置接口（示例）
app.put('/api/settings', jwtVerify, (req, res) => {
  res.json({
    success: true,
    message: '设置更新成功',
    user: req.user,
    updatedSettings: req.body
  });
});

/**
 * ========================================
 * 错误处理
 * ========================================
 */

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `路由不存在: ${req.method} ${req.path}`
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('错误:', err.message);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

/**
 * ========================================
 * 启动服务器
 * ========================================
 */

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║         📦 业务系统示例已启动                             ║
║                                                          ║
║         端口: ${PORT.toString().padEnd(45)}║
║         地址: http://localhost:${PORT.toString().padEnd(33)}║
║                                                          ║
║         📖 接口文档: http://localhost:${PORT}/              ║
║         ❤️  健康检查: http://localhost:${PORT}/health        ║
║                                                          ║
║         🔐 认证中心: ${(process.env.AUTH_CENTER_URL || 'http://localhost:3000').padEnd(33)}║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
  
  console.log('\n💡 使用提示:');
  console.log('   1. 确保认证中心(端口 3000)已启动');
  console.log('   2. 确保项目根目录存在 keys/public.key 公钥文件');
  console.log('     如果不存在，运行: npm run generate-keys (在项目根目录)');
  console.log('   3. 在认证中心注册并登录，获取 access token');
  console.log('   4. 使用 token 访问本系统的受保护接口');
  console.log('     示例: curl -H "Authorization: Bearer <token>" http://localhost:3001/api/profile\n');
});

module.exports = app;

