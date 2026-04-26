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

export function registerServiceWorker(_onUpdateAvailable?: UpdateHandler) {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  // Disable service worker in dev, preview, and iframe environments
  if (isPreviewHost || isInIframe || import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations?.().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    return;
  }

  // Production safety: DO NOT use Workbox (prevents crash)
  // If you want PWA later, we can re-add it properly

  console.log("Service worker skipped (safe mode enabled)");
}