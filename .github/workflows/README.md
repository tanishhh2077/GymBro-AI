# Native prototype builds

`mobile-builds.yml` runs shared tests/lint/guarded sync, then compiles Android on
Ubuntu 24.04 (Java 21, installed Android SDK) and iOS on macOS 26 (installed Xcode).
Node comes from `.nvmrc`; dependencies come from the lockfile. Third-party actions
are pinned to exact release commits. No paid runner or Apple signing is used.

Pushes to `feat/task6-mobile-app` or `master` trigger builds when relevant code,
assets or build configuration change; Markdown-only changes do not. Manual
dispatch is defined, but GitHub's UI requires the workflow on the repository's
default branch. That default is still `feat/gymbro-video-landmarks`; this workflow
does not change repository settings. Feature-branch pushes work independently.

Planned artifacts, retained one day:

- `GymBroAI-android-debug-<run number>`: debug APK; an Android test installation
  package, not a Play Store release.
- `GymBroAI-ios-simulator-<run number>`: zipped simulator `.app` plus empty-shell
  startup screenshot when successful. It cannot be installed on a physical iPhone.

Final package checks compare all shared web files against `dist/`. The iOS job
boots an available iPhone simulator, installs/launches the app and captures only
its empty shell. Compilation, launch and screenshot inspection have separate
results; an artifact alone does not establish usable UI, inference or performance.
See [STATUS](../../docs/STATUS.md) for actual runs; the workflow has not run yet.

Download artifacts from the selected run's summary under the repository's Actions
tab. GitHub may require sign-in. Apple provisioning/signing, real phones, file
selection and licensed bench-footage acceptance remain separate work.
