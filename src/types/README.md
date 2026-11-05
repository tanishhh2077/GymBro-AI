# Shared contracts

`workout.ts` defines separate manual workout entries, explicit lb/kg units,
millisecond dates, active/completed records and version/revision metadata. These
are locally persisted under D-030; they contain no pose/media handles or findings.
Task16/D-034 adds RoutineInput/WorkoutRoutine and independently optional set/rep
targets. Document schema2 keeps routines optional to avoid growing legacy records
on read. Actual sets stay separate from targets; copied plans have no live link
to the saved routine, and IDs are fresh when starting each workout.

`progress.ts` defines readonly derived RecordedSet and ExerciseProgress values.
They carry actual source-set identity, unit groups and record/history arrays for
the D-037 views. The workout library is the source for these derived results.

`index.ts` defines pose observations, progress/results, session clips, and typed
processing failure stages/kinds. The lift, view and source types hold only the
supported `bench`, `side` and `upload` values; the legacy multi-lift and
analysis/score types were removed (D-028).

Follow [contract rules](AGENTS.md) and the [current specification](../../spec.md).
Keep estimated observations separate from derived measurements and findings.
Update producers and consumers together when changing an interface.
