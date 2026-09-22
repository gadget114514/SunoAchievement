'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sunoApi', {
  fetchProfile: (handle) => ipcRenderer.invoke('suno:fetch', { handle }),
  fetchClip: (id) => ipcRenderer.invoke('suno:clip', { id }),
  cacheList: () => ipcRenderer.invoke('cache:list'),
  cacheLoad: (handle) => ipcRenderer.invoke('cache:load', { handle }),
  cacheRemove: (handle) => ipcRenderer.invoke('cache:remove', { handle }),
  cacheExport: (handle, data) => ipcRenderer.invoke('cache:export', { handle, data }),
  cacheImport: () => ipcRenderer.invoke('cache:import'),
  saveSnapshot: (payload) => ipcRenderer.invoke('snapshot:save', payload),
  onSnapshotData: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('snapshot:data', listener);
    return () => ipcRenderer.removeListener('snapshot:data', listener);
  },
  snapshotReady: () => ipcRenderer.send('snapshot:ready'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', { url }),
  onProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('suno:progress', listener);
    return () => ipcRenderer.removeListener('suno:progress', listener);
  },
});
