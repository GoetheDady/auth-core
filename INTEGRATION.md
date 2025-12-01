# 🔌 业务系统集成指南

本文档详细说明业务系统如何集成 AuthCore 认证中心，实现接口的 JWT Token 校验。

## 📋 目录

- [集成流程](#集成流程)
- [方式一：使用公钥文件（推荐）](#方式一使用公钥文件推荐)
- [方式二：动态获取公钥](#方式二动态获取公钥)
- [完整示例](#完整示例)
- [错误处理](#错误处理)
- [最佳实践](#最佳实践)

## 🎯 集成流程

```
┌─────────────────┐
│  1. 获取公钥     │  ← 从认证中心获取或使用公钥文件
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. 创建中间件   │  ← 实现 JWT 验证逻辑
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. 应用到路由   │  ← 保护需要认证的接口
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. 使用 req.user│  ← 获取已验证的用户信息
└─────────────────┘
```

## 🔑 方式一：使用公钥文件（推荐）

### 步骤 1：获取公钥

**方法 A：从认证中心下载**

```bash
# 从认证中心获取公钥
curl http://localhost:3000/api/auth/public-key > keys/public.key
```

**方法 B：从项目根目录复制**

如果认证中心和业务系统在同一项目，公钥位于 `keys/public.key`。

### 步骤 2：安装依赖

```bash
npm install jsonwebtoken
# 或
pnpm add jsonwebtoken
```

### 步骤 3：创建 JWT 验证中间件

创建文件 `middleware/jwtVerify.js`：

```javascript
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

/**
 * JWT 验证中间件
 * 用于验证由 AuthCore 认证中心签发的 JWT Token
 */

// 读取公钥
let publicKey;
try {
  // 方式 1: 从环境变量读取（生产环境推荐）
  if (process.env.AUTHCORE_PUBLIC_KEY) {
    publicKey = process.env.AUTHCORE_PUBLIC_KEY.replace(/\\n/g, '\n');
  } 
  // 方式 2: 从文件读取
  else {
    const publicKeyPath = process.env.AUTHCORE_PUBLIC_KEY_PATH || 
                         path.join(__dirname, '../../keys/public.key');
    publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  }
  console.log('✅ JWT 公钥加载成功');
} catch (error) {
  console.error('❌ 读取公钥失败:', error.message);
  console.error('提示：');
  console.error('  1. 确保公钥文件存在: keys/public.key');
  console.error('  2. 或从认证中心获取: curl http://localhost:3000/api/auth/public-key > keys/public.key');
  console.error('  3. 或设置环境变量: AUTHCORE_PUBLIC_KEY_PATH=/path/to/public.key');
  process.exit(1);
}

/**
 * JWT 验证中间件（必需认证）
 * 
 * 验证成功后，将用户信息注入到 req.user
 * 
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - Express next 函数
 */
function jwtVerify(req, res, next) {
  try {
    // 1. 从请求头获取 Token
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌',
        code: 'NO_TOKEN'
      });
    }
    
    // 2. 检查格式：Bearer <token>
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: '认证令牌格式错误，应为: Bearer <token>',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }
    
    const token = parts[1];
    
    // 3. 验证 Token
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],           // 必须使用 RS256 算法
      issuer: 'authCore',              // 验证签发者
      audience: 'authCore-api'         // 验证受众
    });
    
    // 4. 将用户信息挂载到 req.user
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username
    };
    
    next();
    
  } catch (error) {
    // Token 已过期
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token 已过期，请刷新',
        code: 'TOKEN_EXPIRED',
        expiredAt: error.expiredAt
      });
    }
    
    // Token 无效
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token 无效',
        code: 'TOKEN_INVALID'
      });
    }
    
    // 其他错误
    console.error('JWT 验证错误:', error);
    return res.status(500).json({
      success: false,
      message: '认证验证失败',
      code: 'VERIFICATION_ERROR'
    });
  }
}

/**
 * 可选的 JWT 验证中间件（Token 不存在时不报错）
 * 
 * 适用于需要区分登录/未登录状态的接口
 * 
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - Express next 函数
 */
function jwtVerifyOptional(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    // 没有 Token，继续执行（req.user 为 null）
    if (!authHeader) {
      req.user = null;
      return next();
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      req.user = null;
      return next();
    }
    
    const token = parts[1];
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'authCore',
      audience: 'authCore-api'
    });
    
    // 验证成功，设置用户信息
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username
    };
    
    next();
    
  } catch (error) {
    // 验证失败，但不阻止请求（req.user 为 null）
    req.user = null;
    next();
  }
}

module.exports = jwtVerify;
module.exports.jwtVerifyOptional = jwtVerifyOptional;
```

### 步骤 4：在路由中使用

```javascript
const express = require('express');
const router = express.Router();
const jwtVerify = require('../middleware/jwtVerify');

// 受保护的接口（必需认证）
router.get('/api/profile', jwtVerify, (req, res) => {
  // req.user 包含已验证的用户信息
  res.json({
    success: true,
    user: req.user,
    // 你的业务数据
    businessData: {
      // ...
    }
  });
});

// 可选认证的接口
router.get('/api/public-content', jwtVerify.jwtVerifyOptional, (req, res) => {
  if (req.user) {
    // 已登录用户，返回个性化内容
    res.json({
      success: true,
      content: '个性化内容',
      user: req.user
    });
  } else {
    // 未登录用户，返回通用内容
    res.json({
      success: true,
      content: '通用内容'
    });
  }
});

module.exports = router;
```

## 🌐 方式二：动态获取公钥

如果公钥可能更新，可以动态从认证中心获取：

```javascript
const jwt = require('jsonwebtoken');
const axios = require('axios');

// 公钥缓存
let publicKey = null;
let publicKeyExpiry = null;
const PUBLIC_KEY_CACHE_TTL = 60 * 60 * 1000; // 1 小时

/**
 * 获取公钥（带缓存）
 */
async function getPublicKey() {
  // 如果缓存有效，直接返回
  if (publicKey && publicKeyExpiry && Date.now() < publicKeyExpiry) {
    return publicKey;
  }
  
  try {
    // 从认证中心获取公钥
    const authCoreUrl = process.env.AUTHCORE_URL || 'http://localhost:3000';
    const response = await axios.get(`${authCoreUrl}/api/auth/public-key`);
    
    publicKey = response.data;
    publicKeyExpiry = Date.now() + PUBLIC_KEY_CACHE_TTL;
    
    console.log('✅ 公钥已更新');
    return publicKey;
  } catch (error) {
    console.error('❌ 获取公钥失败:', error.message);
    // 如果已有缓存，使用旧公钥
    if (publicKey) {
      console.warn('⚠️  使用缓存的公钥');
      return publicKey;
    }
    throw error;
  }
}

/**
 * JWT 验证中间件（动态获取公钥）
 */
async function jwtVerify(req, res, next) {
  try {
    // 获取公钥
    const key = await getPublicKey();
    
    // 获取 Token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: '认证令牌格式错误'
      });
    }
    
    const token = parts[1];
    
    // 验证 Token
    const decoded = jwt.verify(token, key, {
      algorithms: ['RS256'],
      issuer: 'authCore',
      audience: 'authCore-api'
    });
    
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username
    };
    
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token 已过期，请刷新',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token 无效',
        code: 'TOKEN_INVALID'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: '认证验证失败'
    });
  }
}

module.exports = jwtVerify;
```

## 📝 完整示例

### 示例 1：基础 Express 应用

```javascript
const express = require('express');
const jwtVerify = require('./middleware/jwtVerify');

const app = express();
app.use(express.json());

// 公开接口
app.get('/health', (req, res) => {
  res.json({ success: true, message: '服务正常' });
});

// 受保护接口
app.get('/api/user/profile', jwtVerify, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    profile: {
      // 你的业务数据
    }
  });
});

// 可选认证接口
app.get('/api/articles', jwtVerify.jwtVerifyOptional, (req, res) => {
  const articles = getArticles(req.user ? req.user.userId : null);
  res.json({ success: true, articles });
});

app.listen(3001, () => {
  console.log('业务系统已启动: http://localhost:3001');
});
```

### 示例 2：使用路由模块

```javascript
// routes/user.js
const express = require('express');
const router = express.Router();
const jwtVerify = require('../middleware/jwtVerify');

// 所有路由都需要认证
router.use(jwtVerify);

router.get('/profile', (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

router.get('/orders', (req, res) => {
  // 使用 req.user.userId 查询该用户的订单
  const orders = getOrdersByUserId(req.user.userId);
  res.json({ success: true, orders });
});

module.exports = router;
```

```javascript
// app.js
const express = require('express');
const userRoutes = require('./routes/user');

const app = express();
app.use(express.json());

app.use('/api/user', userRoutes);

app.listen(3001);
```

## ⚠️ 错误处理

### 标准错误响应格式

```json
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE"
}
```

### 常见错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `NO_TOKEN` | 401 | 未提供 Token |
| `INVALID_TOKEN_FORMAT` | 401 | Token 格式错误 |
| `TOKEN_EXPIRED` | 401 | Token 已过期 |
| `TOKEN_INVALID` | 401 | Token 无效 |
| `VERIFICATION_ERROR` | 500 | 验证过程出错 |

### 前端处理示例

```javascript
// 前端请求封装
async function apiRequest(url, options = {}) {
  const token = localStorage.getItem('accessToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  const data = await response.json();
  
  // Token 过期，尝试刷新
  if (data.code === 'TOKEN_EXPIRED') {
    const newToken = await refreshToken();
    if (newToken) {
      // 重试请求
      return apiRequest(url, options);
    } else {
      // 刷新失败，跳转登录
      window.location.href = '/login';
    }
  }
  
  if (!response.ok) {
    throw new Error(data.message || '请求失败');
  }
  
  return data;
}
```

## 🎓 最佳实践

### 1. 环境变量配置

```bash
# .env
AUTHCORE_URL=http://localhost:3000
AUTHCORE_PUBLIC_KEY_PATH=./keys/public.key
# 或直接使用环境变量（适合容器部署）
# AUTHCORE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
```

### 2. 公钥管理

- **开发环境**：使用文件方式，便于调试
- **生产环境**：使用环境变量或密钥管理服务（如 AWS Secrets Manager、Azure Key Vault）

### 3. 错误日志

```javascript
function jwtVerify(req, res, next) {
  // ... 验证逻辑 ...
  
  } catch (error) {
    // 记录错误日志（不暴露敏感信息）
    logger.warn('JWT 验证失败', {
      path: req.path,
      method: req.method,
      error: error.name,
      ip: req.ip
    });
    
    // 返回通用错误信息
    return res.status(401).json({
      success: false,
      message: '认证失败'
    });
  }
}
```

### 4. 性能优化

- 公钥只读取一次，避免重复 I/O
- 使用缓存机制（如 Redis）缓存验证结果（谨慎使用）
- 考虑使用连接池管理数据库连接

### 5. 安全建议

- ✅ 始终验证 Token 的 `issuer` 和 `audience`
- ✅ 使用 HTTPS 传输 Token
- ✅ 前端使用 httpOnly Cookie 或 Secure Storage 存储 Token
- ✅ 实现 Token 刷新机制
- ✅ 记录认证失败的日志，便于安全审计
- ❌ 不要在 URL 中传递 Token
- ❌ 不要在日志中记录完整的 Token

### 6. 测试

```javascript
// test/jwtVerify.test.js
const request = require('supertest');
const app = require('../app');

describe('JWT 验证', () => {
  it('应该拒绝没有 Token 的请求', async () => {
    const res = await request(app)
      .get('/api/profile')
      .expect(401);
    
    expect(res.body.code).toBe('NO_TOKEN');
  });
  
  it('应该拒绝无效的 Token', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
    
    expect(res.body.code).toBe('TOKEN_INVALID');
  });
  
  it('应该接受有效的 Token', async () => {
    // 从认证中心获取有效 Token
    const token = await getValidToken();
    
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
  });
});
```

## 📚 相关资源

- [AuthCore 主文档](./README.md)
- [示例应用](./example/README.md)
- [JWT 官方文档](https://jwt.io/)
- [jsonwebtoken 文档](https://github.com/auth0/node-jsonwebtoken)

## ❓ 常见问题

### Q: 公钥在哪里获取？

A: 有两种方式：
1. 从认证中心 API 获取：`GET /api/auth/public-key`
2. 从项目根目录的 `keys/public.key` 文件读取

### Q: Token 过期了怎么办？

A: 使用 Refresh Token 刷新 Access Token：
```javascript
POST /api/auth/refresh
{
  "refreshToken": "your-refresh-token"
}
```

### Q: 如何支持多个认证中心？

A: 可以使用多个公钥，根据 Token 的 `issuer` 选择对应的公钥进行验证。

### Q: 业务系统需要连接认证中心的数据库吗？

A: 不需要。业务系统只需要公钥即可验证 Token，无需连接认证中心的数据库。

---

**需要帮助？** 查看 [示例应用](./example/) 或提交 Issue。

