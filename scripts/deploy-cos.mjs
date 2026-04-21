import { readFile, stat } from 'node:fs/promises';
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

async function main() {
  await loadDotEnv();

  const COS_BUCKET = requireEnv('COS_BUCKET');
  const COS_REGION = requireEnv('COS_REGION');
  const COS_SECRET_ID = requireEnv('COS_SECRET_ID');
  const COS_SECRET_KEY = requireEnv('COS_SECRET_KEY');

  const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  await run(pnpmCmd, ['run', 'generate:dist']);

  const distDir = resolve(process.cwd(), 'dist');
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
    process.platform === 'win32' && coscli.toLowerCase().endsWith('.exe') ? { windowsHide: true } : {},
  );
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e || '未知错误');
  console.error(msg);
  process.exitCode = 1;
});
