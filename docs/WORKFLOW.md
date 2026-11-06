# Working and review workflow

The root AGENTS.md Development pace section governs task size, documentation,
checks and review depth. The user requested this faster cadence on 2026-11-05.

## Start a task

1. Read root and applicable local `AGENTS.md`, the compact handoff and relevant local README. Read brief, decision, status and architecture sections only as the task requires.
2. Inspect actual repository state, including uncommitted work. Resolve stale documentation by recording the discrepancy; do not overwrite the work to make it match a plan.
3. Explain the next meaningful step, its purpose, and its obvious alternative, then proceed; do not ask "Is this clear?" routinely ([D-024](DECISIONS.md#d-024-explain-and-proceed-without-routine-is-this-clear-checkpoints)). Stop only for the user's decisions, device/account actions, spending, publishing, or settings changes.
4. Before feature code, establish a working development environment and relevant baseline checks. Use a short chat outline for ordinary work. Write a separate design/plan only for consequential decisions requiring a durable contract.

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

Use this stage for consequential specifications. Ordinary features proceed from
their understood acceptance criteria without a separate specification review.

Start a new reviewer with no inherited Elephant conversation. Supply only the original approved brief, accepted amendments, the specification, applicable instructions, and relevant read-only repository access. Do not supply persuasive design commentary or an expected positive verdict. Fresh context reduces anchoring; it does not guarantee independent model errors or scientific correctness.

Reusable prompt:

> You are a fresh specification reviewer. Read the user-supplied product brief, accepted amendments, the current specification, applicable repository instructions, and relevant code. Do not edit files or implement anything. Assess whether the specification faithfully expresses the approved requirements and can be planned without inventing material decisions. Check contradictions, missing inputs/outputs, failure states, privacy, unsupported scientific claims, and testable acceptance criteria. Distinguish blockers, material questions, and nonblocking suggestions. For each issue, identify the requirement or repository evidence, location, realistic consequence, and why the answer changes implementation. Skip builder choices explicitly left open and ordinary details an implementer can settle. No finding quota: report no significant issues if appropriate. State what you inspected, what remains unverified, and whether the spec is ready for implementation planning. A ready verdict does not approve implementation or certify measurement accuracy.

Record significant findings and their disposition briefly in the task handoff. Elephant must check findings, update omissions already answered by source material, and settle minor builder choices transparently. Bring only material unanswered user decisions back to the user. Do not silently treat Goldfish's suggestions as requirements.

## Implement a bounded task

- Give each worker an explicit goal, allowed paths, interfaces, acceptance criteria, and verification expectations. Workers read scoped guidance and report blockers to the coordinator.
- Build a small end-to-end result. Do not expand scope because an unrelated improvement is nearby.
- Exercise real failure paths and use meaningful automated checks appropriate to the change. Mocked inference verifies plumbing, not actual landmark accuracy.
- Record algorithm/model versions, relevant runtime/delegate, sampling, and tolerances when measuring behavior. Never invent benchmark results.

## Critical review after code implementation

Self-review every change. Use one separate fresh reviewer for data format/storage behavior,
import/restore, account/network, media-handling or analysis-algorithm changes.
The reviewer checks the actual changed code against its acceptance criteria
after relevant checks pass. "Mean review" means rigorous scrutiny. Keep findings
evidence-based and professional, with no minimum issue count or separate report
requirement. Re-review only material fixes or unresolved blockers.

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

The first response in a new session explains the next meaningful step and
continues within the approved scope under D-024. Do not restore routine
"Is this clear?" stops. Coordinate actual user device/account actions and stop
for the decisions, spending, publishing and settings changes listed in D-024.
README files describe each directory; they are not substitutes for the approved
brief/specification or shared agent rules.

At feature completion or provider handover, refresh the compact `HANDOFF.md`
and add one brief `STATUS.md` entry with the result, checks, material limits and
next action. Update architecture/decisions only when their contracts change.
Existing plans need only their completion state. Ordinary features need no new
plan or review files. Keep detailed command transcripts out of routine updates.

Commit coherent working steps on the task's branch after relevant focused
checks. Run full tests, lint and build once on the completed code feature before
integration, then fast-forward `master` after the applicable review
([D-018](DECISIONS.md#d-018-regular-commits-and-reviewed-merges-to-master),
[D-019](DECISIONS.md#d-019-one-branch-per-feature-one-commit-per-step)), so the
pushed history and documents describe the same state. Reuse matching CI evidence
and run affected checks after fixes. Documentation-only edits need a diff/link
check. Browser/native/device checks follow changes to those paths and actual
acceptance needs.

Do not equate "implemented," "compiled," "mock-tested," "tested with real video," "benchmarked on a phone," and "ready to ship." Record exactly which claim the evidence supports.

These documents guide future sessions. They do not themselves schedule reviewers, configure a CI gate, or guarantee automatic instruction loading in every tool. Read scoped files explicitly and invoke the review when the relevant stage is reached.
