# Packaging tools

`verify-mobile.mjs` checks both native copies after build/sync: local entrypoints,
matching complete web bundles, expected app identities and byte-identical local
model/runtime assets. It also rejects served Markdown, obvious video/signing files
and remote entrypoint/font resources. This is not a general secret scanner.

Run `npm run mobile:sync` to build, update native copies and verify them, or
`npm run mobile:verify` to check existing copies without modifying them.
`npm test` includes synthetic filesystem failure cases from this directory.
Native compilation, real offline inference and phone performance remain separate.

`check-simulator-screen.swift` is a macOS-only CI smoke check using Apple's local
Vision text recognition. It requires the visible GymBro AI/bench-press interface,
so a blank screen or splash cannot pass merely because the process launched.
It requires both the GymBro brand fragment and bench-press label, tolerating
OCR's observed I/l confusion in the name. The workflow checks its negative path
against the first-party splash image, then
retries actual empty-shell captures with a bound. It never inspects workout media
or calls a paid service. Its compilation/execution must be verified on macOS CI.
