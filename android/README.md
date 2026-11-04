# Android prototype

The Capacitor 8.6.0 wrapper embeds GymBro AI (`com.gymbroai.app`). Shared React
code and local pose processing stay in `src/`; `MainActivity` hosts the WebView.
The generated project targets SDK 36, with minimum SDK 24, Gradle 8.14.3 and
Android Gradle plugin 8.13.0. Use Java 21 and an installed Android SDK to compile.

From the repository root on Node 22+:

```sh
npm ci
npm run mobile:sync
```

With Java/Android SDK configured, the planned Windows build is:

```powershell
Set-Location android
.\gradlew.bat assembleDebug
```

On Linux/macOS, use `./gradlew assembleDebug` inside `android/`. Expected output:
`app/build/outputs/apk/debug/app-debug.apk`. These native build commands have not
run in this checkout: this Windows environment lacks an Android SDK/emulator. Task 6
Step 4 plans cloud builds. Debug compilation does not prove file selection,
inference, background cleanup or performance on an actual phone.

Run `npm run mobile:assets` at the root after editing `resources/logo.svg`.
Do not commit SDK locations, signing material, copied web assets or builds.
Generated template arithmetic/package-name example tests were removed because
they do not verify GymBro AI. Real device acceptance remains separate.
See [shared rules](AGENTS.md) and the [current handoff](../docs/HANDOFF.md).
