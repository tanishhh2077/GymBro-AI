# Android native wrapper

Inherit [root guidance](../AGENTS.md); scope is D-022 and the mobile design/plan.

- This project embeds the shared React build. Keep analysis, UI and admission
  policy in `src/`; do not add backend/video transfers or a second analyzer.
- Preserve `com.gymbroai.app` / GymBro AI. Use debug builds for prototype checks;
  no release keystore, signing password, store deployment or paid build service.
- Use `npm run mobile:sync` at the root after shared/plugin changes. Capacitor
  manages `capacitor.settings.gradle`, `app/capacitor.build.gradle`, copied assets
  and config. Do not hand-edit generated web/plugin copies.
- Never commit `local.properties`, SDK paths, Gradle caches/builds, copied
  `app/src/main/assets/public`, private media, or signing material.
- This guidance covers generated native subdirectories; do not put Markdown
  inside served assets or Android resource directories.
- Source generation/sync is not Android compilation or device verification.
  Record actual SDK/Java/build and video/device results separately.
