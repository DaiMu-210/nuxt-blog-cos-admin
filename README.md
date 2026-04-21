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

### 本地编辑文章

启动开发服务器后，访问：

- `http://localhost:3000/admin/login`

管理端会直接读写项目里的 `content/posts/*.md` 文件。

在启动开发服务前，请先配置管理员密码（PowerShell 示例）：

```powershell
$env:NUXT_ADMIN_PASSWORD="请替换成强密码"
# 可选：会话签名密钥（不配置时默认使用 NUXT_ADMIN_PASSWORD）
$env:NUXT_ADMIN_SESSION_SECRET="请替换成另一个随机字符串"
# 可选：站点地址（用于 RSS 等需要绝对链接的功能）
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
