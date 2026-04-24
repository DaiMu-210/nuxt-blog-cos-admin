import { createError } from 'h3';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { assertAdminEnabled } from './admin-content';
import { ensureCoscli } from './ensure-coscli';
import { readLocalConfig } from './local-config';

type PublishStatus = 'idle' | 'running' | 'success' | 'error';
type PublishStage = 'idle' | 'generating' | 'syncing' | 'done';

export type PublishJobPublic = {
  id: string;
  status: PublishStatus;
  stage: PublishStage;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  message?: string;
  logs: string[];
};

type PublishJobInternal = {
  id: string;
  status: PublishStatus;
  stage: PublishStage;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  message?: string;
  logs: string[];
};

type PublishStore = {
  current: PublishJobInternal | null;
};

function getStore(): PublishStore {
  const g = globalThis as any;
  if (!g.__nuxt_admin_publish_store) {
    g.__nuxt_admin_publish_store = { current: null } satisfies PublishStore;
  }
  return g.__nuxt_admin_publish_store as PublishStore;
}

function toPublic(job: PublishJobInternal): PublishJobPublic {
  return {
    id: job.id,
    status: job.status,
    stage: job.stage,
    createdAt: new Date(job.createdAt).toISOString(),
    startedAt: job.startedAt ? new Date(job.startedAt).toISOString() : undefined,
    finishedAt: job.finishedAt ? new Date(job.finishedAt).toISOString() : undefined,
    message: job.message,
    logs: job.logs.slice(-200),
  };
}

function normalizeLine(line: string) {
  return String(line || '')
    .replace(/\r/g, '')
    .trimEnd();
}

function sanitizeText(text: string, secrets: Array<string | undefined>) {
  let s = String(text || '');
  for (const secret of secrets) {
    const value = (secret || '').trim();
    if (!value) continue;
    s = s.split(value).join('***');
  }
  return s;
}

function pushLog(job: PublishJobInternal, line: string) {
  const next = normalizeLine(line);
  if (!next) return;
  job.logs.push(next);
  if (job.logs.length > 200) job.logs.splice(0, job.logs.length - 200);
}

async function fileExists(p: string) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function findInPath(names: string[]) {
  const pathValue = process.env.PATH || '';
  const parts = pathValue.split(process.platform === 'win32' ? ';' : ':').filter(Boolean);
  for (const dir of parts) {
    for (const name of names) {
      const candidate = resolve(dir, name);
      if (await fileExists(candidate)) return candidate;
    }
  }
  return '';
}

async function resolveAppRootForPublish() {
  const start = process.cwd();
  const candidates: string[] = [start];
  for (let i = 0; i < 12; i += 1) {
    candidates.push(resolve(candidates[candidates.length - 1]!, '..'));
  }

  const hasAny = async (dir: string, rels: string[]) => {
    for (const rel of rels) {
      if (await pathExists(resolve(dir, rel))) return true;
    }
    return false;
  };

  for (const dir of candidates) {
    if (await pathExists(resolve(dir, 'scripts', 'export-dist.mjs'))) return dir;
    if ((await hasAny(dir, ['nuxt.config.ts', 'nuxt.config.js'])) && (await pathExists(resolve(dir, 'app'))))
      return dir;
    if ((await pathExists(resolve(dir, 'package.json'))) && (await hasAny(dir, ['app', 'server', 'scripts'])))
      return dir;
  }

  return start;
}

function getDesktopDataDir() {
  const v = String(process.env.NUXT_DESKTOP_DATA_DIR || '').trim();
  return v ? resolve(v) : '';
}

async function pathExists(p: string) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

const PUBLISH_REQUIRED_DEPENDENCIES: Record<string, string> = {
  nuxt: '^4.4.2',
  '@nuxt/content': '^3.13.0',
  '@nuxtjs/tailwindcss': '7.0.0-beta.1',
  tailwindcss: '^4.2.2',
  '@tailwindcss/typography': '^0.5.19',
  vue: '^3.5.32',
  'vue-router': '^5.0.4',
  zod: '^4.3.6',
  'gray-matter': '^4.0.3',
  'highlight.js': '^11.11.1',
  'markdown-it': '^14.1.0',
  'markdown-it-task-lists': '^2.1.1',
  sortablejs: '^1.15.7',
  '@toast-ui/editor': '^3.2.2',
};

