const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * 生成 RSA 密钥对（用于 JWT RS256 签名）
 * - 生成 2048 位 RSA 密钥对
 * - 私钥：用于签名 JWT（仅认证中心使用）
 * - 公钥：用于验证 JWT（业务系统使用）
 */
function generateRSAKeyPair() {
  console.log('🔐 开始生成 RSA 密钥对...');

  // 生成密钥对
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // 确保 keys 目录存在
  const keysDir = path.join(__dirname, '../../keys');
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  // 保存私钥
  const privateKeyPath = path.join(keysDir, 'private.key');
  fs.writeFileSync(privateKeyPath, privateKey, 'utf8');
  console.log(`✅ 私钥已保存: ${privateKeyPath}`);

  // 保存公钥
  const publicKeyPath = path.join(keysDir, 'public.key');
  fs.writeFileSync(publicKeyPath, publicKey, 'utf8');
  console.log(`✅ 公钥已保存: ${publicKeyPath}`);

  console.log('\n🎉 RSA 密钥对生成完成！');
  console.log('\n⚠️  注意事项：');
  console.log('  1. private.key（私钥）仅用于认证中心，绝对不要泄露或提交到版本控制');
  console.log('  2. public.key（公钥）可以分发给所有业务系统用于验证 Token');
  console.log('  3. 私钥已自动加入 .gitignore，请勿删除该配置\n');
}

// 如果直接运行此脚本，则生成密钥对
if (require.main === module) {
  try {
    generateRSAKeyPair();
  } catch (error) {
    console.error('❌ 生成密钥对失败:', error.message);
    process.exit(1);
  }
}

module.exports = { generateRSAKeyPair };

