import type { PluginListenerHandle } from "@capacitor/core";
import type { ProcessingState } from "@/store/useSessionStore";

export interface NativeLifecycleOptions {
  isNative: boolean;
  app: {
    addListener(
      event: "appStateChange",
      listener: (state: { isActive: boolean }) => void,
    ): Promise<PluginListenerHandle>;
  };
  session: {
    getState(): { processingState: ProcessingState; reset(): void };
  };
  document: Document;
  onError?: (message: string) => void;
}

export function connectNativeLifecycle(options: NativeLifecycleOptions): () => void {
  if (!options.isNative) return () => {};
  const report = options.onError ?? ((message: string) => console.warn(message));
  let disposed = false;
  let owned: PluginListenerHandle | undefined;

  const release = async (handle: PluginListenerHandle) => {
    try { await handle.remove(); }
    catch { report("Could not release the native app-state listener."); }
  };

  try {
    void options.app.addListener("appStateChange", ({ isActive }) => {
      if (disposed || isActive) return;
      for (const video of options.document.querySelectorAll("video")) video.pause();
      const session = options.session.getState();
      // Completed clips stay in memory; the store already owns cancellation
      // and delayed URL release for work that has not finished.
      if (session.processingState !== "idle") session.reset();
    }).then((handle) => {
      if (disposed) void release(handle);
      else owned = handle;
    }, () => {
      if (!disposed) report("Native background handling could not be connected.");
    });
  } catch {
    report("Native background handling could not be connected.");
  }

  return () => {
    if (disposed) return;
    disposed = true;
    if (owned) { void release(owned); owned = undefined; }
  };
}
