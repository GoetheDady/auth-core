/**
 * 邮件服务配置
 * 支持 SMTP 协议发送邮件
 * 可配置主流邮件服务提供商（Gmail、SendGrid、阿里云、腾讯云等）
 */

module.exports = {
  // SMTP 服务器配置
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT) || 1025,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  },
  
  // 发件人信息
  from: process.env.EMAIL_FROM || 'noreply@authcore.local',
  
  // 验证链接基础 URL
  verifyUrlBase: process.env.VERIFY_URL_BASE || 'http://localhost:3000',
  
  // 邮件模板配置
  templates: {
    verification: {
      subject: '【AuthCore】邮箱验证',
      // 可以使用 HTML 模板文件，暂时使用内联 HTML
    }
  }
};

