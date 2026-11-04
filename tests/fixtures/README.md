# Fixture setup

No human bench-press fixture is accepted yet. Search evidence is in
[FIXTURE_SEARCH.md](../../docs/FIXTURE_SEARCH.md). Full bench acceptance must fail
with setup guidance until a suitable licensed clip is established.

The planned `manifest.json` follows the `BenchFixture` type in
[benchFixture.ts](benchFixture.ts): `id`, lowercase `sha256`, `bytes`,
`container: "mp4"`, `codec: "h264"`, `durationSeconds`, `width`, `height`,
`orientation` (`landscape`, `portrait`, or `square`), nonempty `source` and
`permission` descriptions, `redistribution` (`external-only` or `permitted`),
and three distinct in-range `referenceTimesSeconds`. Keep the
actual human recording outside Git; `GYMBRO_E2E_VIDEO` supplies its local path.
Do not manufacture the manifest merely to get a green run.

The loader validates fields, pilot bounds, byte length, and SHA-256. It does not
verify legal rights, actual codec, or anatomical accuracy. Human permission review
and real-browser/manual acceptance are still required. Its unit tests use arbitrary
bytes explicitly labeled as test data; they are not a video fixture.

## Committed generated patterns

These contain only solid black pixels, no people, audio, or third-party content.
They were generated internally for testing with FFmpeg 7.1 / libx264, H.264 MP4,
yuv420p, 30 fps. Redistribution as project test assets is permitted. They cannot
replace a real bench recording or demonstrate useful pose observations.

| File | Size/duration | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `no-person.mp4` | 320x180 / 4 s | 4890 | `1c2088bb6706fd6e4594d3951f8187a2c7cedacedf321628fce539193773b802` |
| `no-person-portrait.mp4` | 160x240 / 2 s | 3216 | `8d94beb8ecdf3cff4cb2375cd9487be645e83c5ecd871f2f2ded5d965355a3c6` |
| `over-duration.mp4` | 320x180 / 61 s | 52626 | `d1ecf3e02ecb7eb5a2e17bdb4a604b0e478523dd477b73796f2b5cdd414c87ab` |
| `over-long-edge.mp4` | 1922x2 / 1 s | 2391 | `e09146f6d59f10eb4065e6c270b40f9a81ce5c4d92215953bff47cba6fbe9c00` |
| `over-pixels.mp4` | 1920x1082 / 0.2 s | 2374 | `da10e4153dbc57d0bcb49607fa0b99c5c3b7b79586959ad4211f430e6a3adc7c` |

Generation template (substitute the size/duration and target from the table):

```text
ffmpeg -f lavfi -i color=c=black:s=320x180:r=30:d=4 -an -c:v libx264 -pix_fmt yuv420p -map_metadata -1 -movflags +faststart -fflags +bitexact -flags:v +bitexact -n no-person.mp4
```

Generated files are committed so Claude Code and Codex do not need the original
session's portable encoder. Re-encoding with a different FFmpeg build may change
bytes; inspect and update checksums if intentionally replacing these assets.
