# End-to-end checks

Follow [test guidance](../AGENTS.md).

- Assert visible controls/errors and the real processing lifecycle.
- Do not seed successful poses, intercept model assets, or replace inference.
- Block external fonts for repeatability; observe requests separately from blocks.
- Treat no-person synthetic media as decoding/failure evidence only.
- Keep setup errors actionable. Full bench acceptance must fail if its permitted
  media, provenance, or checksum is missing; never skip it or fake success.
- Use event/state waits and bounded deadlines rather than arbitrary sleeps.
