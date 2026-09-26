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
    return unwrap(await bridge.saveFile({ bytes: options.bytes, defaultName: options.name, mime: options.mime }));
  }

  async function exportJson(dataset) {
    if (!isDataset(dataset)) throw Object.assign(new Error('nothing-to-export'), { code: 'nothing-to-export' });
    const handle = (dataset.profile && dataset.profile.handle) || 'profile';
    if (isElectron) return unwrap(await bridge.cacheExport(null, dataset));
    return saveFile({ bytes: new TextEncoder().encode(JSON.stringify(dataset, null, 2)), name: `suno-${handle}.json`, mime: 'application/json' });
  }

  function saveSnapshot(dataset, lang) {
    if (!isElectron) return Promise.reject(unsupported('saveSnapshot'));
    return bridge.saveSnapshot({ data: dataset, lang }).then(unwrap);
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

  function onSnapshotData(callback) {
    if (isElectron && typeof bridge.onSnapshotData === 'function') return bridge.onSnapshotData(callback);
    return () => {};
  }

  function snapshotReady() {
    if (isElectron && typeof bridge.snapshotReady === 'function') bridge.snapshotReady();
  }

  return {
    isElectron,
    isDataset,
    fetchProfile,
    fetchClip,
    cache,
    importJson,
    saveFile,
    exportJson,
    saveSnapshot,
    onSnapshotData,
    snapshotReady,
    openExternal,
    onProgress,
  };
})();
