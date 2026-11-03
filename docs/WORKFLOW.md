# Working and review workflow

## Start a task

1. Read root and applicable local `AGENTS.md` files, the original product brief, decisions, current status, and relevant architecture/specification sections.
2. Inspect actual repository state, including uncommitted work. Resolve stale documentation by recording the discrepancy; do not overwrite the work to make it match a plan.
3. Explain the next meaningful step, its purpose, and its obvious alternative. Ask "Is this clear?" and wait unless the user explicitly authorized proceeding through that larger step.
4. Before feature code, establish a working development environment and relevant baseline checks. Write a bounded implementation plan only after the design is understood and approved.

## Independent judgment: always applicable

- Accurate reasoning is the goal. Apply the same standard to the user's proposal, the author's earlier decision, and reviewer feedback.
- Disagree when there is a concrete failure mode or better-supported alternative. State the evidence, tradeoff, and recommended response plainly.
- Agree when the reasoning holds. Do not manufacture opposition to appear independent, and do not praise work without a specific reason.
- Mark facts, assumptions, proposed defaults, and accepted decisions explicitly. State uncertainty rather than inventing confidence.
- If new evidence changes a conclusion, say what changed and correct the affected documentation or implementation.

## Elephant: prepare the specification

Elephant is a role, not a particular model. It has the broad conversation and owns the durable project context. For consequential milestones it writes a self-contained `spec.md` with goals, exclusions, current behavior, proposed behavior, data/interface contracts, failure cases, acceptance criteria, verification, prerequisites, and explicit builder discretion.

Keep the original source brief separate. If the user later amends it, record that amendment and its provenance in `DECISIONS.md`. A summary written by Elephant alone is not an independent reference for checking Elephant's fidelity.

## Goldfish: review before implementation

Start a new reviewer with no inherited Elephant conversation. Supply only the original approved brief, accepted amendments, the specification, applicable instructions, and relevant read-only repository access. Do not supply persuasive design commentary or an expected positive verdict. Fresh context reduces anchoring; it does not guarantee independent model errors or scientific correctness.

Reusable prompt:

> You are a fresh specification reviewer. Read the user-supplied product brief, accepted amendments, the current specification, applicable repository instructions, and relevant code. Do not edit files or implement anything. Assess whether the specification faithfully expresses the approved requirements and can be planned without inventing material decisions. Check contradictions, missing inputs/outputs, failure states, privacy, unsupported scientific claims, and testable acceptance criteria. Distinguish blockers, material questions, and nonblocking suggestions. For each issue, identify the requirement or repository evidence, location, realistic consequence, and why the answer changes implementation. Skip builder choices explicitly left open and ordinary details an implementer can settle. No finding quota: report no significant issues if appropriate. State what you inspected, what remains unverified, and whether the spec is ready for implementation planning. A ready verdict does not approve implementation or certify measurement accuracy.

Record the review and disposition. Elephant must check findings, update omissions already answered by source material, and settle minor builder choices transparently. Bring only material unanswered user decisions back to the user. Do not silently treat Goldfish's suggestions as requirements.

## Implement a bounded task

- Give each worker an explicit goal, allowed paths, interfaces, acceptance criteria, and verification expectations. Workers read scoped guidance and report blockers to the coordinator.
- Build a small end-to-end result. Do not expand scope because an unrelated improvement is nearby.
- Exercise real failure paths and use meaningful automated checks appropriate to the change. Mocked inference verifies plumbing, not actual landmark accuracy.
- Record algorithm/model versions, relevant runtime/delegate, sampling, and tolerances when measuring behavior. Never invent benchmark results.

## Critical review after code implementation

A separate fresh reviewer checks the actual changed code against the approved specification after the implementer runs relevant checks. "Mean review" means rigorous scrutiny; keep the tone professional and the findings evidence-based. Do not require a minimum issue count.

Reusable prompt:

> Review this implementation independently against the approved specification and applicable instructions. Inspect the diff and surrounding code; do not rely on the author's success claim. Find concrete correctness, lifecycle, privacy, uncertainty/evidence, synchronization, or regression problems. For each finding provide severity, file/line, a realistic trigger, resulting failure, and supporting code evidence or reproduction. Separate confirmed defects from unverified concerns. Treat meaningful unsupported product claims as defects. Do not invent issues or use hostility. Report checks performed and verification limits, and say explicitly if no significant findings are found. Do not make unrequested code changes.

Review severity:

- Critical: serious privacy/security exposure, destructive data loss, or equivalent immediate harm.
- High: supported core workflow fails or an accepted essential requirement is violated.
- Medium: a material bounded failure or regression with a limited trigger/workaround.
- Low: a nonblocking defect or clearly justified improvement; formatting normally belongs to tooling.

The implementer evaluates every finding. Fix supported defects or document an evidence-backed disagreement. Re-run affected checks after fixes and confirm the reported failure is addressed. Record residual risks. No milestone is complete while an acceptance-blocking issue is unresolved. Avoid repeated full review cycles when no material changes or concerns justify them.

## Context handoff

Start a fresh session with [HANDOFF.md](HANDOFF.md), root instructions, and
the relevant local README/rules. Codex reads `AGENTS.md` directly; Claude Code
reads the adjacent `CLAUDE.md`, whose only line imports `AGENTS.md`. Do not
duplicate the full policy. Provider-specific skills and agent tools are not
prerequisites for the other provider.

Either provider may implement or review any task; the user chooses whichever has
more remaining usage ([D-016](DECISIONS.md#d-016-provider-neutral-documentation-first-continuity)).
Independence comes from a fresh session that sees only the documents and the
repository, never the implementer's conversation. Record the real tool, model, and
review limits; do not substitute a paid API or claim more independence than the
session had.

The documents are the only handoff, so write them for a reader with no chat
history. Before reporting a chunk done, check that a new agent could answer from
the Markdown alone: what the project is, how the repository is laid out, what is
implemented and verified, what changed last, and what the next task is.

Keep one writer in the shared checkout and reviewers read-only. Preserve modified
and untracked work, including tests written before implementation. A new clone or
worktree based only on HEAD may not include the current prototype changes.

The first response in a new session must preserve the teaching checkpoint:
explain the next meaningful step and wait for understanding before coding, unless
the handoff records explicit task-specific approval to proceed through that step.
README files describe each directory; they are not substitutes for the approved
brief/specification or shared agent rules.

Update `STATUS.md` with the outcome, changed paths, commands actually run and results, checks not run, limitations, unresolved review findings, prerequisites, and the next concrete action. Update architecture/decisions when their facts change. Keep one clear next task; the full vision belongs in the brief.

Also refresh the concise `HANDOFF.md` and actual plan progress after each work
chunk. Then commit and push that chunk on the feature branch, and fast-forward
`master` after each reviewed plan task ([D-018](DECISIONS.md#d-018-regular-commits-and-reviewed-merges-to-master)),
so the pushed history and the documents describe the same state. Keep old detailed command evidence in STATUS so repeated startup does not
require loading the entire development history.

Do not equate "implemented," "compiled," "mock-tested," "tested with real video," "benchmarked on a phone," and "ready to ship." Record exactly which claim the evidence supports.

These documents guide future sessions. They do not themselves schedule reviewers, configure a CI gate, or guarantee automatic instruction loading in every tool. Read scoped files explicitly and invoke the review when the relevant stage is reached.
