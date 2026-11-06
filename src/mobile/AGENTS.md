# Native lifecycle boundary

Inherit [source guidance](../AGENTS.md) and the approved mobile design/plan.

- Bridge native app state to the existing store's cancellation/lease cleanup;
  do not create a second session lifecycle or revoke media URLs here.
- Task18 exports manual-record backups through native cache/share or browser
  downloads. Serialize exports, release failed/temporary handles and retain
  successful native share files for asynchronous recipient reads in OS cache.
- Pause attached videos and reset only unfinished processing on native background.
  Keep completed clips in memory; never automatically resume playback/analysis.
- Browser sessions keep existing behavior. Own only this registration's listener,
  including handles delivered after cleanup; never remove other consumers' listeners.
- Test events, real store outcomes, late handles and rejection paths. Native bridge
  fakes do not establish actual iOS/Android behavior or phone performance.
