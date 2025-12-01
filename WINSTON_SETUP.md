# Winston 日志系统 - 快速设置指南

## 🚀 快速开始

### 1. 安装依赖

```bash
# 使用 npm
npm install winston winston-daily-rotate-file express-winston

# 或使用 pnpm（推荐）
pnpm install

# 安装类型定义
npm install --save-dev @types/winston @types/express-winston
```

### 2. 编译 TypeScript

```bash
npm run build
```

### 3. 启动应用

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## ✅ 验证安装

启动应用后，你应该看到：

### 控制台输出（彩色）

```
[2024-12-01 16:30:45] [info] AuthCore 认证中心已启动
[2024-12-01 16:30:45] [success] 邮件服务配置正确
[2024-12-01 16:30:46] [debug] Request started {"requestId":"...","method":"GET","url":"/api/health"}
```

### 文件输出（如果启用）

检查 `logs/` 目录：

```bash
ls -la logs/
```

应该看到：

```
logs/
├── app-2024-12-01.log
├── error-2024-12-01.log
├── exceptions-2024-12-01.log
└── rejections-2024-12-01.log
```

## 🎯 测试日志功能

### 测试 1：基础日志

```bash
# 启动应用
npm run dev

# 在另一个终端测试 API
curl http://localhost:3000/api/health
```

你应该在控制台看到彩色的请求日志。

### 测试 2：错误日志

```bash
# 触发一个错误（访问不存在的路由）
curl http://localhost:3000/api/nonexistent
```

你应该看到警告级别的日志（黄色）。

### 测试 3：文件日志

```bash
# 启用文件日志
export LOG_FILE=true

# 重启应用
npm run dev

# 发送几个请求
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health

# 查看日志文件
cat logs/app-$(date +%Y-%m-%d).log
```

### 测试 4：日志级别

```bash
# 设置为 info 级别（不显示 debug）
export LOG_LEVEL=info
npm run dev

# 设置为 debug 级别（显示所有）
export LOG_LEVEL=debug
npm run dev
```

### 测试 5：结构化日志

查看日志文件，应该看到 JSON 格式的日志：

```bash
cat logs/app-$(date +%Y-%m-%d).log | jq
```

输出示例：

```json
{
  "timestamp": "2024-12-01 16:30:45",
  "level": "info",
  "message": "Request completed",
  "service": "authcore",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "GET",
  "url": "/api/health",
  "statusCode": 200,
  "duration": "5ms"
}
```

## 🔧 配置

### 开发环境（.env）

```bash
NODE_ENV=development
LOG_LEVEL=debug
LOG_CONSOLE=true
LOG_FILE=false
```

### 生产环境（.env）

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

## 📊 功能对比

| 功能 | 之前 | Winston |
|------|------|---------|
| 控制台日志 | ✅ | ✅ |
| 文件日志 | ✅ | ✅ |
| 日志轮转 | ✅ 手动 | ✅ 自动 |
| 压缩归档 | ❌ | ✅ |
| 异常处理 | ⚠️ 部分 | ✅ 完整 |
| 多种传输 | ❌ | ✅ |
| 日志查询 | ❌ | ✅ |

## 🎨 代码示例

### 基础使用（无需修改现有代码）

```typescript
import logger from './utils/logger';

// 所有现有代码保持不变
logger.debug('调试信息');
logger.info('普通信息');
logger.success('成功信息');
logger.warn('警告信息');
logger.error('错误信息');
```

### 结构化日志

```typescript
import logger, { LogLevel } from './utils/logger';

logger.logStructured(LogLevel.INFO, {
  type: 'user_action',
  action: 'login',
  requestId: req.id,
  userId: user.id
});
```

### 高级用法

```typescript
import { winstonLogger } from './utils/logger';

// 创建子 logger
const authLogger = winstonLogger.child({ module: 'auth' });
authLogger.info('Auth module initialized');

// 直接使用 Winston API
winstonLogger.log('info', 'Custom message', { custom: 'data' });
```

## 🐛 故障排查

### 问题：依赖安装失败

**解决方案**：

```bash
# 清除缓存
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 问题：TypeScript 编译错误

**解决方案**：

```bash
# 检查类型定义
npm install --save-dev @types/winston @types/express-winston

# 重新编译
npm run build
```

### 问题：日志文件没有创建

**解决方案**：

1. 确认 `LOG_FILE=true`
2. 检查 `LOG_DIR` 目录权限
3. 查看控制台是否有错误信息

### 问题：日志没有颜色

**解决方案**：

- 控制台日志应该有颜色
- 文件日志不应该有颜色（这是正常的）
- 检查终端是否支持颜色（大多数现代终端都支持）

## 📚 更多信息

- 详细文档：`docs/WINSTON_MIGRATION.md`
- 错误处理：`docs/ERROR_HANDLING.md`
- 改进总结：`docs/IMPROVEMENTS_SUMMARY.md`

## ✅ 完成检查清单

- [ ] 依赖已安装
- [ ] TypeScript 编译成功
- [ ] 应用启动成功
- [ ] 控制台日志正常（带颜色）
- [ ] 文件日志正常（如果启用）
- [ ] 日志级别正确
- [ ] 请求 ID 显示正确
- [ ] 错误日志单独记录

## 🎉 完成！

Winston 日志系统已经成功集成！

**主要优势：**
- ✅ 生产级别的日志系统
- ✅ 自动日志轮转和压缩
- ✅ 完整的异常处理
- ✅ 向后兼容（无需修改现有代码）
- ✅ 丰富的功能和插件

如有问题，请查看 `docs/WINSTON_MIGRATION.md` 获取更多帮助。

