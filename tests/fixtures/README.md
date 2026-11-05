# First-party generated patterns

Only solid black pixels, no people, audio or third-party content. Generated
internally using FFmpeg 7.1 / libx264, H.264 MP4, yuv420p, 30 fps. Redistribution
as project test assets is permitted. Exported byte-for-byte from Task 4 `34538e4`;
that unfinished branch is not merged. No human fixture is accepted here.

| File | Dimensions / seconds | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `no-person.mp4` | 320x180 / 4 | 4890 | `1c2088bb6706fd6e4594d3951f8187a2c7cedacedf321628fce539193773b802` |
| `no-person-portrait.mp4` | 160x240 / 2 | 3216 | `8d94beb8ecdf3cff4cb2375cd9487be645e83c5ecd871f2f2ded5d965355a3c6` |
| `over-duration.mp4` | 320x180 / 61 | 52626 | `d1ecf3e02ecb7eb5a2e17bdb4a604b0e478523dd477b73796f2b5cdd414c87ab` |
| `over-long-edge.mp4` | 1922x2 / 1 | 2391 | `e09146f6d59f10eb4065e6c270b40f9a81ce5c4d92215953bff47cba6fbe9c00` |
| `over-pixels.mp4` | 1920x1082 / 0.2 | 2374 | `da10e4153dbc57d0bcb49607fa0b99c5c3b7b79586959ad4211f430e6a3adc7c` |

Generation template (substitute dimensions, duration and output filename):

```text
ffmpeg -f lavfi -i color=c=black:s=320x180:r=30:d=4 -an -c:v libx264 -pix_fmt yuv420p -map_metadata -1 -movflags +faststart -fflags +bitexact -flags:v +bitexact -n no-person.mp4
```

Re-encoding with another build may change bytes. Do not rewrite hashes merely to
accept an unrelated input. `verify-fixtures.ts` checks regular files, lengths and
hashes before browser tests. These patterns cannot show useful human landmarks.
