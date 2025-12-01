import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * 生成 RSA 密钥对
 * 用于 JWT Token 的签名和验证
 */

const KEYS_DIR = path.join(__dirname, '../../keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.key');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public.key');

function generateKeys(): void {
  console.log('🔑 开始生成 RSA 密钥对...\n');

  // 确保 keys 目录存在
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
    console.log('✅ 创建 keys 目录');
  }

  // 生成密钥对
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  // 保存私钥
  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 });
  console.log('✅ 私钥已保存:', PRIVATE_KEY_PATH);
  console.log('   权限: 600 (仅所有者可读写)');

  // 保存公钥
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKey, { mode: 0o644 });
  console.log('✅ 公钥已保存:', PUBLIC_KEY_PATH);
  console.log('   权限: 644 (所有者可读写，其他人只读)');

  console.log('\n🎉 密钥对生成成功！\n');
  console.log('⚠️  安全提示：');
  console.log('   1. private.key 是私钥，绝对不能泄露或提交到 Git');
  console.log('   2. public.key 是公钥，可以分发给业务系统');
  console.log('   3. 已添加到 .gitignore，请勿手动修改');
  console.log('   4. 生产环境建议使用环境变量或密钥管理服务\n');
}

// 如果直接运行此文件
if (require.main === module) {
  generateKeys();
}

export default generateKeys;