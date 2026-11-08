# Multi-exercise analysis: implementation plan (proposed)

Status: **proposed; not authorised until the user approves the design and answers
its open questions.** Design: [multi-exercise analysis design](../specs/2026-11-08-multi-exercise-analysis-design.md).
Branch: `feat/multi-exercise-analysis` from current `master`. One step per commit;
write the test first and watch it fail.

## Phase 1 (bench press, biceps curl, triceps pushdown)

1. **Generic angle.** Add `src/core/jointAngles.ts` with `measureAngle(pose,
   triplet, minVisibility)`. Port the elbow tests to it. `measureElbows` delegates to
   it; existing elbow tests and the `elbow-2d-v1` output must be unchanged.
2. **Side choice.** Add `chooseSide(series)`: pick left or right by the share of
   valid samples, with a tie rule and an "insufficient" result; test both sides,
   ties, and clips that are empty or entirely unavailable.
3. **Exercise registry.** Add `src/core/exercises/definitions.ts` with frozen,
   typed entries for three exercises and a validation test (unique ids, triplets
   that are valid landmark indices, no empty camera guidance).
4. **Repetition detection.** Add `src/core/repetitions.ts`. Use synthetic series
   (sine-like reps, noise, gaps, partial reps, a single rep, no movement) to test:
   - the turning points and hysteresis;
   - the minimum amplitude and minimum duration;
   - gap splitting;
   - "unmeasured" for low coverage;
   - "could not count" for a whole clip.
5. **Exercise picker and rep list UI.** Show the picker after a completed analysis,
   defaulting from an exactly matching linked set name. Show the rep list with seek
   buttons and the limits statement. Write component tests plus one browser smoke
   test using the existing synthetic pose fixture.
6. **Checks and review.** Run `npm test`, lint, build and the browser suite on
   port 4179. This is an analysis algorithm, so it needs a fresh independent review
   (AGENTS.md).

## Phase 2

7. Add the chest press, seated row and shoulder press definitions.
8. Add the secondary observations: torso angle, upper-arm angle to torso, and wrist
   drift, each with an unavailable reason. Write tests per observation with synthetic
   geometry.

## Phase 3 (needs the user and private videos)

9. A local-only evaluation script that reads clips from a git-ignored folder and
   writes per-clip results to a git-ignored file. Hand-written ground truth stays
   local too.
10. Tune the parameters per exercise, then record the aggregate results (counts
    only, no media and no pose traces) in STATUS.

## Not in this plan

Live camera, automatic exercise recognition, front views, persisting results, form
grades or scores, and any LLM-written feedback.
