# Task 19: set-linked bench-press video analysis

## Authorization and scope

The user asked for Task 19 (D-039): open video analysis from a logged
bench-press set, process the recording with the existing local pipeline, and
return to that set, while standalone analysis keeps working. Reuse the existing
playback, landmark overlay and elbow measurements. No new analysis, rep counting,
form verdict, persistence of media or pose data, upload or dependency.

## Terms

- **Set link**: three IDs, `{ workoutId, exerciseId, setId }`, naming one logged
  set. Workout IDs are unique across the whole library; exercise and set IDs are
  unique only inside one workout, and restored or legacy IDs may be any string
  of 1–80 characters from `[A-Za-z0-9_-]`. That scope is why all three IDs must
  match, starting from the workout.
- **Pending link**: a set link chosen on a set row but not yet attached to a clip.
- **Clip link**: the set link copied onto a clip when that clip is admitted.

## Which sets are bench-press sets

`isBenchPressName(name)`: the name, lower-cased, with `-` and `_` turned into
spaces and runs of spaces collapsed, equals one of `bench press`, `bench`,
`barbell bench press`, `flat bench press`, `flat barbell bench press`.

- Variants such as incline, decline, dumbbell, close-grip, Smith-machine or
  machine presses do not match. The recording guide and elbow measurements were
  written for a flat barbell bench press, so offering them for variants would
  imply support that does not exist (D-014). There is no fuzzy matching, and the
  app has no exercise rename: a name is chosen when the exercise is added to a
  workout or a routine. Other names get no action and no hint (builder choice).
- Every set row of a bench exercise, in the active workout editor and in a saved
  workout's detail, gets **Analyze video for set N of <exercise>**. The action is
  disabled while workouts are not loaded, saving, loading or need a reload.

## Interfaces

- `src/core/setLinks.ts`: `isBenchPressName(name: string): boolean` and
  `resolveSetLink(data: WorkoutData, link: SetLink): ResolvedSet | null`, where
  `ResolvedSet = { place: 'active' | 'history'; workout; exercise; set; setNumber }`.
- `src/types/index.ts`: `SetLink`; `Clip.link?: SetLink`.
- Session store: `startClip(file, link?)` copies the link onto the new clip in
  the same update that creates it; `detachLink(clipId)` removes a clip's link and
  can never add or change one. `reset()` and `removeClip()` drop it with the clip.
- `App` gains an optional `session` prop (default `useSessionStore`), passed to
  `AnalysisWorkspace`, as `workouts` already is; tests supply
  `createSessionStore` with fake engine and URL services.
- `AnalysisWorkspace` props: `session`, `data`, `available`, `pendingLink`,
  `onClearPending()`, `onBackToSet(link)`. The "set no longer available" refusal
  renders as an alert inside its pending-link banner, not as a `SelectionIssue`.

## Flow

1. A set row's **Analyze video for set N…** stores the pending link in App state
   and opens Analyze.
2. Analyze shows a banner: "For your logged set N of <exercise>: <reps> reps ×
   <weight> <unit> (entered by you, not counted from the video), in <workout>",
   with **Analyze without linking**, which clears the pending link. The banner
   resolves its link on every render; if the set disappears, it shows the
   unavailable message at once.
3. On file selection the pending link is resolved again. If it no longer
   resolves, nothing is admitted and the pending link is cleared. Otherwise the
   file goes to `startClip(file, link)`. Admission is synchronous, so the data
   cannot change between that check and the store update. A rejected admission
   (format, size, busy, releasing) links nothing and keeps the pending link.
4. The clip header shows "Linked to your logged set N of <exercise>: …" and
   **Back to set**. Back to set opens the workout editor (active workout) or that
   workout's history detail (saved workout). App records the set as a focus
   target, and App's view-change focus effect focuses that row (`id`
   `set-row-<setId>`, `tabIndex -1`) instead of `<main>`.
5. On the row linked to the current clip, the action is **View analysis for set
   N…**, which opens Analyze without creating a pending link.
6. Standalone use is unchanged: the Analyze tab or Home button admits clips
   without a link. Removing a linked clip does not restore the pending link; the
   next clip is standalone unless the user starts again from a set row.

Displayed reps, weight and set number come from the current data, so an edited
set shows edited values and the set number is its current position.

## Reload and app lifecycle

Analysis is session-only, as today. A page reload or app restart discards the
clip, its link and any pending link; nothing about analysis or links is written
to IndexedDB, backups or exports, and the workout schema does not change. When
the native app goes to the background while a clip is still processing, the
existing lifecycle reset removes the clip and its link; a completed clip and its
link stay. Analyze states: "This video and its link last until you reload, close
the app, or leave the app while it is still processing. They are not saved."

## Deleted or changed sets

The clip link is resolved against the store's current data on every render. That
data is the last confirmed save; after an unconfirmed save (`needsReload`) the
link may later prove stale, which is a stale link, never a different set.

- Removing the set or its exercise, discarding the active workout or deleting the
  saved workout makes the link unresolved. AnalysisWorkspace then calls
  `detachLink`, so the clip stays open as a standalone analysis with "The linked
  set was removed from your workouts, so this video is no longer linked." The
  link stays detached even if a backup restore later brings back records with
  the same IDs (a restore can re-add an older snapshot with different values).
- Finishing the workout keeps all IDs, so the link resolves to the history copy
  and **Back to set** opens the history detail.
- Another browser tab's changes are seen only after a reload or save conflict;
  until then **Back to set** may open a set that the other tab removed. All three
  IDs still match, so it is stale, not wrong.

## Protection against wrong links

- Resolution requires all three IDs to match, never names or positions, and the
  exercise must be bench press.
- The link is fixed in the session store at admission; it can only be removed.
- A pending link is consumed only by an admission on Analyze while it is shown.
  It is cleared by **Analyze without linking**, by leaving Analyze, and when it
  fails to resolve at admission.
- While a clip is open, admission is blocked; choosing **Analyze video** on
  another set does not relink it. Analyze shows the existing clip with its own
  link and asks the user to remove it before analyzing the new set.

## Tests (written first)

- Core: name rule accepts the five names in any case/spacing, rejects variants;
  resolution of active and saved sets; two workouts sharing exercise/set IDs
  resolve only within the named workout; mismatched triples; removed
  set/exercise/workout; non-bench exercise; set number after an earlier set is
  removed.
- Session store: `startClip(file, link)` stores a copy of the link; standalone
  has none; `removeClip` and `reset` clear it; `detachLink` removes it and cannot
  add one; a rejected admission leaves the current clip's link unchanged.
- App (jsdom, fake session): action only on bench sets, disabled while busy;
  pending banner with entered-values wording and live edits; **Analyze without
  linking** then admits an unlinked clip; admission links the clip; a rejected
  admission keeps the pending link; Back to set focuses the row; removing the set,
  discarding and deleting each show the unlinked notice, and a later restore keeps
  it unlinked; finishing moves Back to set to history; **View analysis** creates no
  pending link; leaving Analyze clears the pending link; an open clip is not
  relinked; a pending target deleted before admission shows the unavailable alert
  and refuses admission.
- Chromium: one synthetic flow (manual set → Analyze video for set 1 →
  undecodable file → linked header → Back to set focuses the row), with
  captures/uploads off.
