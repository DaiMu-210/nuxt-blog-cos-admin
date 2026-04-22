# 桌面化控制台 + COS 一键发布 Spec

## Why
目前本项目的“写文件 / 登录鉴权 / 发布到 COS”依赖本地手工编辑环境变量与命令行流程（或 CNB），上手成本高且不利于非开发者使用。需要把“本地 CMS + 发布器”产品化为可安装的桌面应用，并把关键配置与发布操作集中到控制台。

## What Changes
- 新增桌面应用（Electron，仅 Windows）作为本项目的“本地 CMS + 发布器”壳
- 新增首次启动初始化向导：创建管理员密码并生成会话密钥与默认 TTL
- 新增“用户配置”页：管理登录/会话参数与 COS 发布参数（与“站点设置”区分）
- 新增“发布到 COS”一键操作：在控制台点击触发静态构建并同步到 COS
- 修复首页用户卡片昵称显示错误：应使用“昵称”，而不是“网站标题”

## Impact
- Affected specs: 本地控制台可用性 | 站点数据模型 | 本地凭据存储 | 静态构建与发布 | 桌面打包与运行时
- Affected code:
  - 鉴权：`server/utils/admin-auth.ts`、`server/middleware/admin-auth.ts`、`server/api/admin/auth/*`
  - 本地写文件开关：`server/utils/admin-content.ts`、`app/middleware/admin-dev-only.ts`
  - 控制台 UI：`app/layouts/admin.vue`、`app/pages/admin/*`
  - 站点展示：`app/pages/index.vue`、`app/layouts/default.vue`
  - COS 发布脚本：`scripts/deploy-cos.mjs`、`scripts/ensure-coscli.mjs`
  - 新增：本地配置读写模块、发布 API、Electron 主进程与打包配置

## ADDED Requirements

### Requirement: Desktop App (Electron)
系统 SHALL 提供一个 Windows 桌面应用，用于在本地运行控制台并执行静态构建与发布。

#### Scenario: Launch
- **WHEN** 用户启动桌面应用
- **THEN** 应启动本地服务（用于控制台/API/读写 content 文件）
- **AND** 自动打开一个应用窗口加载控制台页面

### Requirement: First-run Admin Setup
系统 SHALL 在首次启动（未初始化管理员配置时）提供初始化向导来创建管理员密码。

#### Scenario: Setup Success
- **GIVEN** 管理员配置不存在
- **WHEN** 用户在初始化向导中输入新密码并确认
- **THEN** 系统保存管理员密码的安全摘要（不可明文存储）
- **AND** 生成 `NUXT_ADMIN_SESSION_SECRET`：`<timestamp><randomLetters8>`（8 位随机字母，大小写均可）
- **AND** 设置默认 `NUXT_ADMIN_SESSION_TTL_SECONDS = 604800`（一周）
- **AND** 初始化完成后用户可进入登录页并登录

### Requirement: User Settings vs Site Settings
系统 SHALL 将“用户配置（本地）”与“站点配置（站点内容）”在控制台中区分展示与保存。

#### Scenario: Separate Panels
- **WHEN** 用户进入控制台
- **THEN** 可分别进入：
  - “站点设置”：写入 `content/site.json`（可随静态站点发布）
  - “用户设置”：写入本地私有配置文件（不进入静态产物、不提交 git）

### Requirement: COS Config + One-click Deploy
系统 SHALL 支持在控制台配置 COS 参数并一键发布到 COS。

#### Scenario: Configure COS
- **WHEN** 用户在“用户设置”中填写 COS_BUCKET/COS_REGION/COS_SECRET_ID/COS_SECRET_KEY 并保存
- **THEN** 系统将配置保存到本地私有配置文件

#### Scenario: Deploy to COS
- **GIVEN** 用户已登录且 COS 参数已配置
- **WHEN** 用户点击“发布到 COS”
- **THEN** 系统执行静态构建（生成 `dist/`）
- **AND** 使用 coscli 同步 `dist/` 到 `cos://<bucket>/`（桶根目录），包含 `--delete`
- **AND** 在 UI 中展示执行状态（成功/失败）与错误信息（不得泄露密钥）

## MODIFIED Requirements

### Requirement: Admin Auth Configuration Source
原本依赖环境变量 `NUXT_ADMIN_PASSWORD/NUXT_ADMIN_SESSION_SECRET/NUXT_ADMIN_SESSION_TTL_SECONDS` 的鉴权逻辑 SHALL 支持优先读取本地私有配置；未初始化时进入初始化向导。

### Requirement: Admin Availability Gate
原本仅 dev 可用的 /admin 与写文件能力 SHALL 在“桌面模式”下可用；静态站点部署到 COS 后仍不暴露任何 /admin 与 /api 能力。

## REMOVED Requirements
无。

