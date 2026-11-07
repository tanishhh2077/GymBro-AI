# Product direction: Q&A in progress

2026-11-04. This records the user's answers, not a claim that these features
exist. Original PRODUCT_BRIEF remains unchanged; D-030 authorizes the next slice.
Hevy is a reference for familiar workout flows, with GymBro's own visual design
(Q10). Third-party integration remains unspecified. MCQs include a recommendation
and brief reason.

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
| 10. Hevy resemblance | A: familiar workout flow with GymBro's own design |
| 11. Appearance | A: follow the phone's light/dark setting, with a manual override |
| 12. Exercise entry | A: searchable built-in exercise list plus custom exercises |
| 13. Next development priority | A: previous-set values, faster set entry and optional automatic rest timers |
| 14. After finishing a workout | A: summary of duration, exercises, sets and logged volume |
| 15. Set types | A: Regular and Warm-up |
| 16. Rest defaults | A: remember a duration for each exercise |
| 17. Finding past workouts | A: workout/exercise-name search and completion-date filters |
| 18. Progress periods | A: one/three/six months and All time |
| 19. Barbell loading | A: optional calculator with editable bar weight and plate inventory |
| 20. Finished workout corrections | A: name and existing logged set values with Save/Cancel |
| 21. Routine organization | A: search and name/creation-order sorting |
| 22. Rest completion | A: optional in-app sound/vibration where supported |
| 23. Training summary | A: seven-day workouts, sets, duration and unit-separated volume |
| 24. History browsing | A: optional calendar with day filtering |
| 25. Spreadsheet export | A: completed actual sets as CSV with units and types |
| 26. Workout notes | A: one optional workout note, editable during and after training |
| 27. Active exercise order | A: Move Up/Down while preserving logged sets |
| 28. Repeat completed workout | A: copy exercises into a fresh workout with previous values and zero logged sets |
| 29. Exercise detail | A: existing history, records and progress for exact name/unit |
| 30. Leaving changed forms | A: confirm before discarding changed inputs |
| 31. Routine target weights | A: optional target weight per exercise, separate from actual results |
| 32. Training consistency | A: weekly completed-workout counts for the last 12 weeks |
| 33. Workout names | A: suggest previous names while allowing custom names |
| 34. Effort per set | A: optional RPE 1–10 per set |
| 35. Supersets | A: group adjacent exercises as a superset |
| 36. Bodyweight exercises | A: optional weight; added or assisted load |
| 37. Progress goals | A: optional goal per exercise, progress from actual sets |
| 38. Rep counting from video | A: not yet; validate on the user's own videos first |
| 39. First-run onboarding | A: short skippable three-screen intro |
| 40. Unit display | A: converted unit shown beside weights, display only |
| 41. Health app export | A: not now; revisit after the phone session |

Q20–Q25 were accepted together with an explicit instruction to build all
recommended options. Tasks32–37 implement them under D-051–D-056.
Q26–Q33 are implemented as Tasks38–45 under D-057.
Q34–Q41 were accepted with "start with recommended" (D-058); Q34–Q37, Q39 and
Q40 are implemented as Tasks46–51. Q38 and Q41 are deferred. Questions can
resume at Q42.

Q17–Q19 were accepted together. Tasks27–29 integrate their three separate agent
branches under D-046–D-048. Questions can resume at Q20.

Q14–Q16 were accepted together on 2026-11-06 with "start with all the recommended".
Task26 implements them under D-045. Rest defaults are device-local and scoped to
guest/account use. Summary volume includes warm-ups and personal records use
Regular sets. Continue questions at Q17.

Q10–Q13 were answered together on 2026-11-05. They are accepted product choices.
The next feature priority is everyday workout convenience from Q13. Theme
controls and the exercise catalog are accepted follow-on work. These answers
describe intended behavior, with implementation status recorded in HANDOFF.

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
Task 19 (D-039) later added session-only set-linked analysis for bench-press sets.
Builder defaults: existing visual tokens/system font; provisional three-view
navigation; visible lb/kg selection for each new workout, initially lb (US-first
direction), no conversion; local IndexedDB only. Q8 now selects guest use with
optional accounts and sync as the future direction. D-044/Task25 now supplies
the Supabase email-code client, manual sync and backend SQL. Cloud setup and
real service/device verification are pending. Q9 limits sync to workout records.
Guest-data
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
