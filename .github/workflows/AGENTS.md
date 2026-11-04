# Mobile build workflow

Inherit [automation guidance](../AGENTS.md).

- Run shared checks before native jobs. Regenerate ignored web/config/plugin
  copies from the locked dependencies, then enforce `mobile:verify`.
- Compile Android debug APKs and iOS simulator apps only. An iOS simulator app
  is not an iPhone install/IPA. Do not add release signing or deployment.
- Verify final compiled packages contain the shared web assets byte-for-byte.
- Capture only the simulator's empty startup shell; no imported human videos.
- Use explicit artifact paths, one-day retention, bounded job time and read-only
  repository permissions. Never upload a whole workspace, build tree or home.
- Validate workflow syntax locally when possible; real run logs/results establish
  native compiler behavior. Preserve useful artifact evidence on startup failure.
