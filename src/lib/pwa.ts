import { Workbox } from "workbox-window";

type UpdateHandler = (reloadFn: () => void) => void;

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com") ||
    window.location.hostname.includes("lovable.app"));

export function registerServiceWorker(onUpdateAvailable: UpdateHandler) {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  // Never register the SW inside the editor preview / iframes.
  // Also unregister any stale SWs that may have been installed in those contexts.
  if (isPreviewHost || isInIframe || import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations?.().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    return;
  }

  const wb = new Workbox("/sw.js");

  wb.addEventListener("waiting", () => {
    onUpdateAvailable(() => {
      wb.addEventListener("controlling", () => window.location.reload());
      wb.messageSkipWaiting();
    });
  });

  wb.register().catch((err) => {
    console.warn("SW registration failed:", err);
  });
}