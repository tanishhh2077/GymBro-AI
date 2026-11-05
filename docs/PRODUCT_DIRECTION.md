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
| 9. Sync contents | A: workout records only; no video uploads |

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
Q9 restricts future sync to workout records, excluding videos. Guest-data
migration, unit preference, local video acquisition/retention,
routines, metrics and final styling remain Q&A topics.

Keep workout records separate from AI/media data. No videos, frames, landmarks,
object URLs, form scores, server transfer or third-party integration is persisted.

Q&A resumed around23:29 Chicago after Codex resumed. The user answered Q8 "A",
then confirmed "Clear" after the explanation. D-031 records that accepted
direction. The user then answered Q9 "A", confirmed "Clear bro now work", and
asked to resume development. Continue at Q10 when Q&A next resumes; do not stop
routine development for further MCQs. Recommendations are not decisions.
The one-time Codex follow-up is fulfilled and paused to avoid duplicate prompts.

Task15 adds a bounded manual rest timer from Q5's accepted tracking wishlist.
Builder defaults: 90 seconds initially; 30/60/90/120/180/300-second choices; manual
start/pause/resume/reset; retained between screens for the active workout only.
No automatic start, reload persistence, sound or background notifications in this
slice. The limit is visible in the UI. Remaining preferences stay open.

After Task15 completion, the user explicitly approved the proposed saved-routine
features with "Yes create all of that" (D-034): create/edit/delete, ordered
exercises, optional set/rep targets and a fresh workout with zero completed sets.
Task16 implements that local slice, keeping targets separate from actual logged
work. Q&A still resumes at Q10 when requested, without blocking approved work.

The user then said "ok keep building the next things". D-037 selects Task17
progress/records from Q5's roadmap. Builder-defined metrics are heaviest actual
set, most reps in an actual set, best reps at each entered load and a chart of
the heaviest set per completed workout. Exact saved name/unit groups and
ordinal workout spacing are explicit first-version choices. Task17 now implements
this local slice. It adds no persisted derived metrics or media data.
