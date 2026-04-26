const { contextBridge, ipcRenderer } = require('electron');

/**
 * Exposes a minimal, safe API to the renderer.
 * The renderer never touches Node, fs, or sqlite directly.
 */
contextBridge.exposeInMainWorld('electronDB', {
  select: (table, filters) => ipcRenderer.invoke('db:select', table, filters),
  insert: (table, values) => ipcRenderer.invoke('db:insert', table, values),
  update: (table, values, filters) => ipcRenderer.invoke('db:update', table, values, filters),
  remove: (table, filters) => ipcRenderer.invoke('db:delete', table, filters),
  exportAll: () => ipcRenderer.invoke('db:exportAll'),
  importAll: (payload) => ipcRenderer.invoke('db:importAll', payload),
});

contextBridge.exposeInMainWorld('electronEnv', {
  isElectron: true,
  platform: process.platform,
});