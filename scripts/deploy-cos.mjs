import { cp, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { ensureCoscli } from './ensure-coscli.mjs';

function parseEnvText(text) {
  const result = {};
  const lines = String(text).split(/\r?\n/g);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) result[key] = value;
  }
  return result;
}

async function loadDotEnv() {
  const paths = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '.env.local')];
  for (const p of paths) {
    try {
      const content = await readFile(p, 'utf8');
      const parsed = parseEnvText(content);
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof process.env[k] === 'undefined' || process.env[k] === '') process.env[k] = String(v);
      }
    } catch (e) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'ENOENT') continue;
      throw e;
    }
  }
}

function requireEnv(name) {
  const value = (process.env[name] || '').trim();
  if (!value) throw new Error(`缺少环境变量：${name}`);
  return value;
}

async function fileExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolvePromise, reject) => {
    const shouldShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(cmd);
    const child = spawn(cmd, args, { stdio: 'inherit', shell: shouldShell, ...opts });
    child.on('error', (e) => {
      const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : '';
      const details = code ? `（${code}）` : '';
      reject(new Error(`启动进程失败：${cmd}${details}`));
    });
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${cmd} 退出，code=${code}`));
    });
  });
}

async function pruneMurmursForWorkspace(workspaceRoot) {
  const sitePath = resolve(workspaceRoot, 'content', 'site.json');
  if (!(await fileExists(sitePath))) return;

  let visibleDays = 0;
  try {
    const raw = await readFile(sitePath, 'utf8');
    const site = JSON.parse(raw || '{}');
    visibleDays = Number(site?.murmurs?.visibleDays ?? 0);
  } catch {}

  if (!(visibleDays > 0)) return;

  const murmursDir = resolve(workspaceRoot, 'content', 'murmurs');
  if (!(await pathExists(murmursDir))) return;

  const cutoff = Date.now() - visibleDays * 24 * 60 * 60 * 1000;

  const walk = async (dir) => {
    const ents = await readdir(dir, { withFileTypes: true });
    for (const ent of ents) {
      const p = resolve(dir, ent.name);
      if (ent.isDirectory()) await walk(p);
      else if (ent.isFile() && p.endsWith('.json')) {
        let shouldDelete = false;
        try {
          const raw = await readFile(p, 'utf8');
          const data = JSON.parse(raw || '{}');
          if (data?.draft) shouldDelete = true;
          else {
            const t = Date.parse(String(data?.date || ''));
            if (!Number.isFinite(t)) shouldDelete = true;
            else if (t < cutoff) shouldDelete = true;
          }
        } catch {
          shouldDelete = true;
        }
        if (shouldDelete) await rm(p, { force: true });
      }
    }
  };

  await walk(murmursDir);
}

async function ensureWorkspace(appRoot) {
  const workspaceRoot = resolve(appRoot, '.deploy-workspace');
  await rm(workspaceRoot, { recursive: true, force: true });
  await mkdir(workspaceRoot, { recursive: true });

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
    const src = resolve(appRoot, rel);
    if (!(await pathExists(src))) continue;
    const dest = resolve(workspaceRoot, rel);
    await rm(dest, { recursive: true, force: true });
    await cp(src, dest, { recursive: true });
  }

  await pruneMurmursForWorkspace(workspaceRoot).catch(() => {});
  return workspaceRoot;
}

async function main() {
  await loadDotEnv();

  const COS_BUCKET = requireEnv('COS_BUCKET');
  const COS_REGION = requireEnv('COS_REGION');
  const COS_SECRET_ID = requireEnv('COS_SECRET_ID');
  const COS_SECRET_KEY = requireEnv('COS_SECRET_KEY');

  const appRoot = process.cwd();
  const workspaceRoot = await ensureWorkspace(appRoot);

  const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  await run(pnpmCmd, ['-C', workspaceRoot, 'install', '--prod']);
  await run(pnpmCmd, ['-C', workspaceRoot, 'run', 'generate:dist']);

  const distDir = resolve(workspaceRoot, 'dist');
  if (!(await fileExists(distDir))) throw new Error('未找到 dist/，请确认 generate:dist 是否成功');

  const coscli = await ensureCoscli();
  if ((process.env.COS_DRY_RUN || '').trim() === '1') {
    process.stdout.write(`coscli: ${coscli}\n`);
    return;
  }

  const endpoint = `cos.${COS_REGION}.myqcloud.com`;
  const target = `cos://${COS_BUCKET}/`;

  await run(
    coscli,
    [
      'sync',
      './dist',
      target,
      '-r',
      '--delete',
      '--init-skip=true',
      '-i',
      COS_SECRET_ID,
      '-k',
      COS_SECRET_KEY,
      '-e',
      endpoint,
    ],
    process.platform === 'win32' && coscli.toLowerCase().endsWith('.exe') ? { windowsHide: true, cwd: workspaceRoot } : { cwd: workspaceRoot },
  );
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e || '未知错误');
  console.error(msg);
  process.exitCode = 1;
});
