# Winston 日志系统迁移指南

## 📦 安装依赖

首先安装 Winston 相关依赖：

```bash
# 使用 npm
npm install winston winston-daily-rotate-file express-winston

# 或使用 pnpm
pnpm add winston winston-daily-rotate-file express-winston

# 安装类型定义
npm install --save-dev @types/winston @types/express-winston
```

## ✨ 新功能

### 1. Winston 核心功能

- ✅ **多种传输方式**：控制台、文件、HTTP 等
- ✅ **日志轮转**：自动按日期和大小轮转日志文件
- ✅ **压缩归档**：自动压缩旧日志文件
- ✅ **灵活格式化**：JSON、文本、自定义格式
- ✅ **多个 logger 实例**：不同模块使用不同配置
- ✅ **异常处理**：自动捕获未捕获的异常和 Promise 拒绝

### 2. Express Winston 中间件

- ✅ **自动请求日志**：记录所有 HTTP 请求
- ✅ **自动错误日志**：记录所有 HTTP 错误
- ✅ **动态元数据**：请求 ID、IP、User-Agent 等
- ✅ **状态码级别映射**：根据状态码自动选择日志级别
- ✅ **敏感信息过滤**：自动过滤密码、token 等

## 🔄 迁移步骤

### 步骤 1：安装依赖

```bash
npm install winston winston-daily-rotate-file express-winston
npm install --save-dev @types/winston @types/express-winston
```

### 步骤 2：编译 TypeScript

```bash
npm run build
```

### 步骤 3：更新环境变量

在 `.env` 文件中添加或更新日志配置：

```bash
# 日志级别
LOG_LEVEL=debug

# 控制台输出
LOG_CONSOLE=true

# 文件输出
LOG_FILE=true

# 日志目录
LOG_DIR=logs

# 文件大小限制（支持 k, m, g）
LOG_MAX_FILE_SIZE=20m

# 保留时间（支持天数 'd' 或数字）
LOG_MAX_FILES=14d

# 是否压缩归档
LOG_ZIPPED=true

# 日期格式
LOG_DATE_PATTERN=YYYY-MM-DD
```

### 步骤 4：测试日志系统

启动应用：

```bash
npm run dev
```

检查日志输出：

1. **控制台输出**：应该看到彩色的日志
2. **文件输出**：检查 `logs/` 目录是否有日志文件

## 📝 使用方法

### 基础日志（向后兼容）

```typescript
import logger from './utils/logger';

// 基础日志方法（保持不变）
logger.debug('调试信息');
logger.info('普通信息');
logger.success('成功信息');
logger.warn('警告信息');
logger.error('错误信息');

// 带对象的日志
logger.info('用户登录', { userId: '123', username: 'testuser' });
logger.error('数据库错误', { error: err.message, stack: err.stack });
```

### 结构化日志（保持不变）

```typescript
import logger, { LogLevel } from './utils/logger';

logger.logStructured(LogLevel.INFO, {
  type: 'user_action',
  action: 'login',
  requestId: req.id,
  userId: user.id,
  ip: req.ip
});
```

### Express Winston 中间件（可选）

如果想使用 Express Winston 的自动日志记录，可以在 `app.ts` 中添加：

```typescript
import { requestLogger, errorLogger } from './middlewares/winstonMiddleware';

// 在路由之前添加请求日志中间件
app.use(requestLogger);

// 在路由之后、错误处理之前添加错误日志中间件
app.use(errorLogger);
```

**注意**：当前项目已经有自定义的日志中间件，Express Winston 是可选的。

### 高级用法：直接使用 Winston 实例

```typescript
import { winstonLogger } from './utils/logger';

// 直接使用 Winston 的所有功能
winstonLogger.log('info', 'Custom log', { custom: 'data' });

// 添加子 logger
const childLogger = winstonLogger.child({ module: 'auth' });
childLogger.info('Auth module log');

// 查询日志（需要额外配置）
winstonLogger.query({ limit: 10 }, (err, results) => {
  console.log(results);
});
```

## 📊 日志文件结构

Winston 会创建以下日志文件：

```
logs/
├── app-2024-12-01.log          # 所有级别的日志
├── app-2024-12-01.log.gz       # 压缩的归档文件
├── error-2024-12-01.log        # 仅错误日志
├── error-2024-12-01.log.gz     # 压缩的错误日志
├── exceptions-2024-12-01.log   # 未捕获的异常
└── rejections-2024-12-01.log   # 未处理的 Promise 拒绝
```

## 🎯 日志级别说明

Winston 使用以下日志级别（从高到低）：

1. **error** (0) - 错误信息
2. **warn** (1) - 警告信息
3. **success** (2) - 成功信息（自定义）
4. **info** (3) - 一般信息
5. **debug** (4) - 调试信息

设置 `LOG_LEVEL=info` 会记录 error、warn、success、info 级别的日志，但不记录 debug。

## 🔍 日志格式

### 控制台格式（彩色，易读）

```
[2024-12-01 16:30:45] [info] [550e8400-e29b-41d4-a716-446655440000] User logged in {"userId":"123"}
```

### 文件格式（JSON，便于分析）

