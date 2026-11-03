# Project documentation

Read [root instructions](../AGENTS.md) first.

- Preserve [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) unchanged as the user's original source. Record approved amendments in [DECISIONS.md](DECISIONS.md), with provenance and supersession where needed.
- [ARCHITECTURE.md](ARCHITECTURE.md) owns the current system map and intended boundaries. Label proposals explicitly.
- [STATUS.md](STATUS.md) owns current implementation facts, verification evidence/limits, blockers, and one next task. Keep historical chatter out.
- [WORKFLOW.md](WORKFLOW.md) owns reusable independent-judgment, specification-review, implementation-review, and handoff procedures.
- Root [spec.md](../spec.md) owns the bounded current milestone's proposed behavior and acceptance criteria. Its review status and implementation approval are separate.
- `superpowers/plans/` owns reviewable implementation sequences and interface/test decisions. Keep future commands and proposed dependency/default choices clearly distinct from executed work.
- Document future behavior as planned; never mark a feature implemented because a type, dependency, or screenshot exists.
- Keep source references relative, links valid, and the loading path concise. Do not duplicate all requirements across files.
- Reviews may identify no significant issues. Never manufacture findings or hide unresolved blockers to produce a positive review.
- Keep identifiable videos, credentials, and private logs out of documentation and fixtures.
- When changing a decision, update affected documents and explain the reason. Do not rewrite history to make an earlier proposal look approved.
