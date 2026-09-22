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

const SNAPSHOT_WIDTH = 1920;
const SNAPSHOT_HEIGHT = 1080;

function snapshotWindow() {
  return new BrowserWindow({
    width: SNAPSHOT_WIDTH,
    height: SNAPSHOT_HEIGHT,
    useContentSize: true,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    opacity: 0,
    backgroundColor: '#0b0d12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });
}

async function renderSnapshotJpeg(payload) {
  const dataset = payload && payload.data;
  if (!dataset || !Array.isArray(dataset.songs) || !dataset.profile) {
    throw Object.assign(new Error('nothing-to-snapshot'), { code: 'nothing-to-snapshot' });
  }
  const win = snapshotWindow();
  try {
    const ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        ipcMain.removeListener('snapshot:ready', handler);
        reject(new Error('snapshot-timeout'));
      }, 20000);
      function handler(event) {
        if (event.sender !== win.webContents) return;
        clearTimeout(timer);
        ipcMain.removeListener('snapshot:ready', handler);
        resolve();
      }
      ipcMain.on('snapshot:ready', handler);
    });
    await win.loadFile(path.join(__dirname, 'renderer', 'snapshot.html'));
    win.webContents.send('snapshot:data', { data: dataset, lang: payload.lang || 'en' });
    await ready;
    win.showInactive();
    await new Promise((resolve) => setTimeout(resolve, 180));
    const image = await win.webContents.capturePage({ x: 0, y: 0, width: SNAPSHOT_WIDTH, height: SNAPSHOT_HEIGHT });
    const size = image.getSize();
    const final = size.width === SNAPSHOT_WIDTH && size.height === SNAPSHOT_HEIGHT ? image : image.resize({ width: SNAPSHOT_WIDTH, height: SNAPSHOT_HEIGHT, quality: 'best' });
    return final.toJPEG(90);
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
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

  ipcMain.handle('snapshot:save', async (event, payload) => {
    try {
      const jpeg = await renderSnapshotJpeg(payload);
      if (process.env.SA_SMOKE_SNAPSHOT) {
        const smokePath = path.join(app.getPath('temp'), 'suno-snapshot-smoke.jpg');
        fs.writeFileSync(smokePath, jpeg);
        return ok({ canceled: false, filePath: smokePath });
      }
      const dataset = payload && payload.data;
      const handle = normalizeHandle(dataset && dataset.profile && dataset.profile.handle) || 'profile';
      const owner = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showSaveDialog(owner, {
        title: 'Save snapshot',
        defaultPath: `suno-${handle}-achievements.jpg`,
        filters: [{ name: 'JPEG', extensions: ['jpg', 'jpeg'] }],
      });
      if (result.canceled || !result.filePath) return ok({ canceled: true });
      fs.writeFileSync(result.filePath, jpeg);
      return ok({ canceled: false, filePath: result.filePath });
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
          const datasetJson = await win.webContents.executeJavaScript('JSON.stringify(window.SA.app.currentData() || null)');
          const jpeg = await renderSnapshotJpeg({ data: JSON.parse(datasetJson), lang: process.env.SA_SNAPSHOT_LANG || 'ja' });
          const snapshotPath = path.join(app.getPath('temp'), 'suno-snapshot-smoke.jpg');
          fs.writeFileSync(snapshotPath, jpeg);
          console.log(`SMOKE_SNAPSHOT=${snapshotPath} bytes=${jpeg.length} magic=${jpeg[0].toString(16)}${jpeg[1].toString(16)}`);
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