async function ensureWorkspacePackageJson(workspaceRoot: string, appRoot: string, job: PublishJobInternal) {
  const workspacePkgPath = resolve(workspaceRoot, 'package.json');
  const appPkgPath = resolve(appRoot, 'package.json');

  const readJson = async (p: string) => {
    try {
      const raw = await readFile(p, 'utf8');
      return JSON.parse(raw || '{}') as any;
    } catch {
      return null;
    }
  };

  const workspacePkg = (await readJson(workspacePkgPath)) || {};
  const appPkg = (await readJson(appPkgPath)) || {};
  const deps = (
    workspacePkg.dependencies && typeof workspacePkg.dependencies === 'object' ? workspacePkg.dependencies : {}
  ) as Record<string, string>;
  const appDeps = (appPkg.dependencies && typeof appPkg.dependencies === 'object' ? appPkg.dependencies : {}) as Record<
    string,
    string
  >;

  const appDevDeps = (
    appPkg.devDependencies && typeof appPkg.devDependencies === 'object' ? appPkg.devDependencies : {}
  ) as Record<string, string>;
  const getWantedVersion = (name: string) => {
    const v = String(
      deps[name] || appDeps[name] || appDevDeps[name] || PUBLISH_REQUIRED_DEPENDENCIES[name] || '',
    ).trim();
    return v || PUBLISH_REQUIRED_DEPENDENCIES[name] || '*';
  };

  let changed = false;
  const nextDeps: Record<string, string> = { ...deps };
  for (const name of Object.keys(PUBLISH_REQUIRED_DEPENDENCIES)) {
    if (!nextDeps[name]) {
      nextDeps[name] = getWantedVersion(name);
      changed = true;
    }
  }

  const nextPkg = changed
    ? {
        name: String(workspacePkg.name || appPkg.name || 'nuxt-blog-cos-admin-publish'),
        version: String(workspacePkg.version || appPkg.version || '0.0.0'),
        private: true,
        type: 'module',
        dependencies: nextDeps,
        scripts: {
          postinstall: 'nuxt prepare',
        },
      }
    : workspacePkg;

  if (changed || !(await pathExists(workspacePkgPath))) {
    pushLog(job, '工作区 package.json 不完整，已自动补齐构建所需 dependencies');
    await writeFile(workspacePkgPath, JSON.stringify(nextPkg, null, 2) + '\n', 'utf8');
  }
}

async function ensurePublishWorkspace(appRoot: string, desktopDataDir: string, job: PublishJobInternal) {
  const workspaceRoot = resolve(desktopDataDir || appRoot, '.publish-workspace');
  await mkdir(workspaceRoot, { recursive: true });

  const srcRoot = appRoot;
  const copyItems = [
    'app',
    'server',
    'scripts',
    'types',
    'content',
    'public',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'nuxt.config.ts',
    'nuxt.config.js',
    'content.config.ts',
    'content.config.js',
    'tailwind.config.ts',
    'tailwind.config.js',
    'tsconfig.json',
  ];

  for (const rel of copyItems) {
    const src = resolve(srcRoot, rel);
    if (!(await pathExists(src))) continue;
    const dest = resolve(workspaceRoot, rel);
    try {
      await rm(dest, { recursive: true, force: true });
    } catch {}
    await cp(src, dest, { recursive: true });
  }

  await ensureWorkspacePackageJson(workspaceRoot, srcRoot, job);

  const desktopContent = desktopDataDir ? resolve(desktopDataDir, 'content') : '';
  if (desktopContent && (await pathExists(desktopContent))) {
    pushLog(job, `合并内容：${desktopContent} -> ${resolve(workspaceRoot, 'content')}`);
    await mkdir(resolve(workspaceRoot, 'content'), { recursive: true });
    await cp(desktopContent, resolve(workspaceRoot, 'content'), { recursive: true });
  }

  return workspaceRoot;
}

