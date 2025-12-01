#!/bin/bash

###############################################################################
# 密钥部署脚本
# 用于将密钥文件部署到生产环境的安全目录
###############################################################################

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
KEYS_DIR="/etc/authcore/keys"
PROJECT_KEYS_DIR="./keys"

echo -e "${YELLOW}🔐 开始部署密钥文件...${NC}\n"

# 1. 检查项目目录中的密钥文件是否存在
if [ ! -f "${PROJECT_KEYS_DIR}/private.key" ] || [ ! -f "${PROJECT_KEYS_DIR}/public.key" ]; then
  echo -e "${RED}❌ 错误：项目目录中找不到密钥文件！${NC}"
  echo -e "${YELLOW}请先运行: npm run generate-keys${NC}\n"
  exit 1
fi

# 2. 创建目标目录（需要 sudo 权限）
echo -e "${YELLOW}[1/4] 创建密钥目录...${NC}"
sudo mkdir -p "${KEYS_DIR}"

# 3. 复制密钥文件
echo -e "${YELLOW}[2/4] 复制密钥文件...${NC}"
sudo cp "${PROJECT_KEYS_DIR}/private.key" "${KEYS_DIR}/private.key"
sudo cp "${PROJECT_KEYS_DIR}/public.key" "${KEYS_DIR}/public.key"

# 4. 设置文件权限（私钥必须严格权限）
echo -e "${YELLOW}[3/4] 设置文件权限...${NC}"
sudo chmod 600 "${KEYS_DIR}/private.key"  # 只有所有者可读写
sudo chmod 644 "${KEYS_DIR}/public.key"   # 所有人可读

# 5. 设置文件所有者（根据实际情况修改用户名）
echo -e "${YELLOW}[4/4] 设置文件所有者...${NC}"
# 获取当前用户
CURRENT_USER=$(whoami)
sudo chown "${CURRENT_USER}:${CURRENT_USER}" "${KEYS_DIR}/private.key"
sudo chown "${CURRENT_USER}:${CURRENT_USER}" "${KEYS_DIR}/public.key"

echo -e "\n${GREEN}✅ 密钥文件部署完成！${NC}\n"
echo -e "${GREEN}密钥位置：${NC}"
echo -e "  私钥: ${KEYS_DIR}/private.key"
echo -e "  公钥: ${KEYS_DIR}/public.key"
echo -e "\n${YELLOW}⚠️  安全提示：${NC}"
echo -e "  1. 确保 .env 文件中配置了正确的密钥路径"
echo -e "  2. 私钥文件权限已设置为 600（仅所有者可读写）"
echo -e "  3. 不要将私钥提交到版本控制系统\n"

