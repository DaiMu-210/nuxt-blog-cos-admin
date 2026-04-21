# 计划：本地静态构建并发布到腾讯云 COS（绕过 CNB）

## Summary
为当前 Nuxt 静态博客增加“本地一键发布到腾讯云 COS”的能力：在本机运行脚本即可完成 **静态构建（dist/）** 与 **coscli 同步上传**，不再依赖 CNB 的构建流水线；同时保留现有 `.cnb.yml` 作为可选 CI。

## Current State Analysis
已存在的能力与入口：
- 已支持本地生成静态站点：`pnpm run generate:dist`（`nuxt generate` 产物在 `.output/public`，再复制到 `dist/`）
  - 脚本：`scripts/export-dist.mjs`
  - npm scripts：`package.json` 中的 `generate:dist`
- 已存在 CNB → COS 发布链路：`.cnb.yml` 中使用 `coscli sync ./dist cos://$COS_BUCKET/ -r --delete ...`
- 静态生成范围已明确排除本地管理端与 API（避免静态部署时生成 `/admin` 与 `/api`）
  - `nuxt.config.ts` 中的 `routeRules` 与 `nitro.prerender.ignore`

当前缺口：
- 缺少“本地发布到 COS”的脚本与配置文档（现在只能走 CNB，或用户手工安装/执行 coscli 命令）。

## Decisions (已由用户确认)
- **部署路径**：同步到 COS 桶根目录（`cos://<bucket>/`）
- **删除策略**：默认启用 `--delete`（保证桶内容与 dist 完全一致）
- **coscli 策略**：两者兼容（优先使用本机已安装的 coscli；找不到则尝试自动下载）

## Proposed Changes

### 1) 新增本地发布脚本（生成 dist + 同步到 COS）
**新增文件**
- `scripts/deploy-cos.mjs`

**行为**
- 校验必需环境变量（缺失时给出清晰错误信息，不打印 secret）：
  - `COS_BUCKET`（examplebucket-1250000000）
  - `COS_REGION`（ap-guangzhou）
  - `COS_SECRET_ID`
  - `COS_SECRET_KEY`
- 执行 `pnpm run generate:dist` 生成 `dist/`（复用现有脚本链路）
- 执行 coscli 同步（与 `.cnb.yml` 对齐）：
  - `coscli sync ./dist "cos://${COS_BUCKET}/" -r --delete --init-skip=true -i "${COS_SECRET_ID}" -k "${COS_SECRET_KEY}" -e "cos.${COS_REGION}.myqcloud.com"`

**安全性约束**
- 不在日志中输出 `COS_SECRET_ID` / `COS_SECRET_KEY`
- 失败时只输出 coscli 的 exit code 与必要的提示

### 2) 新增“获取/定位 coscli”的兼容逻辑
**新增文件**
- `scripts/ensure-coscli.mjs`

**行为（按优先级）**
1. 若设置 `COSCLI_PATH`，且文件存在：直接使用该路径
2. 若系统 PATH 中存在 `coscli`（Windows 同时尝试 `coscli.exe`）：直接使用
3. 否则自动下载到项目缓存目录（例如 `.cache/coscli/`）并使用：
   - 默认下载源使用与 `.cnb.yml` 同一域名（`cosbrowser.cloud.tencent.com/software/coscli/`）
   - 按 `process.platform`/`process.arch` 选择文件名；若无法确定准确文件名，则实现“候选 URL 逐个尝试”的策略
   - 支持通过 `COSCLI_DOWNLOAD_URL` 覆盖下载地址（用于应对域名/证书/文件名变更）

**注**
- 自动下载只作为兜底；用户选择“两者兼容”后，大部分情况下本机安装即可直接发布。

### 3) npm scripts：提供一条命令完成发布
**修改文件**
- `package.json`

**新增 scripts**
- `deploy:cos`: `node scripts/deploy-cos.mjs`
- （可选）`deploy:cos:dist`: 仅上传 `dist/`（不触发 generate），便于你自己控制构建步骤

### 4) 文档与示例环境变量
**修改文件**
- `README.md`
  - 新增“本地发布到 COS（无需 CNB）”章节
  - 说明前置条件（bucket 已开通静态网站、域名/CDN 可选）
  - 给出 Windows PowerShell 示例（设置环境变量 → `pnpm run deploy:cos`）
  - 提醒 `--delete` 的风险：确保桶根目录只用于此站点
- `.env.example`
  - 增加以下占位项（留空，不提交真实密钥）：
    - `COS_BUCKET=`
    - `COS_REGION=`
    - `COS_SECRET_ID=`
    - `COS_SECRET_KEY=`
    - `COSCLI_PATH=`（可选）
    - `COSCLI_DOWNLOAD_URL=`（可选）

## Verification Steps
1. `pnpm run generate:dist`
   - 期望：生成 `dist/`，包含前台页面与 `rss.xml`，且不包含 `/admin`、`/api` 相关输出
2. `pnpm run deploy:cos`（不设置 env）
   - 期望：脚本快速失败并提示缺失哪些变量（不泄露任何敏感信息）
3. `pnpm run deploy:cos`（设置完整 COS_*）
   - 期望：成功同步 `dist/` 到 `cos://<bucket>/`
4. 手工抽查 COS：
   - 访问首页与任意文章页正常
   - `rss.xml` 可访问且链接为绝对链接（建议配置 `NUXT_PUBLIC_SITE_URL`）

## Out of Scope
- 不移除现有 `.cnb.yml`（继续保留作为 CI 方案）
- 不引入 GitHub Actions / 其它 CI（除非后续你明确要求）

