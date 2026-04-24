import { chmod, mkdir, open, rename, rm, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { join, resolve } from 'node:path';
import { request as httpsRequest } from 'node:https';
import { pipeline } from 'node:stream/promises';

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

async function readHeadBytes(filePath: string, length: number) {
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function validateCoscliBinary(filePath: string) {
  const head = await readHeadBytes(filePath, 16);

  if (process.platform === 'win32') {
    return head.length >= 2 && head[0] === 0x4d && head[1] === 0x5a;
  }

  if (process.platform === 'linux') {
    return head.length >= 4 && head[0] === 0x7f && head[1] === 0x45 && head[2] === 0x4c && head[3] === 0x46;
  }

  if (process.platform === 'darwin') {
    if (head.length < 4) return false;
    const magic = head.readUInt32BE(0);
    const macho = new Set([
      0xfeedface, 0xfeedfacf, 0xcafebabe, 0xcafebabf, 0xcefaedfe, 0xcffaedfe, 0xbebafeca, 0xbfbafeca,
    ]);
    return macho.has(magic);
  }

  return true;
}

function getDefaultDownloadCandidates() {
  const base = 'https://cosbrowser.cloud.tencent.com/software/coscli';
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'linux' && arch === 'x64') {
    return [`${base}/coscli-linux-amd64`];
  }

  if (platform === 'darwin' && arch === 'x64') {
    return [`${base}/coscli-darwin-amd64`, `${base}/coscli-macos-amd64`, `${base}/coscli-mac-amd64`];
  }

  if (platform === 'darwin' && arch === 'arm64') {
    return [`${base}/coscli-darwin-arm64`, `${base}/coscli-macos-arm64`, `${base}/coscli-mac-arm64`];
  }

  if (platform === 'win32' && arch === 'x64') {
    return [
      `${base}/coscli-windows-amd64`,
      `${base}/coscli-windows-x64`,
      `${base}/coscli-windows-amd64.exe`,
      `${base}/coscli-windows-x64.exe`,
      `${base}/coscli-win-amd64.exe`,
      `${base}/coscli-win-x64.exe`,
    ];
  }

  return [];
}

function getCoscliCacheDir() {
  const desktopDataDir = String(process.env.NUXT_DESKTOP_DATA_DIR || '').trim();
  const base = desktopDataDir ? resolve(desktopDataDir) : process.cwd();
  return resolve(base, '.cache', 'coscli');
}

async function downloadFile(url: string, destPath: string) {
  await mkdir(resolve(destPath, '..'), { recursive: true });

  const tmpPath = `${destPath}.tmp`;
  const out = createWriteStream(tmpPath);

  const res = await new Promise<any>((resolveRes, reject) => {
    const req = httpsRequest(url, (r) => resolveRes(r));
    req.on('error', reject);
    req.end();
  });

  if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
    const location = res.headers.location;
    res.resume();
    if (!location) throw new Error(`下载 coscli 失败：重定向但没有 Location 头（${url}）`);
    const next = location.startsWith('http') ? location : new URL(location, url).toString();
    out.close();
    await rm(tmpPath, { force: true });
    return downloadFile(next, destPath);
  }

  if (res.statusCode !== 200) {
    res.resume();
    out.close();
    await rm(tmpPath, { force: true });
    throw new Error(`下载 coscli 失败：HTTP ${res.statusCode}（${url}）`);
  }

  await pipeline(res, out);

  await rm(destPath, { force: true });
  await rename(tmpPath, destPath);
}

export async function ensureCoscli() {
  const configured = (process.env.COSCLI_PATH || '').trim();
  if (configured) {
    if (await fileExists(configured)) return configured;
    throw new Error(`COSCLI_PATH 指向的文件不存在：${configured}`);
  }

  const names = process.platform === 'win32' ? ['coscli.exe', 'coscli.cmd', 'coscli.bat', 'coscli'] : ['coscli'];
  const inPath = await findInPath(names);
  if (inPath) return inPath;

  const overrideUrl = (process.env.COSCLI_DOWNLOAD_URL || '').trim();
  const candidates = overrideUrl ? [overrideUrl] : getDefaultDownloadCandidates();
  if (!candidates.length) {
    throw new Error(
      `未找到 coscli，也无法确定该系统/架构的默认下载地址（platform=${process.platform}, arch=${process.arch}）。请先安装 coscli，或设置 COSCLI_PATH / COSCLI_DOWNLOAD_URL。`,
    );
  }

  const cacheDir = getCoscliCacheDir();
  const filename = process.platform === 'win32' ? 'coscli.exe' : 'coscli';
  const destPath = join(cacheDir, `${process.platform}-${process.arch}`, filename);

  if (await fileExists(destPath)) {
    const ok = await validateCoscliBinary(destPath);
    if (ok) return destPath;
    await rm(destPath, { force: true });
  }

  let lastError: unknown = null;
  for (const url of candidates) {
    try {
      await downloadFile(url, destPath);
      const ok = await validateCoscliBinary(destPath);
      if (!ok) {
        await rm(destPath, { force: true });
        throw new Error(`下载到的文件不是有效的可执行文件（${process.platform}）：${url}`);
      }
      if (process.platform !== 'win32') await chmod(destPath, 0o755);
      return destPath;
    } catch (e) {
      lastError = e;
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError || '');
  throw new Error(
    `自动下载 coscli 失败。可改用本机安装（PATH），或设置 COSCLI_DOWNLOAD_URL。${detail ? `\n${detail}` : ''}`,
  );
}
