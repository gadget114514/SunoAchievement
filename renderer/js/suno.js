window.SA = window.SA || {};

SA.data = (() => {
  'use strict';

  const HANDLE_RE = /^[A-Za-z0-9_.-]{1,64}$/;

  function unwrap(response) {
    if (response && response.ok) return response.data;
    const error = new Error((response && response.error && response.error.message) || 'unknown-error');
    error.code = (response && response.error && response.error.code) || 'error';
    throw error;
  }

  function normalizeHandle(input) {
    if (typeof input !== 'string') return null;
    let value = input.trim();
    if (!value) return null;
    const url = value.match(/^(?:https?:\/\/)?(?:www\.)?suno\.com\/@?([^/?#\s]+)/i);
    if (url) value = url[1];
    value = value.replace(/^@+/, '').replace(/[/?#].*$/, '');
    return HANDLE_RE.test(value) ? value : null;
  }

  return {
    normalizeHandle,
    fetchProfile: (handle) => window.sunoApi.fetchProfile(handle).then(unwrap),
    fetchClip: (id) => window.sunoApi.fetchClip(id).then(unwrap),
    listCache: () => window.sunoApi.cacheList().then(unwrap).catch(() => []),
    loadCache: (handle) => window.sunoApi.cacheLoad(handle).then(unwrap).catch(() => null),
    removeCache: (handle) => window.sunoApi.cacheRemove(handle).then(unwrap).catch(() => false),
    exportData: (data) => window.sunoApi.cacheExport(null, data).then(unwrap),
    importData: () => window.sunoApi.cacheImport().then(unwrap),
    saveSnapshot: (dataset, lang) => window.sunoApi.saveSnapshot({ data: dataset, lang }).then(unwrap),
    onSnapshotData: (callback) => window.sunoApi.onSnapshotData(callback),
    snapshotReady: () => window.sunoApi.snapshotReady(),
    openExternal: (url) => window.sunoApi.openExternal(url).then(unwrap).catch(() => false),
    onProgress: (callback) => window.sunoApi.onProgress(callback),
  };
})();
