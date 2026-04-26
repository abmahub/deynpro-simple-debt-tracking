/**
 * Bi-directional sync worker (Electron only).
 *
 * - PUSH: drains the local sync_outbox and replays each mutation against
 *   Supabase. Uses last-write-wins via the row's updated_at timestamp.
 * - PULL: for each table, fetches rows where updated_at > last_pulled_at
 *   and applies them locally via upsertRemote (also LWW).
 *
 * Triggered:
 *   - On app start (after auth)
 *   - Whenever the browser fires `online`
 *   - Periodically (every 60s) as a safety net
 *
 * This file is a NO-OP in the browser PWA (everything is already on Supabase).
 */
import { supabase } from "@/integrations/supabase/client";
import { isElectron, electronSync, type TableName } from "@/lib/electronDB";

const SYNCED_TABLES: TableName[] = [
  "customers",
  "suppliers",
  "products",
  "sales",
  "sale_items",
  "expenses",
  "expense_categories",
  "transactions",
  "shop_settings",
  "stock_alerts",
];

let running = false;
let started = false;

async function pushOnce(): Promise<void> {
  const batch = await electronSync.outboxPeek(50);
  for (const item of batch) {
    try {
      const { table_name, op, row_id, payload } = item;
      if (op === "insert") {
        // Use upsert so re-pushes after partial failures are idempotent.
        const { error } = await (supabase as any)
          .from(table_name)
          .upsert(payload as any, { onConflict: "id" });
        if (error) throw error;
      } else if (op === "update") {
        const { id, ...patch } = payload as any;
        const { error } = await (supabase as any)
          .from(table_name)
          .update(patch)
          .eq("id", row_id);
        if (error) throw error;
      } else if (op === "delete") {
        // Soft-delete on remote so other clients can see the deletion via pull
        const { error } = await (supabase as any)
          .from(table_name)
          .update({ deleted_at: (payload as any).deleted_at || new Date().toISOString() })
          .eq("id", row_id);
        if (error) throw error;
      }
      await electronSync.outboxAck(item.id);
    } catch (err: any) {
      await electronSync.outboxFail(item.id, err?.message || String(err));
      // Stop the batch on the first failure to avoid hammering the network.
      return;
    }
  }
}

async function pullOnce(): Promise<void> {
  for (const table of SYNCED_TABLES) {
    try {
      const since = (await electronSync.getState(table)) || "1970-01-01T00:00:00Z";
      const { data, error } = await (supabase as any)
        .from(table)
        .select("*")
        .gt("updated_at", since)
        .order("updated_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      const rows = (data || []) as Array<Record<string, any>>;
      if (rows.length === 0) continue;
      let maxTs = since;
      for (const row of rows) {
        await electronSync.upsertRemote(table, row);
        if (row.updated_at && row.updated_at > maxTs) maxTs = row.updated_at;
      }
      await electronSync.setState(table, maxTs);
    } catch {
      // Single-table failures shouldn't kill the whole pull cycle
    }
  }
}

export async function syncNow(): Promise<void> {
  if (!isElectron()) return;
  if (running) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  running = true;
  try {
    await pushOnce();
    await pullOnce();
  } finally {
    running = false;
  }
}

/** Call once after the app mounts. Safe to call multiple times. */
export function startSync(): void {
  if (!isElectron() || started) return;
  started = true;
  // Initial run shortly after mount
  setTimeout(() => { void syncNow(); }, 1500);
  // Periodic safety-net
  setInterval(() => { void syncNow(); }, 60_000);
  // React to coming online
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => { void syncNow(); });
  }
}