# Git 多远程仓库配置指南

## 当前配置

- **GitHub**: `git@github.com:GoetheDady/auth-core.git`
- **Gitee**: 待配置

## 配置方法

### 方法 1：同时推送到两个仓库（推荐）

```bash
# 添加 Gitee 作为推送地址
git remote set-url --add --push origin git@gitee.com:你的用户名/仓库名.git

# 验证配置
git remote -v

# 推送（会自动推送到两个仓库）
git push origin main
```

### 方法 2：添加独立的 Gitee 远程

```bash
# 添加 Gitee 远程
git remote add gitee git@gitee.com:你的用户名/仓库名.git

# 推送时需要分别推送
git push origin main
git push gitee main
```

## 查看当前配置

```bash
# 查看所有远程仓库
git remote -v

# 查看 origin 的详细配置
git remote show origin
```

## 推送命令

### 方法 1（推荐）
```bash
# 一次推送，同时推送到 GitHub 和 Gitee
git push origin main
```

### 方法 2
```bash
# 需要分别推送
git push origin main
git push gitee main
```

## 注意事项

1. **首次推送 Gitee**：如果 Gitee 仓库是新建的，需要先推送一次
   ```bash
   git push gitee main
   ```

2. **SSH 密钥**：确保已配置 Gitee 的 SSH 密钥
   ```bash
   # 测试连接
   ssh -T git@gitee.com
   ```

3. **分支同步**：如果两个仓库的分支不一致，需要先同步
   ```bash
   # 推送所有分支
   git push gitee --all
   ```

## 移除 Gitee 远程（如果需要）

```bash
# 方法 1：移除推送地址
git remote set-url --delete --push origin git@gitee.com:你的用户名/仓库名.git

# 方法 2：移除独立远程
git remote remove gitee
```

