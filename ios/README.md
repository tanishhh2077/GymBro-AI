# iOS prototype

`App/App.xcodeproj` hosts GymBro AI (`com.gymbroai.app`) through Capacitor 8.6.0.
The React interface, local video handling and pose engine remain in `src/`.
Swift Package Manager references the exact Capacitor release and the root's
installed App plugin. Install root dependencies before opening the project.

From the repository root, using Node 22+:

```sh
npm ci
npm run mobile:sync
```

These commands also work on Windows and prepare the local web bundle; they do
not compile iOS. Native sources/branding and the shared lifecycle/layout work
are implemented; native compilation/device behavior remain unverified. Cloud
native builds are planned in Task 6 Step 4 and have not run.

On macOS with Xcode 26+, the planned unsigned simulator build command is:

```sh
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath build/ios CODE_SIGNING_ALLOWED=NO build
```

An unsigned simulator `.app` cannot be installed on a physical iPhone. Physical
installation/TestFlight/App Store delivery needs Apple signing/provisioning and
a suitable macOS build path. No signing setup or store release is included here.
File selection, background cancellation, offline inference and phone performance
need actual platform/device checks before claiming support.

Use `npm run mobile:assets` after editing `resources/logo.svg`; inspect generated
assets. Never commit copied `App/App/public`, credentials, device media or build
output. See [shared rules](AGENTS.md) and the [current handoff](../docs/HANDOFF.md).
