# Build and packaging tools

Inherit [root guidance](../AGENTS.md) and the mobile design/plan.

- Build tools may inspect generated artifacts; never upload videos, copy private
  data into served assets, or request signing credentials.
- The mobile verifier must fail on missing/stale bundles, remote resource/server
  overrides, wrong app identity and mismatched local model/runtime copies.
- Compare served WASM with the exact installed MediaPipe package; do not patch
  vendor files to make a check pass. Rebuild/sync legitimate app changes.
- Tests use small synthetic files in isolated ignored scratch directories. Check
  the resolved cleanup path before recursively deleting a fixture directory.
- Passing packaging checks is not native compilation or inference validation.
