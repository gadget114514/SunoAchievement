window.SA = window.SA || {};

SA.platform = (() => {
  'use strict';

  const bridge = typeof window.sunoApi === 'object' && window.sunoApi ? window.sunoApi : null;
  const isElectron = !!bridge;

  function unsupported(feature) {
    return Object.assign(new Error(`${feature} is not available in the web build`), { code: 'unsupported' });
  }

  function unwrap(response) {
    if (response && response.ok) return response.data;
    const error = new Error((response && response.error && response.error.message) || 'unknown-error');
    error.code = (response && response.error && response.error.code) || 'error';
    throw error;
  }

  function isDataset(value) {
    return !!value && typeof value === 'object' && !!value.profile && Array.isArray(value.songs);
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function pickJsonFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.hidden = true;
      document.body.appendChild(input);
      let settled = false;
      function finish(result) {
        if (settled) return;
        settled = true;
        input.remove();
        resolve(result);
      }
      input.addEventListener(
        'change',
        () => {
          const file = input.files && input.files[0];
          if (!file) {
            finish({ canceled: true });
            return;
          }
          file.text().then(
            (text) => finish({ canceled: false, data: JSON.parse(text) }),
            () => finish({ canceled: false, error: true })
          );
        },
        { once: true }
      );
      input.addEventListener('cancel', () => finish({ canceled: true }), { once: true });
      input.click();
    });
  }

  function fetchProfile(handle) {
    if (!isElectron) return Promise.reject(unsupported('fetchProfile'));
    return bridge.fetchProfile(handle).then(unwrap);
  }

  function fetchClip(id) {
    if (!isElectron) return Promise.reject(unsupported('fetchClip'));
    return bridge.fetchClip(id).then(unwrap);
  }

  const cache = {
    list: () => (isElectron ? bridge.cacheList().then(unwrap).catch(() => []) : Promise.resolve([])),
    load: (handle) => (isElectron ? bridge.cacheLoad(handle).then(unwrap).catch(() => null) : Promise.resolve(null)),
    remove: (handle) => (isElectron ? bridge.cacheRemove(handle).then(unwrap).catch(() => false) : Promise.resolve(false)),
  };

  const imageCache = new Map();

  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(Object.assign(new Error('image-load-failed'), { code: 'image-load-failed' }));
      image.src = src;
    });
  }

  function placeholderImage(label) {
    const size = 256;
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#ff8a3d');
    gradient.addColorStop(1, '#ff4d8d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const initial = String(label || '?').trim().charAt(0).toUpperCase() || '?';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.font = '700 118px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, size / 2, size / 2 + 6);
    return canvas.transferToImageBitmap();
  }

  async function loadImage(url, label) {
    if (!url) return null;
    if (imageCache.has(url)) return imageCache.get(url);
    const request = (async () => {
      try {
        if (isElectron) {
          const dataUrl = unwrap(await bridge.imageFetch(url));
          return await loadImageElement(dataUrl);
        }
        return await loadImageElement(url);
      } catch {
        return placeholderImage(label);
      }
    })();
    imageCache.set(url, request);
    return request;
  }

  async function importJson() {
    if (isElectron) {
      const result = unwrap(await bridge.cacheImport());
      return result || { canceled: true };
    }
    const picked = await pickJsonFile();
    if (picked.canceled) return { canceled: true };
    if (picked.error || !isDataset(picked.data)) {
      throw Object.assign(new Error('invalid-json'), { code: 'invalid-json' });
    }
    return { canceled: false, data: picked.data };
  }

  async function saveFile(payload) {
    const options = payload || {};
    if (!isElectron) {
      const body = options.blob || new Blob([options.bytes], { type: options.mime || 'application/octet-stream' });
      const name = options.name || 'download';
      downloadBlob(body, name);
      return { canceled: false, filePath: name };
    }
    if (typeof bridge.saveFile !== 'function') throw unsupported('saveFile');
    const bytes = options.bytes || (options.blob ? new Uint8Array(await options.blob.arrayBuffer()) : null);
    return unwrap(await bridge.saveFile({ bytes, defaultName: options.name, mime: options.mime }));
  }

  async function exportJson(dataset) {
    if (!isDataset(dataset)) throw Object.assign(new Error('nothing-to-export'), { code: 'nothing-to-export' });
    const handle = (dataset.profile && dataset.profile.handle) || 'profile';
    if (isElectron) return unwrap(await bridge.cacheExport(null, dataset));
    return saveFile({ bytes: new TextEncoder().encode(JSON.stringify(dataset, null, 2)), name: `suno-${handle}.json`, mime: 'application/json' });
  }

  function openExternal(url) {
    if (isElectron) return bridge.openExternal(url).then(unwrap).catch(() => false);
    window.open(url, '_blank', 'noopener');
    return Promise.resolve(true);
  }

  function onProgress(callback) {
    if (isElectron && typeof bridge.onProgress === 'function') return bridge.onProgress(callback);
    return () => {};
  }

  return {
    isElectron,
    isDataset,
    fetchProfile,
    fetchClip,
    cache,
    loadImage,
    importJson,
    saveFile,
    exportJson,
    openExternal,
    onProgress,
  };
})();
