# Repository automation

Inherit [root guidance](../AGENTS.md) and the mobile design/plan.

- Use standard GitHub-hosted public-repository runners; no larger/paid runners,
  enrollment, signing credentials, store deployment or publishing steps.
- Pin third-party actions to verified commit SHAs; minimize token permissions and
  avoid credential persistence, unneeded caches and broad artifact paths.
- Keep artifacts limited to compiled prototypes and empty-shell verification.
  No workout footage, observations, private logs, SDK paths or signing material.
- Source generation, shared checks, native compilation, simulator startup and
  physical-device acceptance are separate evidence. Report each honestly.
