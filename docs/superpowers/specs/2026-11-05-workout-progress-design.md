# Task17 workout progress and personal records

## Intent and authority

The user asked to "keep building the next things" after the Task16 handoff.
Q5 already includes charts and personal bests in the personal-tracking roadmap.
D-037 selects this bounded next slice. The builder chooses the metric definitions
below. They are descriptions of entered workout data. D-035's any-view bench
direction follows its separately approved design and per-view validation process.
The earlier hosted file-chooser failure remains an open incident, with a fix
conditional on an observed repeat under the user's instruction.

Use the existing React/TypeScript/local workout library and visual tokens.
The Progress screen derives data on demand from validated completed workouts.
Its entry is a Home View progress action, following the existing history-view
navigation pattern. A Back to Home action returns to the dashboard.

## Metric contracts and builder choices

Group by EXACT stored exercise name and weight unit. Capitalization/internal
spacing differences form separate groups. A visible explanation asks users to
use consistent names. Every group retains lb or kg as recorded. The source is
the library's completed history and each exercise's actual sets.

New readonly contracts in src/types/progress.ts
- RecordedSet contains workoutId, workoutName, finishedAt, exerciseId, setId,
  reps and weight. Each value belongs to one actual source set.
- ExerciseProgress contains key, name, unit, loggedSetCount, heaviestSet,
  mostRepsSet, workouts and repRecords.
- key encodes the name/unit pair as JSON. workouts contains one heaviest source
  set per completed workout, combining repeated same-name entries in that workout.
  repRecords contains one source set with the most reps at each exact logged load.

buildWorkoutProgress(history) returns new derived groups. Eligible inputs have
a completion timestamp and actual sets. An empty eligible history produces an
empty result. Zero entered load is eligible. Actual set counts include every
matching set, while workout counts use each matching workout once.

Heaviest set ranks weight descending, then reps descending. Most-reps set ranks
reps descending, then weight descending. Rep records use most-reps ranking within
one exact load. Equal results choose earliest finishedAt, then a locale-independent
lexical source key made from workout/exercise/set IDs. Chart workouts sort by
finishedAt ascending and source identity. Groups sort by display name and unit.
All summary pairs and source links come from the same chosen set.

Inputs are validated by the existing workout storage boundary. Its supported
limits include1000 history workouts,100 exercises/workout,100 sets/exercise,
1,000,000 serialized characters, reps1-1000, load0-10000 and valid epoch dates.
Derived records retain original numeric precision. Sorting acts on new arrays.
The source document and existing persisted formats supply the data throughout.

## Interface and chart

Home retains the two primary workout/video actions and adds View progress near
the actual training totals. Progress offers an exercise/unit selector, recorded
workout/set counts, Heaviest logged set and Most reps in a set summaries, a
heaviest-load-per-workout chart, a workout table and a rep-records-by-weight table.
Source buttons open the existing saved-workout detail. After deletion, results
are derived again from the remaining history.

The chart uses native responsive SVG and the existing tracking accent. Each
point is a completed workout, evenly spaced in finish order. This ordering is
stated beside the chart. Axis labels are HTML for readable mobile text. The y
scale starts at zero and includes the heaviest point. A zero-only group uses a
zero-to-one display scale. A single workout has a visible point. Table values
and source details retain exact logged numbers, while axis labels use compact
formatting. The chart has a labelled description and the table supplies the
same source data in accessible text. Implementation uses the existing stack.

The workout table starts with20 recent workouts and the weight-record table
with20 loads, heaviest first. Show-more actions reveal further rows. Choosing a
different group resets pagination. Long80-character names wrap within390px.
Loading/storage failure explains the required reload. Empty progress invites
starting or resuming a workout. All controls use accessible names and focus cues.
An active workout retains its independent timer while viewing progress.

## Evidence and completion

Tests precede behavior changes as repository rules require. Pure tests cover
empty/unfinished/target-only inputs, zero/fractional/extreme values, exact name
and unit grouping, repeated entries in one workout, deterministic ties, source
pairing, chronological points, deletion recomputation, immutability and1000
workouts. React tests exercise Home entry, empty/reload states, group selection,
source navigation/deletion, finite zero/single-point charts and pagination reset.

Real Chromium tests use synthetic manual records through existing UI/repository
entry points and verify reload, units, record source links/deletion, long names
and paging. The existing17-case suite remains part of the maintained run.
Browser harness capture/network guards apply. Separate ignored synthetic UI
previews at390/1280 support layout inspection. Private recordings remain outside
the repository under D-035. Phone actions require the user's presence.

Fresh schema/design review precedes implementation. Full tests/lint/build pass
before each step commit, with guarded mobile sync and local/hosted browser/native
evidence for the final source. A fresh whole-feature review evaluates the branch
before reviewed master integration and preservation of Task8 history.
