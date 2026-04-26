/// <reference types="vite/client" />

import type { ElectronDBApi } from "@/lib/electronDB";

declare global {
  interface Window {
    electronDB?: ElectronDBApi;
    electronEnv?: { isElectron: true; platform: string };
  }
}

export {};
