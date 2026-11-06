# iOS prototype

`App/App.xcodeproj` hosts GymBro AI (`com.gymbroai.app`) through Capacitor 8.6.0.
The React interface, local video handling and pose engine remain in `src/`.
Swift Package Manager references the exact Capacitor release and the root's
installed App, Filesystem and Share plugins. Install root dependencies before
opening the project. Task18 embeds `App/App/PrivacyInfo.xcprivacy` as a resource
with filesystem reason C617.1. Its cache/share path needs physical-device testing.

From the repository root, using Node 22+:

```sh
npm ci
npm run mobile:sync
```

These commands also work on Windows and prepare the local web bundle; they do
not compile iOS. Native sources/branding and the shared lifecycle/layout work
are implemented. Master run5 compiled on Xcode26.6 and verified visible startup
on an iPhone17Pro/iOS26.4 simulator. The downloaded screenshot was inspected;
earlier blank/home-screen captures are documented in STATUS. Physical-device
behavior and video inference remain unverified.

On macOS with Xcode 26+, the verified simulator build command is:

```sh
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath build/ios CODE_SIGNING_ALLOWED=NO build
```

The ARM64 linker emits an ad-hoc signature despite disabled Xcode signing; no
Apple identity/team/provisioning is used. This simulator `.app` cannot be
installed on a physical iPhone. Physical
installation/TestFlight/App Store delivery needs Apple signing/provisioning and
a suitable macOS build path. No signing setup or store release is included here.
File selection, background cancellation, offline inference and phone performance
need actual platform/device checks before claiming support.

Run5 artifacts and inspected image are retained locally in ignored
`build/artifacts/run-5/`; GitHub artifacts expire after one day.

Use `npm run mobile:assets` after editing `resources/logo.svg`; inspect generated
assets. Never commit copied `App/App/public`, credentials, device media or build
output. See [shared rules](AGENTS.md) and the [current handoff](../docs/HANDOFF.md).
