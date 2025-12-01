# 🔐 AuthCore - 统一认证中心

基于 Express + MongoDB + JWT RS256 的企业级统一认证解决方案，实现"一次认证，处处可用"。

## ✨ 特性

- 🔒 **JWT RS256 非对称加密** - 私钥签名，公钥验证，安全可靠
- 👥 **双登录方式** - 支持邮箱和用户名两种登录方式
- ✉️ **邮箱验证** - 注册时强制邮箱验证，支持重发验证邮件
- 🔄 **Token 刷新** - Access Token + Refresh Token 机制
- 🚀 **快速接入** - 业务系统仅需公钥即可验证 Token
- 🛡️ **安全防护** - Helmet、CORS、Rate Limiting 全方位保护
- 📦 **开箱即用** - 完整的示例应用和接入文档

## 📋 目录

- [架构设计](#架构设计)
- [快速开始](#快速开始)
- [API 文档](#api-文档)
- [业务系统接入](#业务系统接入)
- [环境配置](#环境配置)
- [项目结构](#项目结构)
- [开发指南](#开发指南)

## 🏗️ 架构设计

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   用户      │         │   AuthCore       │         │  业务系统A   │
│             │         │   认证中心        │         │             │
└──────┬──────┘         └────────┬─────────┘         └──────┬──────┘
       │                         │                          │
       │  1. 注册/登录           │                          │
       ├────────────────────────>│                          │
       │                         │                          │
       │  2. 返回 JWT Token      │                          │
       │<────────────────────────┤                          │
       │                         │                          │
       │  3. 携带 Token 访问     │                          │
       ├─────────────────────────┼─────────────────────────>│
       │                         │                          │
       │                         │  4. 使用公钥验证 Token   │
       │                         │<─────────────────────────┤
       │                         │                          │
       │  5. 返回业务数据         │                          │
       │<────────────────────────┼──────────────────────────┤
       │                         │                          │
```

**核心优势：**
- 认证中心使用私钥签名 JWT
- 业务系统使用公钥验证 JWT（无需连接认证中心数据库）
- 业务系统仅管理自己的业务数据，用户凭证统一由认证中心管理

## 🚀 快速开始

### 前置要求

- Node.js >= 16
- MongoDB >= 5.0
- pnpm（推荐）或 npm

### 1. 安装依赖

```bash
# 安装认证中心依赖
pnpm install

# 安装业务系统示例依赖
cd example
pnpm install
cd ..
```

### 2. 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，配置数据库和邮件服务
```

### 3. 生成 RSA 密钥对

```bash
npm run generate-keys
```

这将在 `keys/` 目录生成：
- `private.key` - 私钥（认证中心使用，绝不泄露）
- `public.key` - 公钥（分发给业务系统）

### 4. 启动 MongoDB

```bash
# 使用 Docker
docker run -d -p 27017:27017 --name mongodb mongo

# 或使用本地安装的 MongoDB
mongod --dbpath /path/to/data
```

### 5. （可选）启动 MailHog 测试邮件

```bash
# 使用 Docker
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Web 界面：http://localhost:8025
```

### 6. 启动认证中心

```bash
npm start
# 或开发模式
npm run dev
```

访问：http://localhost:3000

### 7. 启动业务系统示例

```bash
cd example
npm start
```

访问：http://localhost:3001

## 📚 API 文档

### 基础 URL

```
认证中心: http://localhost:3000/api
```

### 1. 用户注册

**POST** `/auth/register`

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "Password123"
}
```

**响应：**

```json
{
  "success": true,
  "message": "注册成功，请查收验证邮件",
  "userId": "507f1f77bcf86cd799439011"
}
```

**验证规则：**
- 邮箱：有效的邮箱格式
- 用户名：3-20 字符，仅字母、数字、下划线
- 密码：至少 8 个字符，必须包含字母和数字

### 2. 验证邮箱

**GET** `/auth/verify?token=xxx`

用户点击邮件中的验证链接，自动完成验证并跳转到成功页面。

### 3. 重发验证邮件

**POST** `/auth/resend-verification`

```json
{
  "email": "user@example.com"
}
```

**限流：** 每个邮箱每 5 分钟最多 1 次

### 4. 用户登录

**POST** `/auth/login`

```json
{
  "account": "user@example.com",  // 邮箱或用户名
  "password": "Password123"
}
```

**响应：**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
  "expiresIn": 900,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

**限流：** 每个 IP 每 15 分钟最多 5 次

### 5. 刷新 Access Token

**POST** `/auth/refresh`

```json
{
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

**响应：**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "expiresIn": 900
}
```

### 6. 用户登出

**POST** `/auth/logout`

```json
{
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 7. 获取公钥

**GET** `/auth/public-key`

返回 RSA 公钥（文本格式），供业务系统验证 Token。

## 🔌 业务系统接入

### 步骤 1：获取公钥

```bash
curl http://localhost:3000/api/auth/public-key > public.key
```

### 步骤 2：安装依赖

```bash
npm install jsonwebtoken
```

### 步骤 3：创建 JWT 验证中间件

参考 `example/middleware/jwtVerify.js`：

```javascript
const jwt = require('jsonwebtoken');
const fs = require('fs');

const publicKey = fs.readFileSync('./public.key', 'utf8');

function jwtVerify(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未授权' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, publicKey, {
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
    return res.status(401).json({ message: 'Token 无效' });
  }
}

module.exports = jwtVerify;
```

### 步骤 4：在路由中使用

```javascript
const express = require('express');
const jwtVerify = require('./middleware/jwtVerify');

const app = express();

// 受保护的接口
app.get('/api/profile', jwtVerify, (req, res) => {
  res.json({
    user: req.user,
    businessData: {
      // 业务系统自己的数据
    }
  });
});
```

### 步骤 5：前端使用示例

```javascript
// 1. 用户登录
const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    account: 'user@example.com',
    password: 'Password123'
  })
});

const { accessToken, refreshToken } = await loginResponse.json();

// 保存 Token
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// 2. 访问业务系统接口
const profileResponse = await fetch('http://localhost:3001/api/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// 3. Token 过期时刷新
if (profileResponse.status === 401) {
  const refreshResponse = await fetch('http://localhost:3000/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refreshToken: localStorage.getItem('refreshToken')
    })
  });
  
  const { accessToken: newToken } = await refreshResponse.json();
  localStorage.setItem('accessToken', newToken);
}
```

## ⚙️ 环境配置

### 认证中心 (.env)

```bash
# 数据库
MONGODB_URI=mongodb://localhost:27017/authCore

# 服务器
PORT=3000
NODE_ENV=development

# JWT
ACCESS_TOKEN_EXPIRE=15m
REFRESH_TOKEN_EXPIRE=7d

# 跨域
ALLOWED_ORIGINS=http://localhost:3001,http://app1.example.com

# 邮件服务（SMTP）
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@authcore.local

# 验证链接
VERIFY_URL_BASE=http://localhost:3000
```

### 使用真实邮件服务

#### Gmail

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # 需要在 Google 账户中生成应用专用密码
EMAIL_FROM=your-email@gmail.com
```

#### SendGrid

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

## 📁 项目结构

```
authCore/
├── src/
│   ├── config/              # 配置文件
│   │   ├── db.js           # MongoDB 连接
│   │   ├── jwt.js          # JWT 配置
│   │   ├── email.js        # 邮件配置
│   │   └── index.js        # 配置汇总
│   ├── models/             # 数据模型
│   │   └── User.js         # 用户模型
│   ├── routes/             # 路由
│   │   ├── auth.js         # 认证路由
│   │   └── index.js        # 路由汇总
│   ├── middlewares/        # 中间件
│   │   ├── errorHandler.js # 错误处理
│   │   └── validator.js    # 请求验证
│   ├── services/           # 业务逻辑
│   │   ├── authService.js  # 认证服务
│   │   ├── tokenService.js # Token 服务
│   │   └── emailService.js # 邮件服务
│   ├── utils/              # 工具函数
│   │   ├── generateKeys.js # 密钥生成
│   │   └── logger.js       # 日志工具
│   └── app.js              # 应用入口
├── keys/                   # RSA 密钥对
│   ├── private.key         # 私钥（不提交）
│   └── public.key          # 公钥
├── example/                # 业务系统示例
│   ├── middleware/
│   │   └── jwtVerify.js   # JWT 验证中间件
│   ├── app.js             # 示例应用
│   └── README.md          # 示例文档
├── package.json
├── .env.example
└── README.md
```

## 🛠️ 开发指南

### 可用命令

```bash
# 认证中心
npm start              # 启动服务
npm run dev            # 开发模式（热重载）
npm run generate-keys  # 生成 RSA 密钥对

# 业务系统示例
cd example
npm start              # 启动示例应用
npm run dev            # 开发模式
```

### 安全最佳实践

1. **私钥保护**
   - ✅ 私钥 (`private.key`) 已加入 `.gitignore`
   - ✅ 绝不将私钥提交到版本控制
   - ✅ 生产环境使用环境变量或密钥管理服务

2. **CORS 配置**
   - ✅ 生产环境设置具体的域名白名单
   - ❌ 不要使用 `*` 允许所有来源

3. **环境变量**
   - ✅ 使用 `.env` 文件管理敏感信息
   - ❌ 不要将 `.env` 提交到版本控制

4. **Rate Limiting**
   - ✅ 登录接口：15 分钟 5 次
   - ✅ 注册接口：1 小时 3 次
   - ✅ 邮件重发：5 分钟 1 次

### Token 生命周期

- **Access Token**: 15 分钟（短期，用于 API 请求）
- **Refresh Token**: 7 天（长期，用于刷新 Access Token）
- **验证 Token**: 24 小时（邮箱验证）

### 常见问题

**Q: Token 过期怎么办？**

A: 使用 Refresh Token 刷新 Access Token：

```javascript
POST /api/auth/refresh
{ "refreshToken": "xxx" }
```

**Q: 如何支持多设备登录？**

A: 用户模型中的 `refreshTokens` 数组支持多个 Refresh Token，每次登录生成新的 Token。

**Q: 如何注销所有设备？**

A: 调用登出接口时传入 `userId` 而不是 `refreshToken`，将清除该用户的所有 Token。

**Q: 邮件发送失败怎么办？**

A: 
1. 检查 SMTP 配置是否正确
2. 开发环境推荐使用 MailHog
3. 生产环境使用可靠的邮件服务（SendGrid、阿里云等）

## 📄 License

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**Made with ❤️ by AuthCore Team**

