import { createError } from 'h3';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
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

async function resolveGenerateDistCommand() {
  const npmExecPath = String(process.env.npm_execpath || '').trim();
  if (npmExecPath && (await fileExists(npmExecPath))) {
    return { cmd: process.execPath, args: [npmExecPath, 'run', 'generate:dist'] };
  }

  const pnpmNames = process.platform === 'win32' ? ['pnpm.cmd', 'pnpm.exe', 'pnpm'] : ['pnpm'];
  const pnpm = await findInPath(pnpmNames);
  if (pnpm) return { cmd: pnpm, args: ['run', 'generate:dist'] };

  const npmNames = process.platform === 'win32' ? ['npm.cmd', 'npm.exe', 'npm'] : ['npm'];
  const npm = await findInPath(npmNames);
  if (npm) return { cmd: npm, args: ['run', 'generate:dist'] };

  throw new Error('未找到 pnpm 或 npm，请先安装包管理器');
}

function runCommand(
  job: PublishJobInternal,
  cmd: string,
  args: string[],
  secrets: Array<string | undefined>,
  opts?: { cwd?: string },
) {
  return new Promise<void>((resolvePromise, reject) => {
    const shouldShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(cmd);
    const child = spawn(cmd, args, {
      cwd: opts?.cwd || process.cwd(),
      shell: shouldShell,
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

  const { cmd, args } = await resolveGenerateDistCommand();
  pushLog(job, `开始构建：${process.platform === 'win32' ? 'generate:dist（可能较慢）' : 'generate:dist'}`);
  await runCommand(job, cmd, args, secrets);

  const distDir = resolve(process.cwd(), 'dist');
  if (!(await fileExists(distDir))) {
    throw new Error('未找到 dist/，请确认 generate:dist 是否成功');
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
    process.platform === 'win32' && coscli.toLowerCase().endsWith('.exe')
      ? { cwd: process.cwd() }
      : { cwd: process.cwd() },
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
