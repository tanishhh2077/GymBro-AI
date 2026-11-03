# GymBro AI: project instructions

## Start here

- Read this file, relevant ancestor/local `AGENTS.md` files, and the documents below before changing code. Explicitly read the local guidance for each directory you will edit; do not assume every nested file was automatically loaded.
- [Original product brief](docs/PRODUCT_BRIEF.md) preserves the user's supplied requirements unchanged.
- [Accepted decisions](docs/DECISIONS.md) records later clarifications and identifies proposals separately.
- [Current status and next task](docs/STATUS.md) describes observed implementation and verification limits.
- [Architecture](docs/ARCHITECTURE.md) distinguishes existing behavior from intended boundaries.
- [Workflow and reusable review prompts](docs/WORKFLOW.md) defines Elephant, Goldfish, and implementation review.
- [Current milestone specification](spec.md) is a reviewable design, not permission to implement it.
- [Implementation plan](docs/superpowers/plans/2026-11-02-video-landmarks.md) defines the approved execution boundaries and initial guardrails. [D-014](docs/DECISIONS.md#d-014-first-supported-exercise-is-bench-press) changes the initial exercise to bench press.

## Work with the user

- Teach at a first- or second-year CS level. Define unfamiliar terms, use concrete scenarios, and show why an obvious alternative can fail.
- Before each meaningful step, explain what it does, why it exists, and why this approach rather than the obvious alternative. Ask **"Is this clear?"** and stop until the user answers. Respect an explicit, task-specific instruction to proceed through a larger step.
- An understanding checkpoint is not a request to choose build options. Ask separate clarification questions only when a material requirement is missing.
- Get a working development environment running before feature code. Treat an existing `node_modules` folder or an old build result as insufficient evidence of a reproducible setup.
- Preserve unrelated and preexisting uncommitted work. Report failures, skipped checks, and mistaken assumptions plainly.
- Never add `Co-Authored-By` lines or attribution trailers of any kind to commits.

## Product boundaries

- Product and brand: **GymBro AI**. Package: `gym-bro-ai`. Tagline: **Your second set of eyes.** The original brief retains its historical name; [D-010](docs/DECISIONS.md#d-010-current-product-identity) supersedes that identity.
- Initial scope: one uploaded video of a lifter performing barbell bench press from a standardized side view. The original squat-first brief is superseded by D-014.
- The first milestone is real video -> timestamped estimated landmarks -> synchronized playback/overlay, with bounded input handling, failures, and practical verification. It does not include repetition analysis or saved workouts.
- Keep raw observations, derived measurements, and interpretations distinct. A finding must carry its supporting measurements, timestamps, uncertainty, and unavailable/abstention reason where applicable.
- Do not invent analysis, benchmark results, form scores, or confidence. Model visibility is not a calibrated probability of biomechanical correctness. Inferred world coordinates are not measured ground-truth 3D biomechanics.
- Avoid medical, injury-prevention, perfect-form, and unvalidated coach-grade claims. Do not use an LLM to invent movement findings.
- Do not expand into other exercises, camera views, multi-camera fusion, or generic fitness features during the initial milestone.
- Start with on-device processing. Mobile is the intended release direction; a Capacitor prototype is a candidate to test, not a verified deployment. No server video transfer, mobile scaffold, or database is approved by these documents alone.

## Independent judgment

- Accuracy matters more than agreement. Evaluate the user's idea and your own earlier idea by the same evidential standard.
- Explain concrete failure cases and meaningful tradeoffs. Offer a better approach when one is justified; do not praise, agree, disagree, or criticize without a reason.
- Separate observations, assumptions, proposals, and accepted decisions. Admit uncertainty and change your conclusion when stronger evidence warrants it.
- Do not silently turn a preferred technology, an old placeholder, or a reviewer suggestion into a requirement.

## Context and delegation

- Elephant has the broad context and maintains the approved brief, decisions, status, and bounded task specification. Goldfish starts without the Elephant conversation and reviews the specification against the approved source material and repository.
- Give workers explicit goals, allowed paths, interfaces, acceptance criteria, and verification expectations. Delegate only work within the approved step; workers return material blockers to the coordinator.
- Keep durable facts in the documents, rather than relying on chat memory. Update the status/handoff after a milestone; avoid copying the entire brief into every directory.
- Add concise local `AGENTS.md` guidance when creating an authored project directory. Exclude `.git`, dependencies, build output, and generated caches. Local guidance adds responsibilities; it must not silently weaken product or privacy requirements.

## Verification and code review

- Run checks appropriate to the change. State exact results and checks not run; never claim that source inspection, mocks, or successful compilation proves real-video accuracy.
- After code implementation and the relevant checks, obtain a fresh critical review against the approved specification. Review rules and a reusable prompt are in [WORKFLOW.md](docs/WORKFLOW.md).
- Each review finding needs a severity, location, realistic trigger, consequence, and supporting evidence. Keep speculative concerns separate. No issue quotas or performative hostility.
- Evaluate findings independently. Fix supported defects, document evidence-backed disagreements, and verify affected behavior after fixes. Do not report a milestone complete with unresolved acceptance-blocking defects.
- Before handoff, record changed paths, actual verification, limitations, review disposition, remaining prerequisites, and the next concrete action in [STATUS.md](docs/STATUS.md).

## Existing commands

- Development: `npm run dev`.
- Build/type check: `npm run build` (`tsc -b` then Vite).
- Lint: `npm run lint` passes after the declared-tooling repair and unused-initializer cleanup; see [STATUS.md](docs/STATUS.md) for verification and remaining prototype limitations.
- There is currently no test script. Do not report `npm test` as available until one exists.
