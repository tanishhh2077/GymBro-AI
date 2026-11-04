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

Artifacts, retained one day:

- `GymBroAI-android-debug-<run number>`: debug APK; an Android test installation
  package, not a Play Store release.
- `GymBroAI-ios-simulator-<run number>`: zipped simulator `.app` plus empty-shell
  startup screenshot when successful. It cannot be installed on a physical iPhone.

Final package checks compare all shared web files against `dist/`. The iOS job
boots an available iPhone simulator, installs/launches the app and captures only
its empty shell. A local macOS Vision text check must reject the first-party
splash and recognize the GymBroAI/bench-press interface in bounded captures.
Foreground launch completes before UI retries. Unbuffered App stdout/stderr are
collected from simulator data/tmp; supplemental system logs and only fresh crash
reports matching this app are printed for startup failures. No workout
image is inspected and no paid OCR service is called. Compilation, launch and
screen inspection have separate results; none establishes inference/performance.
Run1 compiled both platforms but its startup PNG was blank despite green jobs;
run2's visual guard correctly failed on home-screen captures. With foreground
launch and bounded readiness retries, [run3](https://github.com/tanishhh2077/GymBro-AI/actions/runs/41778715047)
passed all jobs, rendered the actual iPhone17Pro/iOS26.4 interface, and its image
was manually inspected. No application-code change was required. The ARM64 linker
emits an ad-hoc signature without an Apple team/identity; this is simulator output.
Both artifacts were downloaded/hash-verified and are retained locally in ignored
`build/artifacts/run-3/`. Native video/device checks remain separate. See
[STATUS](../../docs/STATUS.md) for actual runs and unresolved checks.

Download artifacts from the selected run's summary under the repository's Actions
tab. GitHub may require sign-in. Apple provisioning/signing, real phones, file
selection and licensed bench-footage acceptance remain separate work.
