# Build workflows

Inherit [automation guidance](../AGENTS.md).

- `browser-checks.yml` owns only fixed-pattern browser smoke plus shared checks.
  It must not load human media or upload any browser captures/logs/artifacts.
  Its checks establish no-person browser behavior, not native or bench acceptance.
- The remaining rules below govern `mobile-builds.yml` native jobs.

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
