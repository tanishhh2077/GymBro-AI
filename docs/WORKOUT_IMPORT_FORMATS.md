# Workout CSV import formats

These parsers are original GymBro AI code. Only public format descriptions and
exported headers were used. No openGym parser/code or Gym visual assets were used.
Fixtures are invented non-human records, not copies of the source users' histories.
Research checked 2026-11-07.

| Supported variant | Primary evidence | Boundary |
| --- | --- | --- |
| Strong English legacy CSV | [A Strong user's exported column report](https://forum.intervals.icu/t/import-strong-data-weightlifting-app/5531), December 2021; [official export help](https://help.strongapp.io/article/235-export-workout-data) | `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE`. The official help confirms CSV but does not define columns. Explicit file-wide kg/lb selection is required because this header has no unit. New Strong `Workout #`/`Duration (sec)`/`Weight (kg)` variants are unsupported. |
| Hevy English CSV | [A user's actual exported header and rows](https://www.reddit.com/r/Hevy/comments/1nwf0i4/), October 2025; [official export help](https://help.hevyapp.com/hc/en-us/articles/43708290987415-Exporting-Your-Data-from-Hevy) | `title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_lbs,reps,distance_miles,duration_seconds,rpe`. Metric `weight_kg`/`distance_km` variants are not yet supported. Only normal/warmup set types. The observed rows show English `D Mon YYYY, HH:mm` timestamps. |
| FitNotes Android 25.1 CSV | [First-hand offline Android 16 emulator export experiment](https://kinoku.app/compare/kinoku-vs-fitnotes), September 2, 2026 | The experiment reports the actual exported header `Date,Exercise,Category,Weight,Weight Unit,Reps,Distance,Distance Unit,Time` and a saved 80 kg, 5-rep bench set. Evidence used is the observed exporter header, not that site's importer implementation. Units must explicitly be kg/kgs/lb/lbs. Other Android/iOS formats are not claimed. |

The FitNotes iOS migration page documents an input interchange contract; it was
initially mistaken for export evidence and is not used to claim iOS export support.

Comma or semicolon delimiters, UTF-8 BOM, quoted delimiters, escaped double quotes
and embedded note newlines are supported. Unknown columns, malformed rows,
unsupported dates, invalid numbers and unsupported set types reject the entire
file. Names reject controls and hidden formatting rather than silently stripping
them. Existing schema6 validation applies all record and aggregate limits.

Every preview states these limits:

- External-load weight-and-reps exercises only. Zero/negative weights and known
  bodyweight/assisted names reject the file. Names cannot reliably encode exercise
  type, so the user must confirm that the included exercises use external load.
- Timed and distance rows reject the whole file; no silent row skipping.
- Notes, categories and superset labels are omitted only with a preview warning.
  Strong/FitNotes exports without set kinds produce Regular sets, with a warning.
- Zone-less dates use an explicit user-supplied fixed UTC offset. This cannot
  reconstruct historical daylight-saving transitions. Date-only FitNotes rows
  group by date and unit and use equal midnight start/finish placeholders; actual
  session time and training duration are unavailable, not measured zero duration.
- Stable source/date/title/unit identifiers skip identical repeated imports;
  changed versions conflict and preserve saved records. Exporting the same real
  workout from two different apps can still create duplicates. An import does not
  replace an existing workout or the active session.
- Reads are local, bounded to 4 MiB and 10000 rows, abortable with a ten-second
  timeout. Preview is bound to the current data identity/revision. Save uses the
  existing transactional additive backup-merge path.

Interop verification uses synthetic fixtures and strict parser/UI/reader tests.
No private exports, physical-device files or live vendor accounts were tested.
