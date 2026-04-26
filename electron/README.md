# DeynPro — Electron Offline Database

This folder contains the Electron main process and an embedded **SQLite**
database (`better-sqlite3`) used when the app runs as a desktop app.
The renderer (React) talks to it through a safe `contextBridge` IPC API
exposed as `window.electronDB`.

## Files

| File | Purpose |
|---|---|
| `main.cjs` | Electron entry point. Creates the BrowserWindow and registers IPC handlers. |
| `preload.cjs` | Exposes `window.electronDB` and `window.electronEnv` to the renderer. |
| `db.cjs` | SQLite schema + CRUD helpers. Mirrors the Supabase `public` schema. |

The database file lives at `<userData>/deynpro.db`:
- macOS:  `~/Library/Application Support/<AppName>/deynpro.db`
- Windows: `%APPDATA%\<AppName>\deynpro.db`
- Linux:  `~/.config/<AppName>/deynpro.db`

## One-time setup

```bash
npm install --save-dev electron @electron/packager
npm install better-sqlite3
# Rebuild the native module against Electron's Node version:
npx electron-rebuild -f -w better-sqlite3
```

Add to `package.json`:

```json
{
  "main": "electron/main.cjs",
  "scripts": {
    "electron": "vite build && electron .",
    "electron:pack": "vite build && electron-packager . DeynPro --overwrite --out=electron-release"
  }
}
```

## Using the database from React

```ts
import { electronDB, isElectron } from "@/lib/electronDB";

if (isElectron()) {
  // Insert
  const product = await electronDB.insert("products", {
    user_id: "local",
    name: "Sukari 1kg",
    price: 150,
    cost_price: 120,
    quantity: 50,
  });

  // Select
  const all = await electronDB.select("products", { user_id: "local" });

  // Update
  await electronDB.update("products", { quantity: 49 }, { id: product.id });

  // Delete
  await electronDB.remove("products", { id: product.id });

  // Backup / Restore
  const backup = await electronDB.exportAll();
  await electronDB.importAll(backup);
}
```

## Available tables

`customers`, `suppliers`, `products`, `sales`, `sale_items`, `expenses`,
`expense_categories`, `transactions`, `shop_settings`, `stock_alerts`,
`user_roles` — same column names and types as the Supabase project.

An `AFTER INSERT` trigger on `sale_items` automatically deducts product
stock, mirroring the Supabase `deduct_stock_on_sale` function.

## Notes

- `base: './'` is set in `vite.config.ts` so the built `dist/` works under
  the `file://` protocol used by Electron.
- The PWA service worker is automatically skipped inside Electron (it would
  conflict with `file://`); the SQLite DB replaces it for offline data.
- For browser/PWA mode, `isElectron()` returns false — fall back to Supabase
  or your existing data layer.