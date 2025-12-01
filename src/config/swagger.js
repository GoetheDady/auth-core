const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Swagger 配置
 */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AuthCore 统一认证中心 API',
      version: '1.0.0',
      description: '基于 Express + MongoDB + JWT RS256 的企业级统一认证解决方案',
      contact: {
        name: 'AuthCore Team',
        email: 'gedesiwen@qq.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '开发环境'
      },
      {
        url: 'http://localhost:3001',
        description: '测试环境'
      },
      {
        url: 'https://auth.gdsw.tech',
        description: '生产环境'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '在请求头中添加 JWT Token：Authorization: Bearer <token>'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '用户 ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '邮箱地址'
            },
            username: {
              type: 'string',
              description: '用户名'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'username', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
              description: '邮箱地址'
            },
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 20,
              example: 'johndoe',
              description: '用户名（3-20个字符，仅字母、数字、下划线）'
            },
            password: {
              type: 'string',
              minLength: 8,
              example: 'Password123',
              description: '密码（至少8个字符，必须包含字母和数字）'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['account', 'password'],
          properties: {
            account: {
              type: 'string',
              example: 'user@example.com',
              description: '账号（邮箱或用户名）'
            },
            password: {
              type: 'string',
              example: 'Password123',
              description: '密码'
            }
          }
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
              description: 'Refresh Token'
            }
          }
        },
        ResendVerificationRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
              description: '邮箱地址'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: '操作成功'
            }
          }
        },
        RegisterResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: '注册成功，请查收验证邮件'
            },
            userId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
              description: 'Access Token（15分钟有效期）'
            },
            refreshToken: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
              description: 'Refresh Token（7天有效期）'
            },
            expiresIn: {
              type: 'number',
              example: 900,
              description: 'Access Token 过期时间（秒）'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        RefreshTokenResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
              description: '新的 Access Token'
            },
            expiresIn: {
              type: 'number',
              example: 900,
              description: 'Access Token 过期时间（秒）'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: '错误信息'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string'
                  },
                  message: {
                    type: 'string'
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: '认证',
        description: '用户认证相关接口'
      },
      {
        name: '健康检查',
        description: '系统健康检查'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/app.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;

