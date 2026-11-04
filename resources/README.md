# Native branding sources

`logo.svg` is the first-party dumbbell mark already used in the React header,
adapted to a square source for app icons and splash screens. No third-party
artwork or font is needed.

From the repository root on Node 22+, run `npm run mobile:assets` after generating
both native projects. The pinned Capacitor asset tool writes the platform images
into `ios/` and `android/`. Inspect them before committing.