async function resolvePackageManagerCommand(projectRoot: string, actionArgs: string[]) {
  const npmExecPath = String(process.env.npm_execpath || '').trim();
  if (npmExecPath && (await fileExists(npmExecPath))) {
    const isPnpm = /(^|[\\/])pnpm([\\/.-]|$)/i.test(npmExecPath);
    return isPnpm
      ? { cmd: process.execPath, args: [npmExecPath, '-C', projectRoot, ...actionArgs] }
      : { cmd: process.execPath, args: [npmExecPath, '--prefix', projectRoot, ...actionArgs] };
  }

  const pnpmNames = process.platform === 'win32' ? ['pnpm.exe', 'pnpm.cmd', 'pnpm'] : ['pnpm'];
  const pnpm = await findInPath(pnpmNames);
  if (pnpm) return { cmd: pnpm, args: ['-C', projectRoot, ...actionArgs] };

  const npmNames = process.platform === 'win32' ? ['npm.exe', 'npm.cmd', 'npm'] : ['npm'];
  const npm = await findInPath(npmNames);
  if (npm) return { cmd: npm, args: ['--prefix', projectRoot, ...actionArgs] };

  const corepackNames = process.platform === 'win32' ? ['corepack.exe', 'corepack.cmd', 'corepack'] : ['corepack'];
  const nodeDir = dirname(process.execPath);
  for (const name of corepackNames) {
    const candidate = resolve(nodeDir, name);
    if (await fileExists(candidate)) {
      return { cmd: candidate, args: ['pnpm', '-C', projectRoot, ...actionArgs] };
    }
  }

  throw new Error('未找到 pnpm 或 npm（也未找到 corepack），请先安装包管理器');
}

async function runNuxtGenerateAndExportDist(
  job: PublishJobInternal,
  projectRoot: string,
  secrets: Array<string | undefined>,
) {
  const nuxtCli = resolve(projectRoot, 'node_modules', 'nuxt', 'bin', 'nuxt.mjs');
  if (!(await fileExists(nuxtCli))) {
    throw new Error(`未找到 Nuxt CLI：${nuxtCli}（请确认依赖已安装）`);
  }

  pushLog(job, '开始构建：nuxt generate');
  pushLog(job, `执行命令：${process.execPath} ${nuxtCli} generate`);
  await runCommand(job, process.execPath, [nuxtCli, 'generate'], secrets, {
    cwd: projectRoot,
    env: {
      NUXT_DESKTOP: '0',
      ELECTRON_RUN_AS_NODE: '0',
    },
  });

  const exporter = resolve(projectRoot, 'scripts', 'export-dist.mjs');
  if (!(await fileExists(exporter))) {
    throw new Error(`未找到导出脚本：${exporter}`);
  }
  pushLog(job, '导出产物：scripts/export-dist.mjs');
  pushLog(job, `执行命令：${process.execPath} ${exporter}`);
  await runCommand(job, process.execPath, [exporter], secrets, { cwd: projectRoot });
}

