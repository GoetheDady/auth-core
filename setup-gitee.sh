#!/bin/bash

###############################################################################
# 配置 Git 同时推送到 GitHub 和 Gitee
###############################################################################

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}配置 Git 多远程推送...${NC}\n"

# 检查是否已配置 GitHub
if ! git remote get-url origin > /dev/null 2>&1; then
  echo "❌ 错误：未找到 origin 远程仓库"
  exit 1
fi

echo -e "${GREEN}当前远程仓库配置：${NC}"
git remote -v
echo ""

# 提示用户输入 Gitee 地址
read -p "请输入你的 Gitee 仓库地址（例如：git@gitee.com:username/repo.git）: " GITEE_URL

if [ -z "$GITEE_URL" ]; then
  echo "❌ 错误：Gitee 地址不能为空"
  exit 1
fi

# 添加 Gitee 作为推送地址
echo -e "\n${YELLOW}添加 Gitee 推送地址...${NC}"
git remote set-url --add --push origin "$GITEE_URL"

echo -e "\n${GREEN}✅ 配置完成！${NC}\n"
echo -e "${GREEN}当前远程仓库配置：${NC}"
git remote -v

echo -e "\n${YELLOW}使用说明：${NC}"
echo -e "  推送命令: ${GREEN}git push origin <branch>${NC}"
echo -e "  这将同时推送到 GitHub 和 Gitee\n"

