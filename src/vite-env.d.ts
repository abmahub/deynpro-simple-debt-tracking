/// <reference types="vite/client" />

declare global {
  interface Window {
    electronDB?: {
      select: (table: string, filters?: Record<string, unknown>) => Promise<any[]>;
      insert: (table: string, values: Record<string, unknown>) => Promise<any>;
      update: (table: string, values: Record<string, unknown>, filters: Record<string, unknown>) => Promise<{ changes: number }>;
      remove: (table: string, filters: Record<string, unknown>) => Promise<{ changes: number }>;
      exportAll: () => Promise<{ app: string; version: number; exportedAt: string; data: Record<string, unknown[]> }>;
      importAll: (payload: unknown) => Promise<{ ok: true }>;
      raw: (sql: string, params?: unknown[]) => Promise<any>;
    };
    electronEnv?: { isElectron: true; platform: string };
  }
}

export {};