function runCommand(
  job: PublishJobInternal,
  cmd: string,
  args: string[],
  secrets: Array<string | undefined>,
  opts?: { cwd?: string; env?: Record<string, string> },
) {
  return new Promise<void>((resolvePromise, reject) => {
    const cwd = opts?.cwd || process.cwd();
    const env = opts?.env ? { ...process.env, ...opts.env } : process.env;
    const isWin = process.platform === 'win32';
    const isCmd = isWin && /\.(cmd|bat)$/i.test(cmd);
    const quoteForCmd = (v: string) => {
      const s = String(v ?? '');
      return /[\s"]/g.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const child = isCmd
      ? spawn('cmd.exe', ['/d', '/s', '/c', `${quoteForCmd(cmd)} ${args.map(quoteForCmd).join(' ')}`.trim()], {
          cwd,
          env,
          shell: false,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      : spawn(cmd, args, {
          cwd,
          env,
          shell: false,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

    const onChunk = (buf: any) => {
      const text = sanitizeText(String(buf || ''), secrets);
      for (const raw of text.split(/\r?\n/g)) {
        const line = normalizeLine(raw);
        if (line) pushLog(job, line);
      }
    };

    child.stdout?.on('data', onChunk);
    child.stderr?.on('data', onChunk);

    child.on('error', (e) => {
      const msg = e instanceof Error ? e.message : String(e || '启动进程失败');
      reject(new Error(sanitizeText(msg, secrets)));
    });

    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(sanitizeText(`${cmd} 退出，code=${code}`, secrets)));
    });
  });
}

export function getPublishJob(): PublishJobPublic {
  assertAdminEnabled();
  const store = getStore();
  if (!store.current) {
    return {
      id: '',
      status: 'idle',
      stage: 'idle',
      createdAt: new Date(0).toISOString(),
      logs: [],
    };
  }
  return toPublic(store.current);
}

async function runPublishJob(job: PublishJobInternal) {
  const cfg = await readLocalConfig();
  const bucket = String(cfg.cos?.bucket || '').trim();
  const region = String(cfg.cos?.region || '').trim();
  const secretId = String(cfg.cos?.secretId || '').trim();
  const secretKey = String(cfg.cos?.secretKey || '').trim();

  if (!bucket || !region || !secretId || !secretKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'COS 配置不完整：请先在 /admin/user 保存 bucket/region/secretId/secretKey',
    });
  }

  const secrets = [secretId, secretKey];
  const appRoot = await resolveAppRootForPublish();
  const desktopDataDir = getDesktopDataDir();
  const projectRoot = desktopDataDir ? await ensurePublishWorkspace(appRoot, desktopDataDir, job) : appRoot;

  pushLog(job, `构建目录：${projectRoot}`);
  pushLog(job, `当前目录：${process.cwd()}`);
  if (desktopDataDir) {
    pushLog(job, '安装依赖：pnpm install --prod');
    const install = await resolvePackageManagerCommand(projectRoot, ['install', '--prod']);
    pushLog(job, `执行命令：${install.cmd} ${install.args.join(' ')}`);
    await runCommand(job, install.cmd, install.args, secrets, { cwd: projectRoot });
  }
  await runNuxtGenerateAndExportDist(job, projectRoot, secrets);

  const distDir = resolve(projectRoot, 'dist');
  if (!(await fileExists(distDir))) {
    throw new Error('未找到 dist/，请确认 nuxt generate 与导出步骤是否成功');
  }

  job.stage = 'syncing';
  pushLog(job, '开始上传：coscli sync');

  const coscli = await ensureCoscli();
  const endpoint = `cos.${region}.myqcloud.com`;
  const target = `cos://${bucket}/`;

  await runCommand(
    job,
    coscli,
    ['sync', './dist', target, '-r', '--delete', '--init-skip=true', '-i', secretId, '-k', secretKey, '-e', endpoint],
    secrets,
    { cwd: projectRoot },
  );
}

export async function startPublish(): Promise<PublishJobPublic> {
  assertAdminEnabled();
  const store = getStore();
  if (store.current?.status === 'running') {
    throw createError({ statusCode: 409, statusMessage: '正在发布中，请稍后再试' });
  }

  const job: PublishJobInternal = {
    id: randomBytes(12).toString('hex'),
    status: 'running',
    stage: 'generating',
    createdAt: Date.now(),
    startedAt: Date.now(),
    logs: [],
  };
  store.current = job;

  void (async () => {
    try {
      await runPublishJob(job);
      job.status = 'success';
      job.stage = 'done';
      job.finishedAt = Date.now();
      job.message = '发布成功';
      pushLog(job, '发布成功');
    } catch (e: any) {
      job.status = 'error';
      job.stage = 'done';
      job.finishedAt = Date.now();
      const msg =
        e?.statusMessage || e?.data?.statusMessage || (e instanceof Error ? e.message : String(e || '发布失败'));
      job.message = sanitizeText(msg, []);
      pushLog(job, `发布失败：${job.message}`);
    }
  })();

  return toPublic(job);
}
