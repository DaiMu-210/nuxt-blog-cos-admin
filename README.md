# Nuxt 博客（本地 /admin + 静态部署到 COS）

特性：

- 文章内容为 `content/posts/**/*.md`
- 前台页面
  - `/`：文章列表
  - `/posts/:slug`：文章详情
- 本地管理端（仅开发环境可用）
  - `/admin`：文章列表 / 新建 / 编辑（所见即所得）
- 静态产物导出到 `dist/`（用于对象存储部署）
- 提供 `.cnb.yml` 示例：push 后自动 build + 上传到腾讯云 COS

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Desktop（Electron / Windows）

桌面模式会自动注入 `NUXT_DESKTOP=1`，用于放开 /admin 与本地写文件能力（仅桌面/本地使用，线上静态部署不受影响）。

### 桌面开发运行

```bash
pnpm desktop:dev
```

如果 `pnpm install` 后 Electron 未正确下载（运行 `pnpm -s exec electron --version` 报错），可执行：

```bash
pnpm ignored-builds
```

如仍显示 `electron` / `electron-winstaller`，用镜像重建一次：

```bash
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
pnpm rebuild electron electron-winstaller
```

### 构建 Windows 可执行文件（portable）

会先执行 `nuxt build` 生成 `.output/`，再打包 Electron：

```bash
pnpm desktop:build
```

产物默认输出到 `dist-electron/`。

### 数据目录与备份

- 本地私有配置：开发环境默认写入项目 `.data/local-config.json`；桌面应用运行时写入用户数据目录的 `.data/local-config.json`
- 建议定期备份：`content/`（文章/站点内容）与本地私有配置文件

### 本地编辑文章

启动开发服务器后，访问：

- `http://localhost:3000/admin/setup`（首次使用需要初始化）
- `http://localhost:3000/admin/login`（初始化后登录）

管理端会直接读写项目里的 `content/posts/*.md` 文件。

首次初始化会将管理员配置写入项目根目录的 `.data/local-config.json`（已在 `.gitignore` 中忽略）。
之后登录使用初始化时设置的密码。

可选环境变量（用于 RSS 等需要绝对链接的功能）：

```powershell
$env:NUXT_PUBLIC_SITE_URL="https://your-domain.com"
# 可选：评论仓库（owner/repo），用于 beaudar
$env:NUXT_PUBLIC_BEAUDAR_REPO="owner/repo"
# 可选：评论主题（默认 github-light）
$env:NUXT_PUBLIC_BEAUDAR_THEME="github-light"
pnpm dev
```

### 评论（beaudar）

1. 确保评论仓库为公开仓库，且开启 Issues
2. 在本地控制台 `站点设置` 中配置：

- 评论仓库（Beaudar，owner/repo）
- 评论主题

  3)（可选）也可以用环境变量作为兜底（适合 CI/CD 构建阶段注入）：

```powershell
$env:NUXT_PUBLIC_BEAUDAR_REPO="owner/repo"
$env:NUXT_PUBLIC_BEAUDAR_THEME="github-light"
```

文章详情页将自动加载评论区；按页面路径（`pathname`）关联对应 issue。
如果你在本地开发环境测试评论发布，可能需要在评论仓库中配置 `beaudar.json` 允许 `http://localhost:3000`（或实际端口）的来源。

### RSS 订阅

访问：

- `http://localhost:3000/rss.xml`

静态部署时会在构建阶段预渲染 `rss.xml`。建议配置：

```powershell
$env:NUXT_PUBLIC_SITE_URL="https://your-domain.com"
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

### 生成静态站点（产物在 dist/）

```bash
pnpm run generate:dist
```

### 本地发布到 COS（无需 CNB）

你可以在本机直接构建并同步到 COS 桶根目录（默认带 `--delete`，会删除桶内多余文件，请确保该桶根目录只用于本站点）。

需要配置环境变量：

- `COS_BUCKET`：例如 `examplebucket-1250000000`
- `COS_REGION`：例如 `ap-guangzhou`
- `COS_SECRET_ID`
- `COS_SECRET_KEY`

执行发布（会先运行 `generate:dist` 生成 `dist/`）：

```bash
pnpm run deploy:cos
```

coscli 获取策略：

- 若你本机已安装 `coscli` 且在 PATH 中，脚本会直接使用。
- 若未安装，可设置 `COSCLI_PATH` 指向本机的 coscli 可执行文件。
- 若以上都没有，脚本会尝试自动下载 coscli；如遇到网络/证书/文件名变化问题，可用 `COSCLI_DOWNLOAD_URL` 指定下载地址。

### CNB.cool 自动部署到 COS

仓库根目录已包含 `.cnb.yml`，你需要在 CNB 的变量/密钥中配置以下环境变量：

- `COS_BUCKET`：例如 `examplebucket-1250000000`
- `COS_REGION`：例如 `ap-guangzhou`
- `COS_SECRET_ID`
- `COS_SECRET_KEY`

流水线会执行：

1. `pnpm install`
2. `pnpm run generate:dist`（生成 `dist/`）
3. 使用 COSCLI 将 `dist/` 同步到 `cos://${COS_BUCKET}/`（带 `--delete`）

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
