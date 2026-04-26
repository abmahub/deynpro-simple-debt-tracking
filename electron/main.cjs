const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./db.cjs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  mainWindow.loadFile(indexPath);
}

app.whenReady().then(() => {
  db.init();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ============================================================
// IPC handlers — all DB calls go through here
// ============================================================
ipcMain.handle('db:select', (_e, table, filters) => db.select(table, filters));
ipcMain.handle('db:insert', (_e, table, values) => db.insert(table, values));
ipcMain.handle('db:update', (_e, table, values, filters) => db.update(table, values, filters));
ipcMain.handle('db:delete', (_e, table, filters) => db.remove(table, filters));
ipcMain.handle('db:exportAll', () => db.exportAll());
ipcMain.handle('db:importAll', (_e, payload) => db.importAll(payload));

// Sync helpers (renderer-side sync worker uses these)
ipcMain.handle('sync:outboxPeek', (_e, limit) => db.outboxPeek(limit));
ipcMain.handle('sync:outboxAck', (_e, id) => db.outboxAck(id));
ipcMain.handle('sync:outboxFail', (_e, id, err) => db.outboxFail(id, err));
ipcMain.handle('sync:getState', (_e, table) => db.getSyncState(table));
ipcMain.handle('sync:setState', (_e, table, ts) => db.setSyncState(table, ts));
ipcMain.handle('sync:upsertRemote', (_e, table, row) => db.upsertRemote(table, row));
ipcMain.handle('sync:outboxEnqueue', (_e, table, op, rowId, payload) =>
  db.outboxEnqueue(table, op, rowId, payload)
);
// NOTE: db:raw is intentionally NOT exposed over IPC.
// The renderer must only use the typed select/insert/update/remove API,
// which validates table names against an allow-list in db.cjs.