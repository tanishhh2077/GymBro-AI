# Shared contracts

`index.ts` defines pose observations, progress/results, session clips, and typed
processing failure stages/kinds. The lift, view and source types hold only the
supported `bench`, `side` and `upload` values; the legacy multi-lift and
analysis/score types were removed (D-028).

Follow [contract rules](AGENTS.md) and the [current specification](../../spec.md).
Keep estimated observations separate from derived measurements and findings.
Update producers and consumers together when changing an interface.
