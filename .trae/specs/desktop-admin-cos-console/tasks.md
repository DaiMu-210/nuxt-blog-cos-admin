# Tasks

- [x] Task 1: 本地私有配置存储
  - [x] 新增本地私有配置文件位置与读写工具（默认放在项目 `.data/` 或桌面应用 userData）
  - [x] 定义本地配置结构：admin（密码摘要、session secret、ttl）+ cos（bucket/region/secretId/secretKey）
  - [x] 确保不会被静态产物导出、不会进入 git（利用现有 .gitignore 规则）

- [x] Task 2: 首次初始化向导（创建密码 + 生成会话参数）
  - [x] 新增“是否已初始化”检测逻辑（后端）
  - [x] 新增初始化 API：设置密码、生成 session secret、写入默认 TTL=604800
  - [x] 新增初始化页面 `/admin/setup`：未初始化时强制进入；已初始化时跳转登录

- [x] Task 3: 鉴权体系迁移到本地配置
  - [x] `server/utils/admin-auth.ts` 支持从本地配置读取 passwordHash/sessionSecret/ttl
  - [x] 登录接口改为校验摘要（timingSafeEqual），并支持修改密码
  - [x] 默认 TTL 改为一周（604800），并支持控制台修改

- [x] Task 4: 用户设置页（本地配置）
  - [x] 新增 `/admin/user`（或 `/admin/settings`）页面：会话 TTL、修改密码、COS 配置
  - [x] 新增对应 API：读取/保存用户配置（返回时对 secret 做掩码或不返回）
  - [x] 控制台侧边栏增加入口，并明确与“站点设置”区分

- [x] Task 5: COS 一键发布（控制台点击触发）
  - [x] 新增发布 API：仅管理员登录态可调用；仅允许本地/桌面模式运行
  - [x] 服务端执行：`generate:dist` + `coscli sync ./dist cos://bucket/ -r --delete ...`
  - [x] UI 展示：发布中/成功/失败；错误信息不包含密钥
  - [x] 复用或内嵌 `ensure-coscli` 能力（优先本机 coscli，找不到自动下载）

- [x] Task 6: 桌面模式开关与 Electron 封装（Windows）
  - [x] 定义“桌面模式”标识（例如 `NUXT_DESKTOP=1`），用于放开 admin-dev-only 与写文件能力
  - [x] 新增 Electron 主进程：启动本地 Nuxt server（生产使用 `.output/server/index.mjs`），打开窗口加载 `http://127.0.0.1:<port>/admin`
  - [x] 增加 Electron 开发/打包脚本（仅 Windows）
  - [x] 文档：桌面模式如何运行、如何构建 exe、数据目录与备份策略

- [x] Task 7: 修复首页昵称显示错误
  - [x] 首页用户卡片从站点配置中读取“昵称”字段而非“网站标题”
  - [x] 保持 header/footer 仍显示“网站标题”
  - [x] 回归检查：站点设置中“网站标题/昵称”分别影响正确位置

- [x] Task 8: 验证与回归
  - [x] 静态生成：`generate:dist` 仍可用，且不输出 /admin 与 /api
  - [x] 本地控制台：首次初始化 → 登录 → 修改 TTL → 退出登录 → TTL 生效
  - [x] COS 发布：无配置时报错提示；配置后可成功触发发布流程
  - [x] 桌面模式：启动后可正常进入控制台并完成发布

# Task Dependencies

- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1 and Task 3
- Task 5 depends on Task 1 and Task 4
- Task 6 depends on Task 2–5
- Task 7 independent
- Task 8 depends on Task 2–7
