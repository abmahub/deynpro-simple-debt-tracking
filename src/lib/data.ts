/**
 * Unified data adapter for DeynPro.
 *
 * In Electron: every read/write goes through the local SQLite DB.
 *   - Writes are also enqueued to the sync_outbox so the sync worker can
 *     replay them against Supabase when the network is available.
 *   - Reads NEVER hit the network — the app stays responsive offline.
 *
 * In the browser (PWA / web preview): everything goes straight to Supabase.
 *
 * Hooks should import from this file instead of calling supabase directly.
 */
import { supabase } from "@/integrations/supabase/client";
import { electronDB, isElectron, type TableName } from "@/lib/electronDB";
import { getCachedUserId } from "@/lib/localAuth";

// ---------- helpers ----------

function nowIso() {
  return new Date().toISOString();
}

function genId() {
  // Prefer crypto.randomUUID where available (modern Chromium / Electron)
  // Fallback: time-based pseudo-uuid; collisions are astronomically unlikely.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as any).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Resolve the current user id without touching the network when offline. */
export async function getCurrentUserId(): Promise<string | null> {
  // Try the cached id first — works offline in Electron
  const cached = getCachedUserId();
  if (cached) return cached;
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

function enqueueOutbox(
  table: TableName,
  op: "insert" | "update" | "delete",
  rowId: string,
  payload: Record<string, unknown>
) {
  // Fire-and-forget: outbox failures must not block the UI write.
  try {
    (window as any).electronSync
      ?.outboxPeek; // touch to ensure preload exposed it
    void (window as any).electronSync
      ?.["outboxEnqueueProxy"]; // no-op
  } catch { /* ignore */ }
  // Use the public helper instead
  void (window as any).electronSync &&
    void (async () => {
      try {
        // We added this via main.cjs even though there's no dedicated public
        // wrapper — call it through the IPC namespace exposed by preload.
        await (window as any).electronSync.__enqueue?.(table, op, rowId, payload);
      } catch { /* outbox is best-effort */ }
    })();
}

// ---------- core CRUD adapter ----------

export interface SelectOptions {
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  /** Restrict to current user when running on Supabase (RLS handles it but keeps queries small). */
  userScoped?: boolean;
}

/**
 * Generic select for a single table. Joins are NOT handled here — use the
 * dedicated helpers below (e.g. `selectSalesWithRelations`).
 */
export async function dbSelect<T = any>(table: TableName, opts: SelectOptions = {}): Promise<T[]> {
  if (isElectron()) {
    const filters = { ...(opts.filters || {}) };
    const rows = await electronDB.select<T>(table, filters);
    let out = (rows as any[]).filter((r) => !r.deleted_at);
    if (opts.orderBy) {
      const { column, ascending = true } = opts.orderBy;
      out = [...out].sort((a, b) => {
        const av = a[column], bv = b[column];
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        return ascending ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
      });
    }
    return out as T[];
  }

  let q: any = supabase.from(table).select("*").is("deleted_at", null);
  if (opts.filters) {
    for (const [k, v] of Object.entries(opts.filters)) q = q.eq(k, v as any);
  }
  if (opts.orderBy) {
    q = q.order(opts.orderBy.column, { ascending: opts.orderBy.ascending ?? true });
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as T[];
}

export async function dbSelectOne<T = any>(
  table: TableName,
  filters: Record<string, unknown>
): Promise<T | null> {
  const rows = await dbSelect<T>(table, { filters });
  return rows[0] ?? null;
}

export async function dbInsert<T = any>(
  table: TableName,
  values: Record<string, unknown>
): Promise<T> {
  if (isElectron()) {
    const userId = (await getCurrentUserId()) || "local";
    const row = {
      id: genId(),
      user_id: userId,
      created_at: nowIso(),
      updated_at: nowIso(),
      deleted_at: null,
      ...values,
    };
    const inserted = await electronDB.insert<T>(table, row as any);
    enqueueOutbox(table, "insert", (inserted as any).id, inserted as any);
    return inserted;
  }

  const userId = await getCurrentUserId();
  const payload = userId && !("user_id" in values) ? { ...values, user_id: userId } : values;
  const { data, error } = await supabase.from(table).insert(payload as any).select().single();
  if (error) throw error;
  return data as T;
}

export async function dbUpdate(
  table: TableName,
  id: string,
  values: Record<string, unknown>
): Promise<void> {
  if (isElectron()) {
    const patch = { ...values, updated_at: nowIso() };
    await electronDB.update(table, patch, { id });
    enqueueOutbox(table, "update", id, { id, ...patch });
    return;
  }
  const { error } = await supabase.from(table).update(values as any).eq("id", id);
  if (error) throw error;
}

export async function dbDelete(table: TableName, id: string): Promise<void> {
  if (isElectron()) {
    // Soft delete locally so sync can propagate the deletion
    await electronDB.remove(table, { id });
    enqueueOutbox(table, "delete", id, { id, deleted_at: nowIso() });
    return;
  }
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

// ---------- relation helpers (mimic Supabase's join syntax) ----------

/** Attach a single related row by foreign key (e.g. each product → its supplier name). */
export async function attachOne<T extends Record<string, any>>(
  rows: T[],
  fk: keyof T,
  table: TableName,
  alias: string,
  fields: string[] = ["name"]
): Promise<T[]> {
  const ids = Array.from(new Set(rows.map((r) => r[fk]).filter(Boolean))) as string[];
  if (ids.length === 0) return rows.map((r) => ({ ...r, [alias]: null }));

  let related: any[] = [];
  if (isElectron()) {
    const all = await electronDB.select(table);
    related = all.filter((r: any) => ids.includes(r.id) && !r.deleted_at);
  } else {
    const { data, error } = await supabase.from(table).select("*").in("id", ids).is("deleted_at", null);
    if (error) throw error;
    related = data || [];
  }
  const map = new Map(related.map((r) => [r.id, r]));
  return rows.map((r) => {
    const match = map.get(r[fk] as string);
    if (!match) return { ...r, [alias]: null };
    const slim: Record<string, any> = {};
    for (const f of fields) slim[f] = match[f];
    return { ...r, [alias]: slim };
  });
}

/** Attach many related rows by reverse FK (e.g. each sale → its sale_items). */
export async function attachMany<T extends Record<string, any>>(
  rows: T[],
  parentIdField: keyof T,
  childTable: TableName,
  childFk: string,
  alias: string
): Promise<T[]> {
  const ids = rows.map((r) => r[parentIdField] as string);
  if (ids.length === 0) return rows;

  let children: any[] = [];
  if (isElectron()) {
    const all = await electronDB.select(childTable);
    children = all.filter((c: any) => ids.includes(c[childFk]) && !c.deleted_at);
  } else {
    const { data, error } = await supabase.from(childTable).select("*").in(childFk, ids).is("deleted_at", null);
    if (error) throw error;
    children = data || [];
  }
  const grouped = new Map<string, any[]>();
  for (const c of children) {
    const k = c[childFk];
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(c);
  }
  return rows.map((r) => ({ ...r, [alias]: grouped.get(r[parentIdField] as string) || [] }));
}

// Re-export for convenience
export { isElectron };