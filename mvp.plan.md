# 统一认证中心 MVP 实施计划（支持双登录+邮箱验证）

## 1. 项目结构设计

```
authCore/                      # 认证中心主项目
├── src/
│   ├── config/               # 配置文件
│   │   ├── db.js            # MongoDB 连接配置
│   │   ├── jwt.js           # JWT 配置
│   │   ├── email.js         # 邮件服务配置（SMTP）
│   │   └── index.js         # 统一配置导出
│   ├── models/              # 数据模型
│   │   └── User.js          # 用户模型（邮箱、用户名、密码）
│   ├── routes/              # 路由
│   │   ├── auth.js          # 认证相关路由
│   │   └── index.js         # 路由汇总
│   ├── middlewares/         # 中间件
│   │   ├── errorHandler.js # 错误处理
│   │   └── validator.js     # 请求验证
│   ├── services/            # 业务逻辑
│   │   ├── authService.js   # 认证服务
│   │   ├── tokenService.js  # JWT Token 生成与验证
│   │   └── emailService.js  # 邮件发送服务
│   ├── utils/               # 工具函数
│   │   ├── generateKeys.js  # 生成 RSA 密钥对
│   │   └── logger.js        # 日志工具
│   └── app.js               # Express 应用入口
├── keys/                    # RSA 密钥对
│   ├── private.key          # 私钥（仅认证中心使用）
│   └── public.key           # 公钥（提供给业务系统）
├── views/                   # 邮件模板
│   └── verification-email.html  # 验证邮件 HTML 模板
├── example/                 # 业务系统接入示例
│   ├── middleware/
│   │   └── jwtVerify.js    # JWT 验证中间件
│   ├── app.js              # 示例业务系统
│   └── README.md           # 示例文档
├── package.json
├── .env.example            # 环境变量示例
└── README.md               # 接入文档
```

## 2. 核心功能实现

### 2.1 RSA 密钥对生成

创建 `src/utils/generateKeys.js`，使用 Node.js crypto 模块生成 RS256 密钥对（2048位），存储到 `keys/` 目录。

### 2.2 用户模型设计（支持双登录凭证）

**MongoDB Schema**（`src/models/User.js`）：
- `email`: String, unique, required（登录凭证1）
- `username`: String, unique, required（登录凭证2，用户自定义）
- `passwordHash`: String, required（bcrypt 加密）
- `isVerified`: Boolean, default: false（邮箱是否已验证）
- `verificationToken`: String（邮箱验证令牌）
- `verificationTokenExpires`: Date（验证令牌过期时间，24小时）
- `refreshTokens`: Array（存储有效的 refresh token 列表）
- `createdAt`: Date
- `updatedAt`: Date

**索引**：
- `email`: unique
- `username`: unique
- `verificationToken`: sparse（仅对未验证用户）

### 2.3 邮件服务配置

使用 `nodemailer` + SMTP 发送真实邮件：
- 支持主流邮件服务（SendGrid、阿里云、腾讯云、Gmail 等）
- 邮件模板使用 HTML（包含验证链接、品牌样式）
- 验证链接格式：`http://auth-domain/api/auth/verify?token=xxx`

### 2.4 认证接口（更新版）

**POST /api/auth/register**
- 输入：`{ email, username, password }`
- 验证：
  - 邮箱格式、邮箱唯一性
  - 用户名格式（3-20字符，字母数字下划线）、用户名唯一性
  - 密码强度（最少8位，包含字母+数字）
- 处理：
  1. bcrypt 加密密码
  2. 生成验证令牌（uuid v4）
  3. 存入数据库（`isVerified: false`）
  4. 发送验证邮件
- 返回：`{ success: true, message: "注册成功，请查收验证邮件" }`

**GET /api/auth/verify**
- 输入：URL 参数 `?token=xxx`
- 验证：检查 token 是否存在且未过期
- 处理：
  1. 设置 `isVerified: true`
  2. 清空 `verificationToken` 和 `verificationTokenExpires`
- 返回：重定向到登录页面或返回成功页面

**POST /api/auth/resend-verification**
- 输入：`{ email }`
- 验证：邮箱存在且未验证
- 处理：重新生成 token，发送邮件
- 返回：`{ success: true, message: "验证邮件已重新发送" }`

**POST /api/auth/login**
- 输入：`{ account, password }` （account 可以是 email 或 username）
- 验证：
  1. 检查是否已验证邮箱（`isVerified === true`）
  2. 匹配密码
