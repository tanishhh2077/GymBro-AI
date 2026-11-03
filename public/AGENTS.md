# Public static files

Inherit [root guidance](../AGENTS.md). Follow the
[product brief](../docs/PRODUCT_BRIEF.md) and [decisions](../docs/DECISIONS.md).

- Files here are served publicly without application access checks. Never place
  private workout footage, personal data, credentials, or secrets in this tree.
- Keep runtime model files in `models` and the matching MediaPipe runtime in
  `wasm`; imported interface assets normally belong in `src/assets`.
- Record provenance, version, license, and reproducible acquisition steps when
  adding or replacing third-party runtime assets.
- Upgrade the package, model compatibility, and runtime files as a cohesive change;
  do not mix unexplained versions or manually patch generated vendor files.
- Preserve local runtime loading for the approved on-device milestone. A remote
  model or runtime URL changes network behavior and must be described accurately.
- Add concise local `AGENTS.md` guidance for new authored public subdirectories.
