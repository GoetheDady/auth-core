# 错误处理和日志系统文档

## 目录

- [错误处理](#错误处理)
  - [自定义错误类](#自定义错误类)
  - [错误码](#错误码)
  - [错误工厂](#错误工厂)
  - [错误响应格式](#错误响应格式)
- [日志系统](#日志系统)
  - [日志级别](#日志级别)
  - [日志输出](#日志输出)
  - [结构化日志](#结构化日志)
  - [日志配置](#日志配置)
- [请求追踪](#请求追踪)
- [最佳实践](#最佳实践)

---

## 错误处理

### 自定义错误类

项目使用 `AppError` 类来处理所有业务错误，提供统一的错误格式和错误码。

```typescript
import { AppError, ErrorCode } from '../utils/AppError';

// 创建自定义错误
throw new AppError(
  '用户不存在',           // 错误消息
  404,                    // HTTP 状态码
  ErrorCode.USER_NOT_FOUND, // 错误码
  true,                   // 是否为操作性错误
  { userId: '123' }       // 额外详情（可选）
);
```

### 错误码

系统定义了以下错误码类别：

#### 通用错误 (1000-1999)
- `INTERNAL_ERROR` (1000) - 服务器内部错误
- `VALIDATION_ERROR` (1001) - 数据验证失败
- `NOT_FOUND` (1002) - 资源不存在
- `UNAUTHORIZED` (1003) - 未授权访问
- `FORBIDDEN` (1004) - 禁止访问
- `CONFLICT` (1005) - 资源冲突
- `BAD_REQUEST` (1006) - 错误的请求
- `TOO_MANY_REQUESTS` (1007) - 请求过于频繁

#### 认证相关错误 (2000-2999)
- `INVALID_CREDENTIALS` (2000) - 账号或密码错误
- `EMAIL_NOT_VERIFIED` (2001) - 邮箱未验证
- `EMAIL_ALREADY_EXISTS` (2002) - 邮箱已存在
- `USERNAME_ALREADY_EXISTS` (2003) - 用户名已存在
- `USER_NOT_FOUND` (2004) - 用户不存在
- `INVALID_TOKEN` (2005) - Token 无效
- `TOKEN_EXPIRED` (2006) - Token 已过期
- `REFRESH_TOKEN_INVALID` (2007) - Refresh Token 无效
- `VERIFICATION_TOKEN_INVALID` (2008) - 验证令牌无效
- `VERIFICATION_TOKEN_EXPIRED` (2009) - 验证令牌已过期

#### 邮件相关错误 (3000-3999)
- `EMAIL_SEND_FAILED` (3000) - 邮件发送失败
- `EMAIL_CONFIG_ERROR` (3001) - 邮件配置错误

#### 数据库相关错误 (4000-4999)
- `DATABASE_ERROR` (4000) - 数据库操作失败
- `DUPLICATE_KEY` (4001) - 重复键错误

### 错误工厂

使用 `ErrorFactory` 快速创建常见错误：

```typescript
import { ErrorFactory } from '../utils/AppError';

// 认证错误
throw ErrorFactory.invalidCredentials();
throw ErrorFactory.emailNotVerified();
throw ErrorFactory.userNotFound();

// 资源冲突
throw ErrorFactory.emailAlreadyExists('user@example.com');
throw ErrorFactory.usernameAlreadyExists('johndoe');

// 通用错误
throw ErrorFactory.badRequest('无效的参数');
throw ErrorFactory.notFound('资源不存在');
throw ErrorFactory.unauthorized();
```

### 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "success": false,
  "message": "用户不存在",
  "errorCode": 2004,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-12-01T10:00:00.000Z",
  "path": "/api/auth/login",
  "details": {
    "field": "email",
    "value": "user@example.com"
  },
  "stack": "Error: 用户不存在\n    at ..." // 仅开发环境
}
```

---

## 日志系统

### 日志级别

系统支持 5 个日志级别：

1. **DEBUG** (0) - 调试信息（仅开发环境）
2. **INFO** (1) - 一般信息
3. **SUCCESS** (2) - 成功操作
4. **WARN** (3) - 警告信息
5. **ERROR** (4) - 错误信息

### 日志输出

#### 基础日志

```typescript
import logger from '../utils/logger';

logger.debug('调试信息', { userId: '123' });
logger.info('用户访问了首页');
logger.success('用户注册成功');
logger.warn('检测到异常登录尝试');
logger.error('数据库连接失败', error);
```

#### 结构化日志

用于复杂的日志场景，输出 JSON 格式：

```typescript
import logger, { LogLevel } from '../utils/logger';

logger.logStructured(LogLevel.INFO, {
  type: 'user_action',
  action: 'login',
  userId: '123',
  ip: '192.168.1.1',
  timestamp: new Date().toISOString(),
  metadata: {
    userAgent: 'Mozilla/5.0...',
    location: 'Beijing'
  }
});
```

输出示例：
```json
{
  "timestamp": "2024-12-01T10:00:00.000Z",
  "level": "INFO",
  "type": "user_action",
  "action": "login",
  "userId": "123",
  "ip": "192.168.1.1",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "location": "Beijing"
  }
}
```

### 日志配置

通过环境变量配置日志行为：

```bash
# 日志级别
LOG_LEVEL=DEBUG

# 是否启用控制台输出
LOG_CONSOLE=true

# 是否启用文件输出
LOG_FILE=true

# 日志文件目录
LOG_DIR=logs

# 单个日志文件最大大小（MB）
LOG_MAX_FILE_SIZE=10

# 保留的日志文件数量
LOG_MAX_FILES=7
```

### 日志文件

日志文件按日期命名，自动轮转：

```
logs/
├── app-2024-12-01.log
├── app-2024-11-30.log
├── app-2024-11-29.log
└── ...
```

当日志文件超过最大大小时，会自动归档：

```
logs/
├── app-2024-12-01.log
├── app-2024-12-01-1733049600000.log  # 归档文件
└── ...
```

---

## 请求追踪

### 请求 ID

每个请求都会自动分配一个唯一的请求 ID（UUID），用于追踪整个请求生命周期。

#### 自动生成

```typescript
// 请求 ID 会自动添加到 req.id
app.use(requestIdMiddleware);

// 在路由中使用
router.get('/profile', (req, res) => {
  logger.info(`获取用户资料 - RequestID: ${req.id}`);
  // ...
});
```

#### 客户端传递

客户端可以通过请求头传递请求 ID（用于分布式追踪）：

```javascript
fetch('/api/auth/login', {
  headers: {
    'X-Request-ID': 'custom-request-id',
    // 或
    'X-Correlation-ID': 'custom-correlation-id'
  }
});
```

#### 响应头

服务器会在响应头中返回请求 ID：

```
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
```

### 日志追踪

所有日志都会包含请求 ID，方便追踪：

```json
{
  "timestamp": "2024-12-01T10:00:00.000Z",
  "level": "INFO",
  "type": "request_complete",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "path": "/api/auth/login",
  "statusCode": 200,
  "duration": "45ms"
}
```

---

## 最佳实践

### 1. 使用错误工厂

❌ **不推荐**：
```typescript
throw new Error('用户不存在');
```

✅ **推荐**：
```typescript
throw ErrorFactory.userNotFound();
```

### 2. 提供详细的错误信息

❌ **不推荐**：
```typescript
throw ErrorFactory.badRequest('错误');
```

✅ **推荐**：
```typescript
throw ErrorFactory.badRequest('邮箱格式不正确', {
  field: 'email',
  value: userInput,
  constraint: 'email format'
});
```

### 3. 区分操作性错误和程序性错误

**操作性错误**（预期的错误，如用户输入错误）：
```typescript
if (!user) {
  throw ErrorFactory.userNotFound(); // isOperational = true
}
```

**程序性错误**（非预期的错误，如数据库连接失败）：
```typescript
try {
  await db.connect();
} catch (error) {
  throw ErrorFactory.databaseError(); // isOperational = false
}
```

### 4. 使用结构化日志记录重要操作

```typescript
// 用户登录
logger.logStructured(LogLevel.INFO, {
  type: 'user_login',
  requestId: req.id,
  userId: user.id,
  username: user.username,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date().toISOString()
});
```

### 5. 敏感信息脱敏

❌ **不推荐**：
```typescript
logger.info('用户登录', { password: user.password });
```

✅ **推荐**：
```typescript
logger.info('用户登录', { 
  username: user.username,
  // 不记录密码
});
```

### 6. 错误日志包含上下文

```typescript
try {
  await sendEmail(user.email);
} catch (error) {
  logger.logStructured(LogLevel.ERROR, {
    type: 'email_send_failed',
    requestId: req.id,
    email: user.email,
    error: error.message,
    stack: error.stack
  });
  throw ErrorFactory.emailSendFailed();
}
```

### 7. 生产环境隐藏敏感信息

错误响应会根据环境自动调整：

- **开发环境**：返回完整的错误堆栈
- **生产环境**：隐藏错误堆栈和内部细节

### 8. 使用异步错误包装器

```typescript
import { asyncHandler } from '../middlewares/errorHandler';

// 自动捕获异步错误
router.post('/register', asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.json(result);
}));
```

---

## 监控和告警

### 日志查询

查看特定请求的所有日志：

```bash
grep "550e8400-e29b-41d4-a716-446655440000" logs/app-2024-12-01.log
```

查看错误日志：

```bash
grep '"level":"ERROR"' logs/app-2024-12-01.log
```

### 生产环境建议

1. **使用日志聚合服务**（如 ELK、Splunk、Datadog）
2. **设置错误告警**（如 Sentry、Rollbar）
3. **定期审查日志**
4. **监控错误率和响应时间**
5. **保留足够的日志历史**

---

## 示例代码

### 完整的错误处理示例

```typescript
import { ErrorFactory } from '../utils/AppError';
import logger, { LogLevel } from '../utils/logger';

export async function getUserProfile(userId: string, req: Request) {
  try {
    // 记录请求开始
    logger.logStructured(LogLevel.DEBUG, {
      type: 'get_user_profile_start',
      requestId: req.id,
      userId
    });

    // 查找用户
    const user = await User.findById(userId);
    
    if (!user) {
      throw ErrorFactory.userNotFound();
    }

    // 记录成功
    logger.logStructured(LogLevel.INFO, {
      type: 'get_user_profile_success',
      requestId: req.id,
      userId,
      username: user.username
    });

    return user;
  } catch (error) {
    // 记录错误
    logger.logStructured(LogLevel.ERROR, {
      type: 'get_user_profile_error',
      requestId: req.id,
      userId,
      error: error.message,
      stack: error.stack
    });

    throw error; // 重新抛出，由全局错误处理器处理
  }
}
```

---

## 总结

通过统一的错误处理和日志系统，我们实现了：

✅ 一致的错误响应格式  
✅ 详细的错误码和分类  
✅ 完整的请求追踪  
✅ 结构化的日志记录  
✅ 自动的日志轮转  
✅ 开发/生产环境区分  
✅ 易于监控和调试  

这些改进大大提升了系统的可维护性和可观测性。

