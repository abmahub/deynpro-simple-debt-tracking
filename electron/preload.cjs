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

contextBridge.exposeInMainWorld('electronSync', {
  outboxEnqueue: (table, op, rowId, payload) =>
    ipcRenderer.invoke('sync:outboxEnqueue', table, op, rowId, payload),
  outboxPeek: (limit) => ipcRenderer.invoke('sync:outboxPeek', limit),
  outboxAck: (id) => ipcRenderer.invoke('sync:outboxAck', id),
  outboxFail: (id, err) => ipcRenderer.invoke('sync:outboxFail', id, err),
  getState: (table) => ipcRenderer.invoke('sync:getState', table),
  setState: (table, ts) => ipcRenderer.invoke('sync:setState', table, ts),
  upsertRemote: (table, row) => ipcRenderer.invoke('sync:upsertRemote', table, row),
});

contextBridge.exposeInMainWorld('electronEnv', {
  isElectron: true,
  platform: process.platform,
});