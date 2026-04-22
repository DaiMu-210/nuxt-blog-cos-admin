const { app, BrowserWindow, Menu } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net
      .createServer()
      .once('error', () => resolve(false))
      .once('listening', () => srv.close(() => resolve(true)))
      .listen(port, '127.0.0.1');
  });
}

async function pickPort(preferred) {
  if (preferred && (await isPortFree(preferred))) return preferred;
  for (let port = 34111; port < 34250; port += 1) {
    if (await isPortFree(port)) return port;
  }
  return 0;
}

async function waitForHttpOk(url, timeoutMs, child) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (child && typeof child.exitCode === 'number') return false;
    const ok = await new Promise((resolve) => {
      const req = http.get(
        url,
        {
          timeout: 1500,
          headers: {
            Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
          },
        },
        (res) => {
          res.resume();
          resolve(res.statusCode && res.statusCode >= 200 && res.statusCode < 500);
        },
      );
      req.on('timeout', () => {
        req.destroy(new Error('timeout'));
        resolve(false);
      });
      req.on('error', () => resolve(false));
    });
    if (ok) return true;
    await delay(300);
  }
  return false;
}

function getAppRoot() {
  return app.getAppPath();
}

function resolveNuxtServerEntry(appRoot) {
  return path.join(appRoot, '.output', 'server', 'index.mjs');
}

function spawnProcess(cmd, args, opts) {
  const shouldShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(cmd);
  return spawn(cmd, args, { shell: shouldShell, ...opts });
}

function spawnNuxtServer({ port }) {
  const appRoot = getAppRoot();
  const entry = resolveNuxtServerEntry(appRoot);

  if (fs.existsSync(entry)) {
    const env = {
      ...process.env,
      NUXT_DESKTOP: '1',
      NUXT_DESKTOP_DATA_DIR: path.join(app.getPath('userData'), '.data'),
      HOST: '127.0.0.1',
      PORT: String(port),
      NITRO_HOST: '127.0.0.1',
      NITRO_PORT: String(port),
      ELECTRON_RUN_AS_NODE: '1',
    };
    const child = spawnProcess(process.execPath, [entry], {
      cwd: appRoot,
      env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { child, baseUrl: `http://127.0.0.1:${port}` };
  }

  const env = {
    ...process.env,
    NUXT_DESKTOP: '1',
    NUXT_DESKTOP_DATA_DIR: path.join(app.getPath('userData'), '.data'),
  };

  const cmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const args = ['dev', '--host', '127.0.0.1', '--port', String(port)];
  const child = spawnProcess(cmd, args, {
    cwd: appRoot,
    env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { child, baseUrl: `http://127.0.0.1:${port}` };
}

let nuxtChild = null;

async function createWindow() {
  const preferredPort = Number.parseInt(process.env.NUXT_DESKTOP_PORT || '', 10) || 34111;
  const port = await pickPort(preferredPort);
  if (!port) throw new Error('无法选择可用端口');

  const { child, baseUrl } = spawnNuxtServer({ port });
  nuxtChild = child;

  Menu.setApplicationMenu(null);

  const logFile = path.join(app.getPath('userData'), 'nuxt-server.log');
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  const lastLines = [];

  const onChunk = (buf) => {
    const text = String(buf || '').trimEnd();
    if (!text) return;
    logStream.write(`${text}\n`);
    for (const line of text.split(/\r?\n/g)) {
      const t = String(line || '').trimEnd();
      if (!t) continue;
      lastLines.push(t);
      if (lastLines.length > 80) lastLines.splice(0, lastLines.length - 80);
    }
    process.stdout.write(`${text}\n`);
  };
  child.stdout?.on('data', onChunk);
  child.stderr?.on('data', onChunk);

  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(getAppRoot(), 'electron', 'preload.cjs'),
    },
  });
  win.setMenuBarVisibility(false);

  const adminUrl = `${baseUrl}/admin`;
  const ok = await waitForHttpOk(adminUrl, 90_000, child);
  if (!ok) {
    const reason =
      child && typeof child.exitCode === 'number'
        ? `Nuxt server exited (code=${child.exitCode})`
        : 'Nuxt server startup timeout';
    const tail = lastLines.length ? `\n\n---- logs (tail) ----\n${lastLines.join('\n')}` : '';
    const msg = `${reason}\n\nlog: ${logFile}${tail}`;
    await win.loadURL(`data:text/plain;charset=utf-8,${encodeURIComponent(msg)}`);
    win.show();
    try {
      logStream.end();
    } catch {}
    return;
  }

  await win.loadURL(adminUrl);
  win.show();
  try {
    logStream.end();
  } catch {}
}

app.on('before-quit', () => {
  if (nuxtChild && !nuxtChild.killed) {
    try {
      nuxtChild.kill();
    } catch {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app
  .whenReady()
  .then(createWindow)
  .catch((e) => {
    const msg = e instanceof Error ? e.stack || e.message : String(e || 'unknown error');
    process.stderr.write(`${msg}\n`);
    try {
      app.quit();
    } catch {}
  });
