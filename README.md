# 🔐 AuthCore - 统一认证中心

基于 Express + MongoDB + JWT RS256 的企业级统一认证解决方案，实现"一次认证，处处可用"。

## ✨ 特性

- 🔒 **JWT RS256 非对称加密** - 私钥签名，公钥验证，安全可靠
- 👥 **双登录方式** - 支持邮箱和用户名两种登录方式
- ✉️ **邮箱验证** - 注册时强制邮箱验证，支持重发验证邮件
- 🔄 **Token 轮换** - Refresh Token 刷新后立即失效，防止重放攻击
- 🛡️ **安全增强** - 哈希存储、设备追踪、IP 记录、会话数量限制
- 🔑 **强密码策略** - 大小写字母 + 数字 + 特殊字符 + 弱密码黑名单
- 🚀 **快速接入** - 业务系统仅需公钥即可验证 Token
- 📦 **开箱即用** - 完整的示例应用和接入文档

## 🏗️ 架构设计

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   前端应用   │         │   AuthCore       │         │  业务后端   │
│  (Vue/React) │         │   认证中心        │         │  (Express)  │
└──────┬──────┘         └────────┬─────────┘         └──────┬──────┘
       │                         │                          │
       │  1. 登录请求            │                          │
       ├────────────────────────>│                          │
       │                         │                          │
       │  2. 返回 Token          │                          │
       │<────────────────────────┤                          │
       │                         │                          │
       │  3. 携带 Token 访问业务 API                        │
       ├─────────────────────────┼─────────────────────────>│
       │                         │                          │
       │                         │  4. 使用公钥验证 Token   │
       │                         │<─────────────────────────┤
       │                         │                          │
       │  5. 返回业务数据         │                          │
       │<────────────────────────┼──────────────────────────┤
```

**核心优势：**
- 认证中心使用私钥签名 JWT，业务系统使用公钥验证（无需连接认证中心数据库）
- 用户凭证统一由认证中心管理，业务系统仅管理自己的业务数据
- Token 轮换机制防止 Token 被盗用

---

## 📖 业务系统接入指南

### 快速开始

#### 1. 获取公钥

```bash
# 方式一：从认证中心 API 获取
curl http://localhost:3000/api/auth/public-key > public.key

# 方式二：直接复制 keys/public.key 文件
```

#### 2. 安装依赖

```bash
npm install jsonwebtoken
```

---

## 🔧 后端接入（Node.js/Express）

### 创建 JWT 验证中间件

创建 `middleware/jwtVerify.js`：

```javascript
const jwt = require('jsonwebtoken');
const fs = require('fs');

// 加载公钥
const publicKey = fs.readFileSync('./public.key', 'utf8');

/**
 * JWT 验证中间件
 */
function jwtVerify(req, res, next) {
  try {
    // 1. 获取 Authorization Header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌，请先登录'
      });
    }
    
    // 2. 验证格式：Bearer <token>
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: '认证令牌格式错误'
      });
    }
    
    const token = parts[1];
    
    // 3. 验证 Token
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'authCore',
      audience: 'authCore-api'
    });
    
    // 4. 将用户信息挂载到 req.user
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

### 在路由中使用

```javascript
const express = require('express');
const jwtVerify = require('./middleware/jwtVerify');

const app = express();

// 受保护的接口（需要登录）
app.get('/api/profile', jwtVerify, (req, res) => {
  // req.user 包含用户信息
  res.json({
    success: true,
    user: req.user,
    businessData: {
      // 业务系统自己的数据
    }
  });
});

// 公开接口（不需要登录）
app.get('/api/public', (req, res) => {
  res.json({ message: '这是公开接口' });
});
```

### 完整的后端示例

参考 `example/app.js` 获取完整的业务系统后端示例。

---

## 💻 前端接入

### 1. Token 管理工具

创建 `utils/auth.js`：

```javascript
/**
 * 认证工具类
 */
const AUTH_API = 'http://localhost:3000/api/auth';

// Token 存储
export const TokenStorage = {
  getAccessToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },
  
  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};

/**
 * 用户注册
 */
export async function register(email, username, password) {
  const response = await fetch(`${AUTH_API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || '注册失败');
  }
  
  return data;
}

