import nodemailer from 'nodemailer';
import config from '../config';
import logger from '../utils/logger';

/**
 * 邮件服务
 * 负责发送各类邮件（验证邮件、密码重置等）
 */

// 创建邮件传输器
const transporter = nodemailer.createTransport(config.email.smtp);

/**
 * 验证邮件配置
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify();
    logger.success('邮件服务配置正确');
    return true;
  } catch (error: any) {
    logger.warn('邮件服务配置验证失败:', error.message);
    logger.warn('邮件功能可能无法正常工作，请检查 SMTP 配置');
    return false;
  }
}

/**
 * 生成验证邮件 HTML 内容
 * @param username - 用户名
 * @param verificationUrl - 验证链接
 * @returns HTML 内容
 */
function generateVerificationEmailHTML(username: string, verificationUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px 20px;
    }
    .content p {
      margin: 15px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: #667eea;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
    }
    .button:hover {
      background: #5568d3;
    }
    .footer {
      background: #f8f8f8;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #777;
    }
    .divider {
      border-top: 1px solid #eeeeee;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 AuthCore 认证中心</h1>
    </div>
    <div class="content">
      <p>您好，<strong>${username}</strong>！</p>
      <p>感谢您注册 AuthCore 认证中心。请点击下面的按钮验证您的邮箱地址：</p>
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">验证邮箱</a>
      </div>
      <div class="divider"></div>
      <p style="font-size: 14px; color: #666;">
        如果按钮无法点击，请复制以下链接到浏览器地址栏：
      </p>
      <p style="word-break: break-all; background: #f8f8f8; padding: 10px; border-radius: 4px; font-size: 12px;">
        ${verificationUrl}
      </p>
      <p style="font-size: 14px; color: #666;">
        ⏰ 此链接将在 <strong>24 小时</strong>后失效。
      </p>
      <p style="font-size: 14px; color: #666;">
        如果这不是您的操作，请忽略此邮件。
      </p>
    </div>
    <div class="footer">
      <p>此邮件由 AuthCore 认证中心自动发送，请勿回复。</p>
      <p>&copy; 2024 AuthCore. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 发送验证邮件
 * @param email - 收件人邮箱
 * @param username - 用户名
 * @param verificationToken - 验证令牌
 */
export async function sendVerificationEmail(
  email: string,
  username: string,
  verificationToken: string
): Promise<{ success: boolean; messageId: string }> {
  try {
    const verificationUrl = `${config.email.verifyUrlBase}/api/auth/verify?token=${verificationToken}`;
    
    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: config.email.templates.verification.subject,
      html: generateVerificationEmailHTML(username, verificationUrl)
    };
    
    const info = await transporter.sendMail(mailOptions);
    logger.success(`验证邮件已发送至: ${email} (MessageID: ${info.messageId})`);
    
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    logger.error('发送验证邮件失败:', error.message);
    throw new Error('邮件发送失败，请稍后重试');
  }
}

