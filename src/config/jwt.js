const fs = require('fs');
const path = require('path');

/**
 * JWT 配置
 * - 使用 RS256 非对称加密算法
 * - 私钥用于签名（仅认证中心）
 * - 公钥用于验证（业务系统）
 * 
 * 密钥读取优先级：
 * 1. 环境变量 (PRIVATE_KEY / PUBLIC_KEY)
 * 2. 自定义路径 (PRIVATE_KEY_PATH / PUBLIC_KEY_PATH)
 * 3. 默认路径 (keys/private.key / keys/public.key)
 */

let privateKey, publicKey;

try {
  // 优先从环境变量读取（适合云服务和容器）
  if (process.env.PRIVATE_KEY && process.env.PUBLIC_KEY) {
    privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
    publicKey = process.env.PUBLIC_KEY.replace(/\\n/g, '\n');
    console.log('✅ 从环境变量加载 RSA 密钥');
  } else {
    // 从文件读取
    const privateKeyPath = process.env.PRIVATE_KEY_PATH || path.join(__dirname, '../../keys/private.key');
    const publicKeyPath = process.env.PUBLIC_KEY_PATH || path.join(__dirname, '../../keys/public.key');
    
    if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
      throw new Error('RSA 密钥文件不存在，请先运行: npm run generate-keys');
    }
    
    privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    console.log('✅ 从文件加载 RSA 密钥:', privateKeyPath);
  }
} catch (error) {
  console.error('❌ 读取 RSA 密钥失败:', error.message);
  console.error('提示：');
  console.error('  1. 本地开发：运行 npm run generate-keys');
  console.error('  2. 生产环境：设置环境变量 PRIVATE_KEY_PATH 和 PUBLIC_KEY_PATH');
  console.error('  3. 容器部署：设置环境变量 PRIVATE_KEY 和 PUBLIC_KEY');
  process.exit(1);
}

module.exports = {
  // JWT 算法
  algorithm: 'RS256',
  
  // 私钥（用于签名）
  privateKey,
  
  // 公钥（用于验证）
  publicKey,
  
  // Access Token 有效期（默认 15 分钟）
  accessTokenExpire: process.env.ACCESS_TOKEN_EXPIRE || '15m',
  
  // Refresh Token 有效期（默认 7 天）
  refreshTokenExpire: process.env.REFRESH_TOKEN_EXPIRE || '7d',
  
  // Token 签发者
  issuer: 'authCore',
  
  // Token 受众
  audience: 'authCore-api'
};

