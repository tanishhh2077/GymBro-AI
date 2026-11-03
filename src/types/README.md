# Shared contracts

`index.ts` defines pose observations, progress/results, session clips, and typed
processing failure stages/kinds. It also contains legacy multi-lift and future
analysis/score types; those declarations are not implemented product capabilities.

Follow [contract rules](AGENTS.md) and the [current specification](../../spec.md).
Keep estimated observations separate from derived measurements and findings.
Update producers and consumers together when changing an interface.
