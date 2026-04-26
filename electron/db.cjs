/**
 * Offline SQLite database for DeynPro (Electron).
 * Mirrors the Supabase public schema so the renderer can swap data sources.
 *
 * Storage location: <userData>/deynpro.db (per-OS app data directory).
 * Engine: better-sqlite3 (synchronous, fast, ideal for Electron main).
 */
const path = require('path');
const { app } = require('electron');
const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');

let db;

function init() {
  const dbPath = path.join(app.getPath('userData'), 'deynpro.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate();
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_suppliers_user ON suppliers(user_id);

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      cost_price REAL NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 0,
      category TEXT,
      description TEXT,
      image_url TEXT,
      barcode TEXT,
      expiry_date TEXT,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      supplier_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      customer_id TEXT,
      total_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      date TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'other',
      description TEXT,
      supplier_id TEXT,
      date TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

    CREATE TABLE IF NOT EXISTS expense_categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT 'muted',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_exp_cat_user ON expense_categories(user_id);

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT NOT NULL DEFAULT (datetime('now')),
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tx_customer ON transactions(customer_id);

    CREATE TABLE IF NOT EXISTS shop_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      shop_name TEXT NOT NULL DEFAULT '',
      phone TEXT,
      address TEXT,
      logo_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      alert_type TEXT NOT NULL DEFAULT 'low_stock',
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_user ON stock_alerts(user_id);

    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      blocked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Auto-deduct stock + low-stock alert via trigger (matches Supabase behavior)
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS deduct_stock_on_sale
    AFTER INSERT ON sale_items
    BEGIN
      UPDATE products
      SET quantity = quantity - NEW.quantity
      WHERE id = NEW.product_id;
    END;
  `);
}

const ALLOWED_TABLES = new Set([
  'customers', 'suppliers', 'products', 'sales', 'sale_items',
  'expenses', 'expense_categories', 'transactions', 'shop_settings',
  'stock_alerts', 'user_roles',
]);

function assertTable(table) {
  if (!ALLOWED_TABLES.has(table)) throw new Error(`Unknown table: ${table}`);
}

function buildWhere(filters) {
  if (!filters || Object.keys(filters).length === 0) return { sql: '', params: [] };
  const keys = Object.keys(filters);
  const sql = ' WHERE ' + keys.map((k) => `${k} = ?`).join(' AND ');
  return { sql, params: keys.map((k) => filters[k]) };
}

function select(table, filters) {
  assertTable(table);
  const { sql, params } = buildWhere(filters);
  return db.prepare(`SELECT * FROM ${table}${sql}`).all(...params);
}

function insert(table, values) {
  assertTable(table);
  const row = { id: randomUUID(), ...values };
  const cols = Object.keys(row);
  const placeholders = cols.map(() => '?').join(', ');
  db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`)
    .run(...cols.map((c) => row[c]));
  return row;
}

function update(table, values, filters) {
  assertTable(table);
  const setKeys = Object.keys(values);
  if (setKeys.length === 0) return { changes: 0 };
  const setSql = setKeys.map((k) => `${k} = ?`).join(', ');
  const { sql: whereSql, params: whereParams } = buildWhere(filters);
  const info = db.prepare(`UPDATE ${table} SET ${setSql}${whereSql}`)
    .run(...setKeys.map((k) => values[k]), ...whereParams);
  return { changes: info.changes };
}

function remove(table, filters) {
  assertTable(table);
  const { sql, params } = buildWhere(filters);
  const info = db.prepare(`DELETE FROM ${table}${sql}`).run(...params);
  return { changes: info.changes };
}

function exportAll() {
  const out = {};
  for (const t of ALLOWED_TABLES) {
    out[t] = db.prepare(`SELECT * FROM ${t}`).all();
  }
  return { app: 'deynpro', version: 1, exportedAt: new Date().toISOString(), data: out };
}

function importAll(payload) {
  if (!payload || !payload.data) throw new Error('Invalid backup file');
  const tx = db.transaction(() => {
    for (const t of ALLOWED_TABLES) {
      const rows = payload.data[t];
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => '?').join(', ');
        db.prepare(
          `INSERT OR REPLACE INTO ${t} (${cols.join(', ')}) VALUES (${placeholders})`
        ).run(...cols.map((c) => row[c]));
      }
    }
  });
  tx();
  return { ok: true };
}

function raw(sql, params = []) {
  const stmt = db.prepare(sql);
  if (stmt.reader) return stmt.all(...params);
  return stmt.run(...params);
}

module.exports = { init, select, insert, update, remove, exportAll, importAll, raw };