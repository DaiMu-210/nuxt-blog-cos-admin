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
# 可选：评论仓库（owner/repo），用于 utterances
$env:NUXT_PUBLIC_UTTERANCES_REPO="owner/repo"
# 可选：评论主题（默认 github-light）
$env:NUXT_PUBLIC_UTTERANCES_THEME="github-light"
pnpm dev
```

### 评论（utterances）

1) 在 GitHub 仓库安装 utterances App：<https://github.com/apps/utterances>
2) 确保该仓库开启 Issues
3) 配置环境变量：

```powershell
$env:NUXT_PUBLIC_UTTERANCES_REPO="owner/repo"
$env:NUXT_PUBLIC_UTTERANCES_THEME="github-light"
```

文章详情页将自动加载评论区；按页面路径（`pathname`）关联对应 issue。

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

1) `pnpm install`
2) `pnpm run generate:dist`（生成 `dist/`）
3) 使用 COSCLI 将 `dist/` 同步到 `cos://${COS_BUCKET}/`（带 `--delete`）

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
