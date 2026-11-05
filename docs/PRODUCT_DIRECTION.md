# Product direction: Q&A in progress

2026-11-04. This records the user's answers, not a claim that these features
exist. Original PRODUCT_BRIEF remains unchanged; D-030 authorizes the next slice.
Hevy was mentioned as a reference; exact visual resemblance and integrations
have not been specified. MCQs must include a recommendation and brief reason.

| Question | User choice |
| --- | --- |
| 1. Primary purpose | C: workout tracking and AI equally central |
| 2. Audience | D: mixed experience levels, simple defaults/optional advanced controls |
| 3. Analysis connection | D: set-linked and standalone analysis |
| 4. Home | B+C: equal Start Workout/Analyze Video actions above a compact dashboard; detailed charts belong in Progress |
| 5. Tracking scope | B: exercises/sets/reps/weights/routines/history plus timers, charts, personal bests and custom exercises; community deferred |
| 6. First public AI exercise coverage | A only: bench press; logging may cover other exercises |
| 7. Analysis timing | Post-video for now; live plus post-video is a future goal |
| 8. Accounts and sync | A: guest logging with optional accounts for backup and syncing; sign-up must not block a first workout |

After Q7 the user explicitly said to start building while they are busy, then
resume questions in an hour. A one-time thread follow-up
`resume-gymbro-ai-design-q-a` is scheduled for about 23:28 America/Chicago.
Resume at Q8, one MCQ at a time. More design/product choices remain open.
At the user's subsequent Codex-limit handoff to Claude, this automation was
paused so it consumes no further Codex usage. Claude resumes questions when the
user is available; no automatic Claude reminder has been created.
The user then cancelled that handoff ("False alarm, continue working where you
left off"). Codex resumed the unchanged task and restored the original one-time
Q&A follow-up; the seven accepted answers and remaining scope are unchanged.

## Bounded next implementation

Task 14 delivers manual, rep-based local workout logging and history, with Home
actions and the existing standalone video screen. It does not claim the whole
tracking wish list, set-linked analysis, live analysis, or validated bench findings.
Builder defaults: existing visual tokens/system font; provisional three-view
navigation; visible lb/kg selection for each new workout, initially lb (US-first
direction), no conversion; local IndexedDB only. Q8 now selects guest use with
optional accounts and sync as the future direction; neither is implemented.
Sync scope, guest-data migration, unit preference, video acquisition/retention,
routines, metrics and final styling remain Q&A topics.

Keep workout records separate from AI/media data. No videos, frames, landmarks,
object URLs, form scores, server transfer or third-party integration is persisted.

Q&A resumed around23:29 Chicago after Codex resumed. The user answered Q8 "A",
then confirmed "Clear" after the explanation. D-031 records that accepted
direction. Continue at Q9, one MCQ at a time; recommendations are not decisions.
The one-time Codex follow-up is fulfilled and paused to avoid duplicate prompts.
