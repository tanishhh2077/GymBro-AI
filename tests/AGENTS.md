# Automated acceptance support

Read [root rules](../AGENTS.md). These tests never change production behavior.
Use real browser media/model behavior for browser checks, not seeded poses.
Keep human footage, paths, frames, traces and pose observations out of Git/CI.
Only the fixed first-party patterns in `fixtures/` belong to the smoke suite.
Adding a private-video workflow requires its own reviewed handling and acceptance.
Keep browser specs out of Vitest discovery; `*.test.ts` helper checks use Vitest.
