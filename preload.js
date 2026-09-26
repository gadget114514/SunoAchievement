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
  saveFile: (payload) => ipcRenderer.invoke('file:save', payload),
  imageFetch: (url) => ipcRenderer.invoke('image:fetch', { url }),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', { url }),
  onProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('suno:progress', listener);
    return () => ipcRenderer.removeListener('suno:progress', listener);
  },
});
