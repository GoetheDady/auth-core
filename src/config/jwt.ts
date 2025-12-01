import fs from 'fs';
import path from 'path';
import { JwtConfig } from '../types';

let privateKey: string;
let publicKey: string;

try {
  if (process.env.PRIVATE_KEY && process.env.PUBLIC_KEY) {
    privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
    publicKey = process.env.PUBLIC_KEY.replace(/\\n/g, '\n');
    console.log('✅ 从环境变量加载 RSA 密钥');
  } else {
    const privateKeyPath = process.env.PRIVATE_KEY_PATH || 
                          path.join(__dirname, '../../keys/private.key');
    const publicKeyPath = process.env.PUBLIC_KEY_PATH || 
                         path.join(__dirname, '../../keys/public.key');
    
    if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
      throw new Error('RSA 密钥文件不存在，请先运行: npm run generate-keys');
    }
    
    privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    console.log('✅ 从文件加载 RSA 密钥:', privateKeyPath);
  }
} catch (error) {
  console.error('❌ 读取 RSA 密钥失败:', (error as Error).message);
  console.error('提示：');
  console.error('  1. 本地开发：运行 npm run generate-keys');
  console.error('  2. 生产环境：设置环境变量 PRIVATE_KEY_PATH 和 PUBLIC_KEY_PATH');
  console.error('  3. 容器部署：设置环境变量 PRIVATE_KEY 和 PUBLIC_KEY');
  process.exit(1);
}

const jwtConfig: JwtConfig = {
  algorithm: 'RS256',
  privateKey,
  publicKey,
  accessTokenExpire: process.env.ACCESS_TOKEN_EXPIRE || '15m',
  refreshTokenExpire: process.env.REFRESH_TOKEN_EXPIRE || '7d',
  issuer: 'authCore',
  audience: 'authCore-api'
};

export default jwtConfig;