```json
{
  "timestamp": "2024-12-01 16:30:45",
  "level": "info",
  "message": "User logged in",
  "service": "authcore",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "123"
}
```

## 🛠️ 配置选项

### 环境变量完整列表

| 变量 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `LOG_LEVEL` | 日志级别 | `debug` (开发) / `info` (生产) | `debug`, `info`, `warn`, `error` |
| `LOG_CONSOLE` | 控制台输出 | `true` | `true`, `false` |
| `LOG_FILE` | 文件输出 | `false` (开发) / `true` (生产) | `true`, `false` |
| `LOG_DIR` | 日志目录 | `logs` | `logs`, `/var/log/authcore` |
| `LOG_MAX_FILE_SIZE` | 文件大小限制 | `20m` | `10m`, `50m`, `100m` |
| `LOG_MAX_FILES` | 保留时间/数量 | `14d` | `7d`, `30d`, `10` |
| `LOG_ZIPPED` | 压缩归档 | `false` (开发) / `true` (生产) | `true`, `false` |
| `LOG_DATE_PATTERN` | 日期格式 | `YYYY-MM-DD` | `YYYY-MM-DD-HH` |

### 不同环境的推荐配置

#### 开发环境

```bash
NODE_ENV=development
LOG_LEVEL=debug
LOG_CONSOLE=true
LOG_FILE=false
```

#### 测试环境

```bash
NODE_ENV=test
LOG_LEVEL=info
LOG_CONSOLE=true
LOG_FILE=true
LOG_DIR=logs
LOG_MAX_FILE_SIZE=10m
LOG_MAX_FILES=7d
```

#### 生产环境

```bash
NODE_ENV=production
LOG_LEVEL=info
LOG_CONSOLE=true
LOG_FILE=true
LOG_DIR=/var/log/authcore
LOG_MAX_FILE_SIZE=50m
LOG_MAX_FILES=30d
LOG_ZIPPED=true
```

## 🔄 向后兼容性

所有现有的日志代码**无需修改**，Winston 实现完全兼容原有 API：

- ✅ `logger.debug()`, `logger.info()`, `logger.success()`, `logger.warn()`, `logger.error()`
- ✅ `logger.logStructured()`
- ✅ `LogLevel` 枚举
- ✅ 所有现有功能

## 🎨 Winston 的优势

### vs 自定义 Logger

| 功能 | 自定义 Logger | Winston |
|------|--------------|---------|
| 基础日志 | ✅ | ✅ |
| 文件输出 | ✅ | ✅ |
| 日志轮转 | ✅ 手动实现 | ✅ 内置 |
| 压缩归档 | ❌ | ✅ |
| 多种传输 | ❌ | ✅ |
| 异常处理 | ⚠️ 部分 | ✅ 完整 |
| 查询日志 | ❌ | ✅ |
| 社区支持 | ❌ | ✅ 活跃 |
| 插件生态 | ❌ | ✅ 丰富 |

### Winston 的额外功能

1. **多种传输方式**
   - 文件
   - 控制台
   - HTTP
   - 数据库（MongoDB, PostgreSQL 等）
   - 第三方服务（Loggly, Papertrail 等）

2. **高级功能**
   - 日志查询
   - 日志流
   - 子 logger
   - 自定义格式化
   - 自定义传输器

3. **生产就绪**
   - 经过大规模验证
   - 性能优化
   - 内存管理
   - 错误处理

## 🐛 故障排查

### 问题 1：日志文件没有创建

**解决方案**：
1. 检查 `LOG_FILE` 环境变量是否为 `true`
2. 检查 `LOG_DIR` 目录是否有写权限
3. 检查日志级别设置

### 问题 2：日志没有颜色

**解决方案**：
- 控制台日志应该有颜色
- 文件日志不应该有颜色（这是正常的）
- 检查终端是否支持颜色

### 问题 3：日志文件太大

**解决方案**：
- 调整 `LOG_MAX_FILE_SIZE`（如 `10m`）
- 调整 `LOG_MAX_FILES`（如 `7d`）
- 启用压缩：`LOG_ZIPPED=true`

### 问题 4：找不到旧日志

**解决方案**：
- 检查 `LOG_MAX_FILES` 设置
- 检查是否被自动删除
- 查看压缩的 `.gz` 文件

## 📚 更多资源

- [Winston 官方文档](https://github.com/winstonjs/winston)
- [Winston Daily Rotate File](https://github.com/winstonjs/winston-daily-rotate-file)
- [Express Winston](https://github.com/bithavoc/express-winston)

## ✅ 验证清单

迁移完成后，请验证：

- [ ] 依赖已安装
- [ ] TypeScript 编译成功
- [ ] 控制台日志正常显示（带颜色）
- [ ] 文件日志正常创建（如果启用）
- [ ] 日志轮转正常工作
- [ ] 错误日志单独记录
- [ ] 请求 ID 正确显示
- [ ] 现有代码无需修改

## 🎉 总结

Winston 迁移完成后，你将获得：

✅ 更强大的日志系统  
✅ 生产级别的可靠性  
✅ 丰富的插件生态  
✅ 完全向后兼容  
✅ 更好的性能  
✅ 更多的功能  

同时保持了所有现有代码的兼容性！