/**
 * 用户登录
 */
export async function login(account, password) {
  const response = await fetch(`${AUTH_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account, password })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || '登录失败');
  }
  
  // 保存 Token
  TokenStorage.setTokens(data.accessToken, data.refreshToken);
  
  return data;
}

/**
 * 刷新 Token
 * 
 * 重要：AuthCore 使用 Token 轮换机制
 * 刷新后会返回新的 accessToken 和 refreshToken
 * 旧的 refreshToken 立即失效！
 */
export async function refreshToken() {
  const refreshToken = TokenStorage.getRefreshToken();
  
  if (!refreshToken) {
    throw new Error('没有 Refresh Token');
  }
  
  const response = await fetch(`${AUTH_API}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    // 刷新失败，清除 Token，需要重新登录
    TokenStorage.clearTokens();
    throw new Error(data.message || '刷新失败，请重新登录');
  }
  
  // ⚠️ 重要：必须保存新的 refreshToken
  // 因为旧的已经失效了（Token 轮换机制）
  TokenStorage.setTokens(data.accessToken, data.refreshToken);
  
  return data;
}

/**
 * 用户登出
 */
export async function logout() {
  const refreshToken = TokenStorage.getRefreshToken();
  
  if (refreshToken) {
    try {
      await fetch(`${AUTH_API}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
    } catch (error) {
      console.error('登出请求失败:', error);
    }
  }
  
  TokenStorage.clearTokens();
}

/**
 * 获取当前用户信息（从 Token 解析）
 */
export function getCurrentUser() {
  const token = TokenStorage.getAccessToken();
  if (!token) return null;
  
  try {
    // 解析 JWT payload（不验证签名，仅用于前端显示）
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      userId: payload.userId,
      email: payload.email,
      username: payload.username
    };
  } catch (error) {
    return null;
  }
}

/**
 * 检查是否已登录
 */
export function isLoggedIn() {
  return !!TokenStorage.getAccessToken();
}
```

### 2. HTTP 请求封装（带自动刷新）

创建 `utils/request.js`：

```javascript
import { TokenStorage, refreshToken } from './auth';

const BUSINESS_API = 'http://localhost:3001/api'; // 业务后端地址

/**
 * 封装的请求函数
 * 自动添加 Token，自动处理 Token 过期
 */
export async function request(url, options = {}) {
  const token = TokenStorage.getAccessToken();
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  };
  
  // 添加 Token
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  let response = await fetch(`${BUSINESS_API}${url}`, config);
  
  // Token 过期，尝试刷新
  if (response.status === 401) {
    const data = await response.json();
    
    if (data.code === 'TOKEN_EXPIRED') {
      try {
        // 刷新 Token
        await refreshToken();
        
        // 使用新 Token 重试请求
        config.headers['Authorization'] = `Bearer ${TokenStorage.getAccessToken()}`;
        response = await fetch(`${BUSINESS_API}${url}`, config);
      } catch (refreshError) {
        // 刷新失败，跳转登录页
        window.location.href = '/login';
        throw new Error('登录已过期，请重新登录');
      }
    } else {
      // 其他认证错误，跳转登录页
      TokenStorage.clearTokens();
      window.location.href = '/login';
      throw new Error('请先登录');
    }
  }
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || '请求失败');
  }
  
  return result;
}

// 便捷方法
export const api = {
  get: (url) => request(url, { method: 'GET' }),
  post: (url, data) => request(url, { method: 'POST', body: JSON.stringify(data) }),
  put: (url, data) => request(url, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (url) => request(url, { method: 'DELETE' })
};
```

### 3. Vue 3 使用示例

```vue
<template>
  <div>
    <!-- 未登录 -->
    <div v-if="!user">
      <h2>登录</h2>
      <form @submit.prevent="handleLogin">
        <input v-model="form.account" placeholder="邮箱或用户名" />
        <input v-model="form.password" type="password" placeholder="密码" />
        <button type="submit">登录</button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
    
    <!-- 已登录 -->
    <div v-else>
      <h2>欢迎，{{ user.username }}！</h2>
      <p>邮箱：{{ user.email }}</p>
      <button @click="handleLogout">退出登录</button>
      
      <h3>我的数据</h3>
      <pre>{{ profile }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { login, logout, getCurrentUser, isLoggedIn } from '@/utils/auth';
import { api } from '@/utils/request';

const user = ref(null);
const profile = ref(null);
const error = ref('');
const form = ref({ account: '', password: '' });

// 检查登录状态
onMounted(async () => {
  if (isLoggedIn()) {
    user.value = getCurrentUser();
    await loadProfile();
  }
});

// 登录
async function handleLogin() {
  try {
    error.value = '';
    await login(form.value.account, form.value.password);
    user.value = getCurrentUser();
    await loadProfile();
  } catch (err) {
    error.value = err.message;
  }
}

// 登出
async function handleLogout() {
  await logout();
  user.value = null;
  profile.value = null;
}

// 加载用户数据（从业务后端）
async function loadProfile() {
  try {
    const data = await api.get('/profile');
    profile.value = data;
  } catch (err) {
    console.error('加载失败:', err);
  }
}
</script>
```

### 4. React 使用示例

```jsx
import React, { useState, useEffect } from 'react';
import { login, logout, getCurrentUser, isLoggedIn } from './utils/auth';
import { api } from './utils/request';

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ account: '', password: '' });
  
  // 检查登录状态
  useEffect(() => {
    if (isLoggedIn()) {
      setUser(getCurrentUser());
      loadProfile();
    }
  }, []);
  
  // 登录
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await login(form.account, form.password);
      setUser(getCurrentUser());
      await loadProfile();
    } catch (err) {
      setError(err.message);
    }
  };
  
  // 登出
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setProfile(null);
  };
  
  // 加载用户数据
  const loadProfile = async () => {
    try {
      const data = await api.get('/profile');
      setProfile(data);
    } catch (err) {
      console.error('加载失败:', err);
    }
  };
  
  // 未登录
  if (!user) {
    return (
      <div>
        <h2>登录</h2>
        <form onSubmit={handleLogin}>
          <input
            value={form.account}
            onChange={(e) => setForm({ ...form, account: e.target.value })}
            placeholder="邮箱或用户名"
          />
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="密码"
          />
          <button type="submit">登录</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }
  
  // 已登录
  return (
    <div>
      <h2>欢迎，{user.username}！</h2>
      <p>邮箱：{user.email}</p>
      <button onClick={handleLogout}>退出登录</button>
      
      <h3>我的数据</h3>
      <pre>{JSON.stringify(profile, null, 2)}</pre>
    </div>
  );
}

export default App;
```

---

## 📚 API 文档

### 基础信息

- **认证中心地址**: `http://localhost:3000/api`
- **API 文档（Swagger）**: `http://localhost:3000/api-docs`

### API 端点

| 端点 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/auth/register` | POST | ❌ | 用户注册 |
| `/auth/login` | POST | ❌ | 用户登录 |
| `/auth/verify` | GET | ❌ | 验证邮箱 |
| `/auth/resend-verification` | POST | ❌ | 重发验证邮件 |
| `/auth/refresh` | POST | ❌ | 刷新 Token |
| `/auth/logout` | POST | ❌ | 用户登出 |
| `/auth/public-key` | GET | ❌ | 获取公钥 |
| `/health` | GET | ❌ | 健康检查 |

### 1. 用户注册

**POST** `/auth/register`

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "MyP@ssw0rd2024"
}
```

**密码要求：**
- 长度：10-128 个字符
- 必须包含：大写字母、小写字母、数字、特殊字符（@$!%*?&）
- 不能是常见弱密码（password123、admin123 等）

**响应：**

```json
{
  "success": true,
  "message": "注册成功，请查收验证邮件",
  "userId": "507f1f77bcf86cd799439011"
}
```

**限流：** 每个 IP 每小时最多 3 次

### 2. 用户登录

**POST** `/auth/login`

```json
{
  "account": "user@example.com",
  "password": "MyP@ssw0rd2024"
}
```

**响应：**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0...",
  "expiresIn": 900,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

**限流：** 每个 IP 每 15 分钟最多 5 次

### 3. 刷新 Token

**POST** `/auth/refresh`

```json
{
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0..."
}
```

**响应：**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "x1y2z3w4v5u6t7s8r9q0...",
  "expiresIn": 900
}
```

> ⚠️ **重要：Token 轮换机制**
> - 每次刷新都会返回新的 `refreshToken`
> - 旧的 `refreshToken` 立即失效
> - 必须保存新的 `refreshToken` 用于下次刷新

### 4. 用户登出

**POST** `/auth/logout`

```json
{
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0..."
}
```

### 5. 重发验证邮件

**POST** `/auth/resend-verification`

```json
{
  "email": "user@example.com"
}
```

**限流：** 每个 IP 每 5 分钟最多 1 次

---

## 🔒 安全特性

### Token 安全

| 特性 | 说明 |
|------|------|
| RS256 算法 | 非对称加密，私钥签名，公钥验证 |
| Token 轮换 | Refresh Token 使用后立即失效 |
| 哈希存储 | Refresh Token 使用 SHA-256 哈希存储 |
| 设备追踪 | 记录登录设备的 User-Agent 和 IP |
| 会话限制 | 单用户最多 5 个活跃设备 |

### 密码安全

| 特性 | 说明 |
|------|------|
| 强密码策略 | 大小写 + 数字 + 特殊字符 |
| 弱密码黑名单 | 拒绝常见弱密码 |
| bcrypt 加密 | saltRounds: 10 |
| 最小长度 | 10 个字符 |

### 限流保护

| 接口 | 限制 |
|------|------|
| 全局 | 每 IP 每 15 分钟 100 次 |
| 登录 | 每 IP 每 15 分钟 5 次 |
| 注册 | 每 IP 每小时 3 次 |
| 重发邮件 | 每 IP 每 5 分钟 1 次 |

### Token 生命周期

| Token 类型 | 有效期 | 用途 |
|-----------|--------|------|
| Access Token | 15 分钟 | API 请求认证 |
| Refresh Token | 7 天 | 刷新 Access Token |
| 验证 Token | 24 小时 | 邮箱验证 |

---

## 🚀 快速开始

### 前置要求

- Node.js >= 16
- MongoDB >= 5.0
- pnpm（推荐）或 npm

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 配置数据库和邮件服务
```

### 3. 生成 RSA 密钥对

```bash
npm run generate-keys
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 5. 访问服务

- 认证中心: http://localhost:3000
- API 文档: http://localhost:3000/api-docs
- 健康检查: http://localhost:3000/api/health

---

## ⚙️ 环境配置

### .env 配置项

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
ALLOWED_ORIGINS=http://localhost:3001,http://app.example.com

# 邮件服务
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@authcore.local

# 验证链接
VERIFY_URL_BASE=http://localhost:3000
```

### 生产环境邮件配置

**Gmail:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**SendGrid:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

---

## 📁 项目结构

```
authCore/
├── src/
│   ├── config/              # 配置文件
│   ├── models/              # 数据模型
│   ├── routes/              # 路由
│   ├── middlewares/         # 中间件
│   ├── services/            # 业务逻辑
│   ├── utils/               # 工具函数
│   ├── types/               # TypeScript 类型
│   └── app.ts               # 应用入口
├── keys/                    # RSA 密钥对
├── example/                 # 业务系统示例
│   ├── middleware/
│   │   └── jwtVerify.js    # JWT 验证中间件
│   └── app.js              # 示例应用
├── docs/                    # 文档
└── package.json
```

---

## ❓ 常见问题

### Q: Token 过期怎么办？

使用 Refresh Token 刷新：

```javascript
POST /api/auth/refresh
{ "refreshToken": "xxx" }
```

> ⚠️ 注意：刷新后必须保存新的 `refreshToken`，旧的已失效

### Q: 如何支持多设备登录？

每次登录会生成新的 Refresh Token，单用户最多支持 5 个活跃设备。

### Q: 如何注销所有设备？

调用登出接口时传入 `userId` 而不是 `refreshToken`：

```javascript
POST /api/auth/logout
{ "userId": "xxx" }
```

### Q: 邮件发送失败怎么办？

1. 检查 SMTP 配置是否正确
2. 开发环境推荐使用 [MailHog](https://github.com/mailhog/MailHog)
3. 邮件发送失败时，用户创建会回滚，可以重新注册

---

## 📄 License

MIT

---

**Made with ❤️ by AuthCore Team**
