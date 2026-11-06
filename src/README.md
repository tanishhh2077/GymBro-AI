# Application source

React/TypeScript shared app for GymBro AI's browser/native prototypes. `main.tsx`
starts React through `AccountRoot.tsx`, which selects the guest/account library.
`App.tsx` connects the interface, native lifecycle and session store;
CSS supplies presentation, including device safe areas.

- [components](components/README.md): inputs, playback, overlay, elbow timeline
  and clip summary with supporting timestamp jumps.
- [core](core/README.md): media helpers, pose engine, image-space measurements, tests.
- [store](store/README.md): session and media ownership.
- [types](types/README.md): shared data contracts.
- [assets](assets/README.md): imported interface assets.
- [mobile](mobile/README.md): native app-state registration and owned cleanup.

Read [local rules](AGENTS.md) and the [current handoff](../docs/HANDOFF.md).
Run checks from the repository root using [documented commands](../README.md#automated-tests).
