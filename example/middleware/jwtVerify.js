const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

/**
 * JWT 验证中间件（业务系统使用）
 * 
 * 此中间件用于验证由 AuthCore 认证中心签发的 JWT Token。
 * 
 * 使用方法：
 * 1. 确保认证中心已生成密钥对（运行: npm run generate-keys）
 * 2. 公钥位于项目根目录的 keys/public.key
 * 3. 在需要认证的路由上使用此中间件
 * 
 * 示例：
 * const jwtVerify = require('./middleware/jwtVerify');
 * app.get('/api/profile', jwtVerify, (req, res) => {
 *   res.json({ user: req.user });
 * });
 */

// 读取公钥（从项目根目录的 keys 文件夹）
let publicKey;
try {
  // 公钥路径：项目根目录/keys/public.key
  const publicKeyPath = path.join(__dirname, '../../keys/public.key');
  publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  console.log('✅ JWT 公钥加载成功:', publicKeyPath);
} catch (error) {
  console.error('❌ 读取公钥失败:', error.message);
  console.error('\n请确保：');
  console.error('  1. 认证中心已生成密钥对: npm run generate-keys');
  console.error('  2. 公钥文件存在: keys/public.key');
  console.error('  3. 或从认证中心获取公钥:');
  console.error('     curl http://localhost:3000/api/auth/public-key > keys/public.key\n');
  process.exit(1);
}

/**
 * JWT 验证中间件
 */
function jwtVerify(req, res, next) {
  try {
    // 1. 从请求头获取 Token
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }
    
    // 2. 检查格式：Bearer <token>
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: '认证令牌格式错误，应为: Bearer <token>'
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

/**
 * 可选的认证中间件（Token 不存在时不报错，但会设置 req.user）
 */
function jwtVerifyOptional(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
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
    
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username
    };
    
    next();
    
  } catch (error) {
    req.user = null;
    next();
  }
}

module.exports = jwtVerify;
module.exports.jwtVerifyOptional = jwtVerifyOptional;

