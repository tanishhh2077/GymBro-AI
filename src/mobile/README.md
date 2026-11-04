# Native lifecycle integration

`nativeLifecycle.ts` connects Capacitor app-state events to video pausing and the
existing store's cancellation path. App composition owns its registration and
cleanup. Browser sessions do not register; returning to the foreground does not
automatically restart playback or processing.

Completed clips stay in memory until removal or process termination. This is not
persistent storage. Contract tests fake the native bridge and media APIs; device
background/file-picker behavior still needs real platform verification.
