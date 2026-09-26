'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeHandle, fetchAll, fetchClip } = require('./lib/suno-core');

const SMOKE = !!process.env.SA_SMOKE;
const SUNO_URL_RE = /^https:\/\/(?:www\.)?suno\.com\//i;

function cacheDir() {
  return path.join(app.getPath('userData'), 'cache');
}

function cachePath(handle) {
  return path.join(cacheDir(), `${handle.toLowerCase()}.json`);
}

function readCache(handle) {
  try {
    return JSON.parse(fs.readFileSync(cachePath(handle), 'utf8'));
  } catch {
    return null;
  }
}

function writeCache(handle, data) {
  try {
    fs.mkdirSync(cacheDir(), { recursive: true });
    fs.writeFileSync(cachePath(handle), JSON.stringify(data, null, 2));
    return true;
  } catch {
    return false;
  }
}

function listCache() {
  try {
    return fs
      .readdirSync(cacheDir())
      .filter((file) => file.toLowerCase().endsWith('.json'))
      .map((file) => file.replace(/\.json$/i, ''))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function removeCache(handle) {
  try {
    fs.unlinkSync(cachePath(handle));
    return true;
  } catch {
    return false;
  }
}

function ok(data) {
  return { ok: true, data };
}

function fail(error) {
  const message = error && error.message ? error.message : String(error);
  const code = (error && error.code) || 'error';
  return { ok: false, error: { code, message } };
}

const IMAGE_HOST_RE = /(^|\.)(suno\.ai|suno\.com|cloudfront\.net)$/i;
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

async function fetchImageDataUrl(rawUrl) {
  if (typeof rawUrl !== 'string') {
    throw Object.assign(new Error('blocked-url'), { code: 'blocked-url' });
  }
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw Object.assign(new Error('blocked-url'), { code: 'blocked-url' });
  }
  if (parsed.protocol !== 'https:' || !IMAGE_HOST_RE.test(parsed.hostname)) {
    throw Object.assign(new Error('blocked-url'), { code: 'blocked-url' });
  }
  const response = await fetch(parsed.href, { headers: { Referer: 'https://suno.com/' } });
  if (!response.ok) {
    throw Object.assign(new Error(`image-http-${response.status}`), { code: 'image-fetch-failed' });
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > IMAGE_MAX_BYTES) {
    throw Object.assign(new Error('image-too-large'), { code: 'image-too-large' });
  }
  const contentType = (response.headers.get('content-type') || 'image/jpeg').split(';')[0].trim() || 'image/jpeg';
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

function registerIpc() {
  ipcMain.handle('suno:fetch', async (event, payload) => {
    try {
      const handle = normalizeHandle(payload && payload.handle);
      if (!handle) throw Object.assign(new Error('invalid-handle'), { code: 'invalid-handle' });
      const data = await fetchAll(handle, {
        onProgress: (progress) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('suno:progress', { handle, ...progress });
          }
        },
      });
      writeCache(handle, data);
      return ok(data);
    } catch (error) {
      return fail(error);
    }
  });

  ipcMain.handle('suno:clip', async (_event, payload) => {
    try {
      return ok(await fetchClip(payload && payload.id));
    } catch (error) {
      return fail(error);
    }
  });

  ipcMain.handle('cache:list', () => ok(listCache()));

  ipcMain.handle('cache:load', (_event, payload) => {
    const handle = normalizeHandle(payload && payload.handle);
    if (!handle) return fail(Object.assign(new Error('invalid-handle'), { code: 'invalid-handle' }));
    const data = readCache(handle);
    if (!data) return fail(Object.assign(new Error('cache-miss'), { code: 'cache-miss' }));
    return ok(data);
  });

  ipcMain.handle('cache:remove', (_event, payload) => {
    const handle = normalizeHandle(payload && payload.handle);
    if (!handle) return fail(Object.assign(new Error('invalid-handle'), { code: 'invalid-handle' }));
    return ok(removeCache(handle));
  });

  ipcMain.handle('cache:export', async (event, payload) => {
    try {
      const data = payload && payload.data;
      if (!data || !Array.isArray(data.songs) || !data.profile) {
        return fail(Object.assign(new Error('nothing-to-export'), { code: 'nothing-to-export' }));
      }
      const handle = normalizeHandle(data.profile.handle) || 'profile';
      const owner = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showSaveDialog(owner, {
        title: 'Export profile data',
        defaultPath: `suno-${handle}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (result.canceled || !result.filePath) return ok({ canceled: true });
      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
      return ok({ canceled: false, filePath: result.filePath });
    } catch (error) {
      return fail(error);
    }
  });

  ipcMain.handle('cache:import', async (event) => {
    try {
      const owner = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showOpenDialog(owner, {
        title: 'Import profile data',
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (result.canceled || !result.filePaths.length) return ok({ canceled: true });
      const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
      if (!data || !Array.isArray(data.songs) || !data.profile) {
        return fail(Object.assign(new Error('invalid-file'), { code: 'invalid-file' }));
      }
      const handle = normalizeHandle(data.profile.handle);
      if (handle) {
        data.profile.handle = handle;
        writeCache(handle, data);
      }
      return ok({ canceled: false, data });
    } catch (error) {
      return fail(error);
    }
  });

  ipcMain.handle('file:save', async (event, payload) => {
    try {
      const bytes = payload && payload.bytes;
      if (!bytes) {
        return fail(Object.assign(new Error('nothing-to-save'), { code: 'nothing-to-save' }));
      }
      const owner = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showSaveDialog(owner, {
        title: (payload && payload.title) || 'Save file',
        defaultPath: (payload && payload.defaultName) || 'file',
        filters: (payload && payload.filters) || [{ name: 'All files', extensions: ['*'] }],
      });
      if (result.canceled || !result.filePath) return ok({ canceled: true });
      fs.writeFileSync(result.filePath, Buffer.from(bytes));
      return ok({ canceled: false, filePath: result.filePath });
    } catch (error) {
      return fail(error);
    }
  });

  ipcMain.handle('image:fetch', async (_event, payload) => {
    try {
      return ok(await fetchImageDataUrl(payload && payload.url));
    } catch (error) {
      return fail(error);
    }
  });

  ipcMain.handle('app:open-external', (_event, payload) => {
    const url = payload && payload.url;
    if (typeof url !== 'string' || !SUNO_URL_RE.test(url)) {
      return fail(Object.assign(new Error('blocked-url'), { code: 'blocked-url' }));
    }
    shell.openExternal(url);
    return ok(true);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 940,
    minHeight: 620,
    backgroundColor: '#0b0d12',
    autoHideMenuBar: true,
    title: 'Suno Achievement',
    show: !SMOKE,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (SUNO_URL_RE.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) return;
    event.preventDefault();
    if (SUNO_URL_RE.test(url)) shell.openExternal(url);
  });

  if (SMOKE) {
    win.webContents.on('console-message', (event, _level, message) => {
      const text = event && typeof event.message === 'string' ? event.message : message;
      console.log(`[renderer] ${text}`);
    });
    win.webContents.once('did-finish-load', async () => {
      try {
        const preloadOk = await win.webContents.executeJavaScript('typeof window.sunoApi === "object"');
        const appOk = await win.webContents.executeJavaScript('typeof window.SA === "object" && typeof window.SA.app === "object"');
        console.log(`SMOKE_PRELOAD=${preloadOk} SMOKE_APP=${appOk}`);
        const report = await win.webContents.executeJavaScript(`(async () => {
          await window.SA.app.openProfile('suno');
          const started = Date.now();
          while (document.getElementById('content').hidden && Date.now() - started < 30000) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
          return JSON.stringify({
            content: !document.getElementById('content').hidden,
            name: document.getElementById('hero-name').textContent,
            badges: document.querySelectorAll('#badge-grid .badge').length,
            unlocked: document.querySelectorAll('#badge-grid .badge.is-unlocked').length,
            songs: document.querySelectorAll('#song-list .song').length,
            stats: document.getElementById('stat-grid').textContent.replace(/\\s+/g, ' ').trim(),
          });
        })()`);
        console.log(`SMOKE_FLOW=${report}`);
        const langReport = await win.webContents.executeJavaScript(`(() => {
          const select = document.getElementById('lang-select');
          const original = select.value;
          const missing = [];
          for (const language of window.SA.i18n.languages) {
            select.value = language.code;
            select.dispatchEvent(new Event('change'));
            const nodes = document.querySelectorAll(
              '[data-i18n], #badge-grid h3, #badge-grid .badge-desc, #filter-chips .chip, #songs-sort option, #stat-grid .stat-label'
            );
            for (const node of nodes) {
              const text = (node.textContent || '').trim();
              if (!text || /^[a-z]+\\.[a-zA-Z_]+/.test(text)) missing.push(language.code + ':' + text);
            }
          }
          select.value = original;
          select.dispatchEvent(new Event('change'));
          return JSON.stringify({ missing: [...new Set(missing)].slice(0, 8), count: missing.length });
        })()`);
        console.log(`SMOKE_LANGS=${langReport}`);
        if (process.env.SA_SMOKE_SNAPSHOT) {
          const lang = process.env.SA_SNAPSHOT_LANG || 'ja';
          const encoded = await win.webContents.executeJavaScript(`(async () => {
            const data = window.SA.app.currentData();
            const evaluation = window.SA.achievements.evaluate(data);
            const avatar = await window.SA.platform.loadImage(data.profile.avatar, data.profile.displayName);
            const out = {};
            for (const aspect of ['16:9', '9:16']) {
              const blob = await window.SA.card.renderToBlob({ dataset: data, evaluation, aspect, theme: window.SA.card.theme(), images: { avatar }, lang: ${JSON.stringify(lang)}, generatedAt: new Date().toISOString(), type: 'image/jpeg', quality: 0.9 });
              const bytes = new Uint8Array(await blob.arrayBuffer());
              let binary = '';
              for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
              out[aspect] = btoa(binary);
            }
            return JSON.stringify(out);
          })()`);
          const cards = JSON.parse(encoded);
          for (const [aspect, base64] of Object.entries(cards)) {
            const jpeg = Buffer.from(base64, 'base64');
            const cardPath = path.join(app.getPath('temp'), `suno-card-smoke-${aspect.replace(':', 'x')}.jpg`);
            fs.writeFileSync(cardPath, jpeg);
            console.log(`SMOKE_SNAPSHOT=${cardPath} aspect=${aspect} bytes=${jpeg.length} magic=${jpeg[0].toString(16)}${jpeg[1].toString(16)}`);
          }
        }
        if (process.env.SA_SMOKE_LAYOUT) {
          win.setContentSize(1920, 1080);
          win.setOpacity(0);
          win.showInactive();
          await new Promise((resolve) => setTimeout(resolve, 350));
          const metrics = await win.webContents.executeJavaScript(`(() => {
            const bottom = (sel) => {
              const node = document.querySelector(sel);
              return node ? Math.round(node.getBoundingClientRect().bottom) : null;
            };
            return JSON.stringify({
              viewport: [window.innerWidth, window.innerHeight],
              achievementsBottom: bottom('.achievements-card'),
              songsTop: Math.round(document.querySelector('.songs-card').getBoundingClientRect().top),
              badgeColumns: getComputedStyle(document.getElementById('badge-grid')).gridTemplateColumns.split(' ').length,
              overviewColumns: getComputedStyle(document.querySelector('.overview')).gridTemplateColumns.split(' ').length,
            });
          })()`);
          console.log(`SMOKE_LAYOUT=${metrics}`);
          const layoutImage = await win.webContents.capturePage({ x: 0, y: 0, width: 1920, height: 1080 });
          fs.writeFileSync(path.join(app.getPath('temp'), 'suno-layout-smoke.jpg'), layoutImage.toJPEG(85));
        }
        if (process.env.SA_SMOKE_ERRORS) {
          const notFound = await win.webContents.executeJavaScript(`(async () => {
            await window.SA.app.openProfile('zzzznonexistentzzzz9');
            return JSON.stringify({
              errorVisible: !document.getElementById('error').hidden,
              errorText: document.getElementById('error-text').textContent,
              contentHidden: document.getElementById('content').hidden,
            });
          })()`);
          console.log(`SMOKE_NOTFOUND=${notFound}`);
          const invalid = await win.webContents.executeJavaScript(`(async () => {
            await window.SA.app.openProfile('!!! not a handle !!!');
            return JSON.stringify({
              errorVisible: !document.getElementById('error').hidden,
              errorText: document.getElementById('error-text').textContent,
            });
          })()`);
          console.log(`SMOKE_INVALID=${invalid}`);
          await win.webContents.executeJavaScript("window.SA.app.openProfile('suno')");
        }
      } catch (error) {
        console.error(`SMOKE_ERROR=${error.message}`);
      }
      app.quit();
    });
  }

  return win;
}

app.whenReady().then(() => {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.suno.ai/*', '*://*.cloudfront.net/*'] },
    (details, callback) => {
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          Referer: 'https://suno.com/',
        },
      });
    }
  );

  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
