# 📦 AuthCore 业务系统接入示例

这是一个完整的示例应用，演示如何将业务系统接入 AuthCore 认证中心。

## 🎯 示例内容

本示例包含：

- ✅ **JWT 验证中间件** - 完整的 Token 验证实现
- ✅ **受保护接口示例** - 用户资料、仪表盘、设置等
- ✅ **错误处理** - Token 过期、无效等场景处理
- ✅ **最佳实践** - 符合生产环境的代码规范

## 🚀 快速开始

### 前置要求

1. 认证中心已启动（端口 3000）
2. 项目根目录已生成 RSA 密钥对

### 1. 安装依赖

```bash
cd example
pnpm install
# 或
npm install
```

### 2. 确保公钥存在

公钥应该位于项目根目录的 `keys/public.key`。

如果不存在，在项目根目录运行：

```bash
npm run generate-keys
```

### 3. 启动示例应用

```bash
npm start
# 或开发模式（热重载）
npm run dev
```

应用将在 `http://localhost:3001` 启动。

## 📚 使用示例

### 1. 查看接口文档

访问首页查看所有可用接口：

```bash
curl http://localhost:3001/
```

### 2. 获取 Access Token

首先在认证中心登录获取 Token：

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "account": "user@example.com",
    "password": "Password123"
  }'
```

响应示例：

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
  "expiresIn": 900,
  "user": {
    "id": "...",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

### 3. 访问受保护接口

使用 Access Token 访问受保护接口：

```bash
# 获取用户资料
curl http://localhost:3001/api/profile \
  -H "Authorization: Bearer <your-access-token>"

# 获取仪表盘数据
curl http://localhost:3001/api/dashboard \
  -H "Authorization: Bearer <your-access-token>"

# 获取用户设置
curl http://localhost:3001/api/settings \
  -H "Authorization: Bearer <your-access-token>"
```

## 🔧 核心组件

### JWT 验证中间件

位置：`middleware/jwtVerify.js`

**功能：**
- 从请求头读取 Bearer Token
- 使用 RSA 公钥验证 Token 签名
- 验证 Token 的 issuer 和 audience
- 处理 Token 过期和无效情况
- 将用户信息注入到 `req.user`

**使用方法：**

```javascript
const jwtVerify = require('./middleware/jwtVerify');

// 必需认证
app.get('/api/profile', jwtVerify, (req, res) => {
  res.json({ user: req.user });
});

// 可选认证
app.get('/api/public', jwtVerify.jwtVerifyOptional, (req, res) => {
  if (req.user) {
    // 已登录用户
  } else {
    // 未登录用户
  }
});
```

**req.user 结构：**

```javascript
{
  userId: "507f1f77bcf86cd799439011",
  email: "user@example.com",
  username: "johndoe"
}
```

## 📝 接口说明

### 公开接口

#### GET `/`
首页，返回接口文档和使用说明。

#### GET `/health`
健康检查接口。

### 受保护接口（需要 Token）

#### GET `/api/profile`
获取用户资料和业务数据。

**请求头：**
```
Authorization: Bearer <access-token>
```

**响应：**
```json
{
  "success": true,
  "message": "获取用户资料成功",
  "user": {
    "userId": "...",
    "email": "user@example.com",
    "username": "johndoe"
  },
  "businessData": {
    "role": "member",
    "memberLevel": "gold",
    "points": 1580,
    "joinedAt": "2024-01-01",
    "lastLoginAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET `/api/dashboard`
获取用户仪表盘数据。

#### GET `/api/settings`
获取用户设置。

#### PUT `/api/settings`
更新用户设置。

## ⚠️ 错误处理

### Token 未提供

```json
{
  "success": false,
  "message": "未提供认证令牌"
}
```

### Token 格式错误

```json
{
  "success": false,
  "message": "认证令牌格式错误，应为: Bearer <token>"
}
```

### Token 已过期

```json
{
  "success": false,
  "message": "Token 已过期，请刷新",
  "code": "TOKEN_EXPIRED"
}
```

### Token 无效

```json
{
  "success": false,
  "message": "Token 无效",
  "code": "TOKEN_INVALID"
}
```

## 🔐 安全注意事项

1. **公钥路径**：确保公钥文件路径正确（`../../keys/public.key`）
2. **Token 验证**：始终验证 Token 的 issuer 和 audience
3. **错误信息**：生产环境不要暴露详细的错误信息
4. **HTTPS**：生产环境必须使用 HTTPS
5. **Token 存储**：前端应安全存储 Token（httpOnly cookie 或 secure storage）

## 📖 集成到你的项目

### 步骤 1：复制中间件

将 `middleware/jwtVerify.js` 复制到你的项目中。

### 步骤 2：安装依赖

```bash
npm install jsonwebtoken
```

### 步骤 3：配置公钥路径

根据你的项目结构调整公钥路径：

```javascript
const publicKeyPath = path.join(__dirname, '../../keys/public.key');
```

### 步骤 4：在路由中使用

```javascript
const jwtVerify = require('./middleware/jwtVerify');

app.get('/api/protected', jwtVerify, (req, res) => {
  // req.user 包含用户信息
  res.json({ user: req.user });
});
```

## 🎓 最佳实践

1. **中间件复用**：将 JWT 验证中间件封装为可复用的模块
2. **错误处理**：统一处理认证错误，返回一致的错误格式
3. **日志记录**：记录认证失败的情况，便于排查问题
4. **性能优化**：公钥只需读取一次，避免重复 I/O
5. **类型检查**：使用 TypeScript 可以获得更好的类型安全

## 📄 License

MIT

---

**更多信息请参考主项目 README：** [AuthCore 文档](../../README.md)

