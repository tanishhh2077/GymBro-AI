# Native lifecycle integration

`workoutBackupExport.ts` handles Task18's manual JSON downloads and native
cache/share-sheet export. Filesystem 8.1.5 and Share 8.0.3 are pinned. Successful
native handoff files stay in OS-managed cache for recipient access. Failed exports
attempt cleanup. Browser object URLs expire after download admission. Native
file-saving behavior needs the coordinated physical-phone test.

`nativeLifecycle.ts` connects Capacitor app-state events to video pausing and the
existing store's cancellation path. App composition owns its registration and
cleanup. Browser sessions do not register; returning to the foreground does not
automatically restart playback or processing.

Completed clips stay in memory until removal or process termination. This is not
persistent storage. Contract tests fake the native bridge and media APIs; device
background/file-picker behavior still needs real platform verification.