- 处理：
  - 生成 **Access Token**（有效期15分钟，包含 userId, email, username）
  - 生成 **Refresh Token**（有效期7天，存入数据库）
  - 使用私钥签名 JWT（RS256）
- 返回：`{ accessToken, refreshToken, expiresIn: 900, user: { id, email, username } }`

**POST /api/auth/refresh**
- 输入：`{ refreshToken }`
- 验证：检查数据库中是否存在且有效
- 处理：生成新的 Access Token
- 返回：`{ accessToken, expiresIn: 900 }`

**POST /api/auth/logout**
- 输入：`{ refreshToken }`（可选）
- 处理：从数据库删除 refresh token
- 返回：`{ success: true }`

**GET /api/auth/public-key**
- 返回：公钥内容（供业务系统下载）

### 2.5 JWT Token 结构（更新版）

```json
{
  "userId": "user_id_from_mongodb",
  "email": "user@example.com",
  "username": "zhangsan",
  "iat": 1234567890,
  "exp": 1234568790
}
```

### 2.6 跨域支持

配置 CORS 中间件，支持：
- 允许的域名白名单（环境变量配置）
- 支持 Credentials（携带 Cookie）
- 预检请求处理

## 3. 业务系统接入

### 3.1 验证中间件

创建 `example/middleware/jwtVerify.js`：
- 从请求头 `Authorization: Bearer <token>` 提取 Token
- 使用公钥验证签名（`jsonwebtoken` 库）
- 验证成功后，将用户信息挂载到 `req.user`
- 验证失败返回 401 Unauthorized

### 3.2 示例业务系统

创建简单的 Express 应用：
- **GET /api/profile**：需要认证的接口示例
  - 使用 JWT 中间件
  - 返回：`{ userId: req.user.userId, username: req.user.username, businessData: "业务系统数据" }`
- **GET /health**：健康检查接口

### 3.3 接入文档

编写 `README.md`，说明：
1. 如何从认证中心获取公钥
2. 如何集成 JWT 验证中间件
3. 前端登录流程（跳转到认证中心 → 获取 Token → 携带 Token 访问业务接口）
4. Token 刷新流程
5. 跨域配置说明
6. 邮箱验证流程

## 4. 技术实现细节

### 依赖包：
- `express`: Web 框架
- `mongoose`: MongoDB ODM
- `bcrypt`: 密码加密
- `jsonwebtoken`: JWT 生成与验证
- `nodemailer`: 邮件发送
- `uuid`: 生成验证令牌
- `express-validator`: 请求验证
- `cors`: 跨域支持
- `dotenv`: 环境变量管理
- `helmet`: 安全头设置
- `express-rate-limit`: 限流

### 环境变量：
```
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
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
EMAIL_FROM=noreply@example.com

# 验证链接
VERIFY_URL_BASE=http://localhost:3000
```

### 安全措施：
- 密码使用 bcrypt（salt rounds: 10）
- 私钥文件加入 .gitignore
- Helmet 中间件防护常见攻击
- 请求验证（邮箱格式、密码强度、用户名格式）
- Rate limiting（防止暴力破解、邮件轰炸）
  - 登录：每 IP 每 15 分钟最多 5 次
  - 注册：每 IP 每小时最多 3 次
  - 重发验证邮件：每邮箱每 5 分钟最多 1 次

## 5. 测试验证

### 测试场景：
1. 注册流程：提交信息 → 收到邮件 → 点击验证链接 → 激活成功
2. 登录测试：使用邮箱登录、使用用户名登录
3. 未验证登录：验证前登录应被拒绝
4. 重发验证邮件功能
5. Token 刷新流程
6. 业务系统使用公钥验证 Token
7. 跨域请求测试

### 工具：
- Postman/Thunder Client 测试 API
- MailHog/Mailtrap（开发环境邮件测试工具）
- 两个不同端口启动认证中心和业务系统

## 6. 扩展性设计

虽然是 MVP 版本，但预留扩展接口：
- 用户模型预留 `profile` 字段（可存储基础信息）
- Token Service 支持自定义 payload
- 中间件支持可配置的验证策略
- 邮件服务抽象接口（可切换不同邮件提供商）

---

## 交付物

1. **认证中心**：完整的注册、登录、邮箱验证、Token 刷新功能
2. **双登录支持**：邮箱/用户名均可登录
3. **邮件服务**：真实 SMTP 邮件发送，HTML 模板
4. **业务系统示例**：展示如何集成 JWT 验证
5. **接入文档**：清晰的步骤说明和 API 文档
6. **环境配置示例**：`.env.example` 文件
7. **邮件测试工具配置**：开发环境使用 MailHog

