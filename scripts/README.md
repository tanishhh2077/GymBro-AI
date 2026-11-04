# Packaging tools

`verify-mobile.mjs` checks both native copies after build/sync: local entrypoints,
matching complete web bundles, expected app identities and byte-identical local
model/runtime assets. It also rejects served Markdown, obvious video/signing files
and remote entrypoint/font resources. This is not a general secret scanner.

Run `npm run mobile:sync` to build, update native copies and verify them, or
`npm run mobile:verify` to check existing copies without modifying them.
`npm test` includes synthetic filesystem failure cases from this directory.
Native compilation, real offline inference and phone performance remain separate.
