import { Capacitor } from "@capacitor/core";

export interface RegistrationEnvironment {
  isProduction: boolean;
  isNative: boolean;
  isSecureContext: boolean;
  baseUrl: string;
  serviceWorker?: { register(url: string, options: { scope: string }): Promise<unknown> };
  warn(message: string): void;
}

/** Resolves true only when the offline worker was registered; never rejects. */
export async function registerServiceWorker(env: RegistrationEnvironment): Promise<boolean> {
  try {
    // The native app serves its own local bundle; a worker there could keep
    // serving an old copy after an app update. The dev server has no worker.
    if (env.isNative || !env.isProduction || !env.isSecureContext || !env.serviceWorker) return false;
    await env.serviceWorker.register(`${env.baseUrl}sw.js`, { scope: env.baseUrl });
    return true;
  } catch {
    env.warn("GymBro AI could not enable offline start; the app still works online.");
    return false;
  }
}

export function registerServiceWorkerAfterLoad(): void {
  const run = () => {
    void registerServiceWorker({
      isProduction: import.meta.env.PROD,
      get isNative() { return Capacitor.isNativePlatform(); },
      isSecureContext: window.isSecureContext,
      baseUrl: import.meta.env.BASE_URL,
      serviceWorker: "serviceWorker" in navigator ? navigator.serviceWorker : undefined,
      warn: (message) => console.warn(message),
    });
  };
  // Waiting for load keeps the worker's shell downloads from competing with
  // the first visit's own requests.
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
}
