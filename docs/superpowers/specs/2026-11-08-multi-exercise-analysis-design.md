# Multi-exercise video analysis: design (proposed)

Status: **proposed, not approved for code.** Author: Claude Code (Opus 5.5),
2026-11-08. Source of scope: the user's choice of six exercises (HANDOFF, D-061).
Research input: [vision data and models](../../research/2026-11-08-vision-data-and-models.md).

## Goal

Extend the existing bench-press pipeline (video → MediaPipe landmarks → overlay →
elbow summary) to six exercises: bench press, machine chest press, seated cable row,
biceps curl, triceps pushdown and shoulder press. For each exercise the app reports
**observed 2D measurements per repetition**, with timestamps, and an explicit
"unavailable" reason when it cannot see enough. It does not grade form.

## Why this shape (and not the obvious alternatives)

- **Not a downloaded "form model".** The search found no model that classifies or
  grades these lifts, and the large video models cannot run on a phone. Joint-angle
  rules over MediaPipe landmarks are what working projects use, and they keep video
  on the device.
- **Not a pass/fail score.** A score would need validated thresholds we do not have
  (AGENTS.md: no invented form scores or confidence). Numbers the user can check
  against the video are honest now and can feed thresholds later.
- **The user picks the exercise; the app does not guess it.** Automatic exercise
  recognition is a separate classification claim that would need its own
  evaluation. A wrong guess would silently apply the wrong rules.
- **One definition per exercise, one shared engine.** Adding exercise seven later
  should mean adding data and tests, not new pipeline code.

## Components

1. **Generic angle measurement** (`src/core/jointAngles.ts`). Generalise
   `measureElbows` to any three-landmark angle (for example shoulder–elbow–wrist or
   hip–shoulder–elbow). It reuses today's unavailable reasons (`no-pose`,
   `low-visibility`, `outside-image` and so on) and image-pixel coordinates. Today's
   `elbow-2d-v1` output stays byte-identical; the elbow code becomes one caller.
2. **Exercise definitions** (`src/core/exercises/`): a typed, frozen registry. Each
   entry states:
   - the camera view to ask for (all six start with a **side view**, the side
     nearest the camera; see open question 1);
   - the **primary angle** that drives repetition detection (elbow for all six);
   - up to two **secondary observations**, all 2D and image-relative;
   - which body side to use: the side with better landmark visibility over the clip,
     chosen once per clip and reported, never mixed frame by frame.

   | Exercise | Primary angle | Secondary observations |
   |---|---|---|
   | Bench press | Elbow (shoulder–elbow–wrist) | Wrist horizontal drift across the rep (bar-path proxy, labelled weak because the bar hides the wrist) |
   | Machine chest press | Elbow | Torso angle to vertical (does the back stay on the pad) |
   | Seated cable row | Elbow | Torso angle to vertical (lean back and forward) |
   | Biceps curl | Elbow | Upper-arm angle to torso (hip–shoulder–elbow): elbow drifting forward |
   | Triceps pushdown | Elbow | Upper-arm angle to torso: elbow drifting away from the body |
   | Shoulder press | Elbow | Upper-arm angle to torso at the top (lockout height) |

3. **Repetition detection** (`src/core/repetitions.ts`). The engine works on the
   primary angle series of one clip:
   - It smooths only across valid samples and never fills gaps longer than a set
     limit; a gap splits the series.
   - It finds turning points with hysteresis **relative to that clip's own observed
     range**, plus a minimum amplitude and a minimum duration. There are no
     "correct depth" constants.
   - Each repetition records: start, bottom/turn and end times; minimum and maximum
     angle; range; the duration of each phase; and the share of valid samples.
   - A repetition with too little coverage is reported as **unmeasured**, not
     dropped and not guessed. The clip-level result can be "repetitions could not be
     counted" with a reason.
4. **Results UI.** After analysis, an exercise picker (default: the exercise name of
   a linked set when it exactly matches a definition, otherwise the user chooses)
   shows:
   - a repetition list with each measurement and a "jump to this rep" seek;
   - the existing overlay and timeline;
   - a plain statement of the limits: 2D estimate, one camera, not a form grade.
5. **Session-only.** As with D-039, results are not saved. Saving the measurements
   with a workout is a separate decision.

## Wording rules

- Say "observed elbow range 48°–162° (2D estimate from video)", never "full range of
  motion" or "good rep".
- Never compare against an ideal unless a source-backed threshold is approved.
- "Unavailable" must be visible and come with its reason.

## Evaluation (needed before any accuracy claim)

- Private, local-only clips; never committed or uploaded:
  - the user's own videos, at least 5 per exercise from the requested view;
  - optionally the Kaggle CC BY-NC-SA video set, for private testing only.
- Ground truth by hand: the rep count and the rough bottom and top times for each rep.
- Proposed acceptance for phase 1, to be agreed by the user: exact rep count on at
  least 4 of 5 clips per exercise, and every miss shown as "unmeasured", not wrong.
- Tests use synthetic angle series (fixtures in code), never human media.

## Phases

1. Generic angle engine, the exercise registry, repetition detection, and the picker
   with a rep list, for bench press, biceps curl and triceps pushdown.
2. Chest press, seated row and shoulder press, plus the secondary observations.
3. Private evaluation with the user's videos; tune the parameters per exercise and
   record the results in STATUS.
4. Later and separate: live camera, automatic exercise recognition, other views,
   and saving results.

## Open questions for the user

1. Camera view: side view for all six to start (simplest, one rule)? Shoulder press
   and pushdown may show more from the front; front view could be phase 4.
2. Should the rep count appear before phase 3 evaluation, labelled "estimated", or
   be hidden until it meets the acceptance bar?
3. Is the proposed acceptance bar (exact count on 4 of 5 clips per exercise)
   acceptable?
