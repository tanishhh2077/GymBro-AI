# MediaPipe runtime assets

Inherit [public-file guidance](../AGENTS.md). Follow the
[product brief](../../docs/PRODUCT_BRIEF.md) and [decisions](../../docs/DECISIONS.md).

- These JavaScript and WebAssembly files are vendor runtime artifacts served for
  on-device inference. Do not manually edit or reformat their contents.
- Refresh the compatible runtime set from the resolved `@mediapipe/tasks-vision`
  package when upgrading; keep JavaScript loaders and their binaries together.
- Record the exact source package/version and reproducible copy steps. Preserve
  upstream license information and use checksums when recording artifact identity.
- Do not assume files match because their names match. Verify compatibility with
  the package, selected model, GPU path, and CPU fallback after an upgrade.
- Document device/runtime failures as observed; do not claim phone support from a
  desktop result. Mobile scaffolding remains outside the current milestone.
- Keep this tree free of private data and unrelated generated output.
