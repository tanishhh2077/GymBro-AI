import { useEffect, useMemo, useRef, useState } from 'react';
import { buildExerciseHistory } from '@/core/exerciseHistory';
import { buildWorkoutProgress } from '@/core/workoutProgress';
import { filterProgressHistory, progressRangeStart, PROGRESS_PERIODS, type ProgressPeriod } from '@/core/progressRange';
import type { ExerciseProgress, RecordedSet } from '@/types/progress';
import type { WorkoutStore } from '@/store/useWorkoutStore';
import type { WeightUnit, WorkoutData } from '@/types/workout';
import { ExerciseWorkoutHistory } from './ExerciseWorkoutHistory';
import { WeeklyConsistency } from './WeeklyConsistency';
import { WorkoutGoals } from './WorkoutGoals';
import { WorkoutProgressChart } from './WorkoutProgressChart';
import { AlternateWeight } from './AlternateWeight';
import { groupLabel, weightParts } from './weightText';

interface Props {
  data: WorkoutData;
  available: boolean;
  onHome?: () => void;
  onWorkout?: () => void;
  onStartWorkout?: () => void;
  onNavigate?: (view: string) => void;
  onHistory: (id: string) => void;
  /** Enables adding, editing and deleting goals; without it goals are listed read-only. */
  store?: WorkoutStore;
  /** When true, displays an accessible loading status. */
  loading?: boolean;
}

/** The exact name/unit group a detail view shows; kept by value so a deletion can be explained. */
interface DetailTarget { key: string; name: string; unit: WeightUnit; bodyweight: boolean }

function finishedDate(record: RecordedSet): string {
  return new Date(record.finishedAt).toLocaleDateString();
}

export function WorkoutProgress({
  data,
  available,
  onHome,
  onWorkout,
  onStartWorkout,
  onNavigate,
  onHistory,
  store,
  loading = false,
}: Props) {
  const handleWorkout = onWorkout ?? onStartWorkout ?? (onNavigate ? () => onNavigate('workout') : () => {});
  const handleHome = onHome ?? (onNavigate ? () => onNavigate('home') : () => {});
  const groups = useMemo(() => buildWorkoutProgress(data.history), [data.history]);
  const [selectedKey, setSelectedKey] = useState('');
  const [{ period, now }, setRange] = useState(() => ({ period: 'all' as ProgressPeriod, now: Date.now() }));
  const [openedAt] = useState(() => Date.now());
  const [detail, setDetail] = useState<DetailTarget | null>(null);
  const returnKey = useRef<string | null>(null);
  const exerciseList = useRef<HTMLUListElement>(null);
  const selected = groups.find(group => group.key === selectedKey) ?? groups[0];
  const periodLabel = PROGRESS_PERIODS.find(option => option.value === period)!.label;
  const periodGroups = useMemo(() => period === 'all' ? groups :
    buildWorkoutProgress(filterProgressHistory(data.history, period, now)), [data.history, groups, period, now]);
  const periodGroup = periodGroups.find(group => group.key === selected?.key);
  const choosePeriod = (value: ProgressPeriod) => setRange({ period: value, now: Date.now() });

  // Return keyboard focus to the exercise that opened the detail view.
  useEffect(() => {
    if (detail || returnKey.current === null) return;
    const key = returnKey.current;
    returnKey.current = null;
    [...exerciseList.current?.querySelectorAll<HTMLButtonElement>('button[data-group-key]') ?? []]
      .find(item => item.dataset.groupKey === key)?.focus();
  }, [detail]);

  if (available && detail && !loading) {
    return <ExerciseDetail target={detail} data={data} groups={groups} period={period} now={now} periodLabel={periodLabel}
      onPeriod={choosePeriod} onHistory={onHistory} store={store} onBack={() => { returnKey.current = detail.key; setDetail(null); }}
      onWorkout={handleWorkout} />;
  }

  return <div className="space-y-6">
    <button type="button" className="text-sm text-accent underline underline-offset-4" onClick={handleHome}>Back to Home</button>
    <div>
      <h1 className="text-3xl font-bold text-white">Progress</h1>
      <p className="mt-2 text-sm text-slate-400">Personal records from regular sets in completed workouts saved on this device. Warm-ups are excluded.</p>
    </div>
    {loading && (
      <div role="status" aria-live="polite" data-progress-status className="card space-y-2 p-6 text-center">
        <p className="text-base font-semibold text-white">Loading progress…</p>
        <p className="text-sm text-slate-400">Loading workout history and personal records.</p>
      </div>
    )}
    {!loading && !available && (
      <div role="status" data-progress-status className="card space-y-3 p-6 text-center">
        <p className="text-base font-semibold text-white">Workout data unavailable</p>
        <p className="text-sm text-slate-400">Reload saved workouts to view progress.</p>
        {store && (
          <button type="button" className="btn-primary mx-auto" onClick={() => { void store.getState().load(); }}>
            Reload saved workouts
          </button>
        )}
      </div>
    )}
    {!loading && available && !selected && (
      <div role="status" data-progress-status className="card space-y-4 p-6 text-center">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-white">
            {data.history.length === 0 ? 'No workouts logged yet' : 'No regular sets logged'}
          </h2>
          <p className="text-sm text-slate-400">
            {data.history.length === 0
              ? 'No workouts logged yet. Complete your first workout to see progress charts and records. Complete a workout with a regular set to see your progress.'
              : 'Complete a workout with a regular set to see your progress. Warm-ups are excluded from personal records.'}
          </p>
        </div>
        <button type="button" className="btn-primary mx-auto" onClick={handleWorkout}>
          {data.active ? 'Resume workout' : 'Start workout'}
        </button>
      </div>
    )}
    {!loading && available && groups.length > 0 && <section aria-labelledby="progress-exercises-title" className="space-y-3">
      <h2 id="progress-exercises-title" className="text-xl font-semibold text-white">Exercise details</h2>
      <p className="text-sm text-slate-400">Open one exact exercise name and unit for its records, chart and completed workouts.</p>
      <ul ref={exerciseList} aria-label="Exercises" className="divide-y divide-white/10 rounded-lg border border-white/10">
        {groups.map(group => <li key={group.key}>
          <button type="button" data-group-key={group.key} aria-label={`Open details for ${groupLabel(group)}`}
            className="flex w-full min-w-0 items-center justify-between gap-3 px-3 py-3 text-left focus-visible:outline focus-visible:outline-accent"
            onClick={() => setDetail({ key: group.key, name: group.name, unit: group.unit, bodyweight: group.bodyweight === true })}>
            <span className="min-w-0 break-words text-white">{groupLabel(group)}</span>
            <span className="shrink-0 text-xs text-slate-400">{group.workouts.length} {group.workouts.length === 1 ? 'workout' : 'workouts'} ›</span>
          </button>
        </li>)}
      </ul>
    </section>}
    {!loading && available && <WorkoutGoals data={data} store={store} onHistory={onHistory} />}
    {!loading && available && <WeeklyConsistency history={data.history} now={openedAt} />}
    {!loading && available && selected && <>
      <div>
        <label htmlFor="progress-exercise" className="text-sm text-slate-300">Exercise and unit</label>
        <select id="progress-exercise" value={selected.key} onChange={event => setSelectedKey(event.target.value)}
          className="mt-1 w-full min-w-0 rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white">
          {groups.map(group => <option key={group.key} value={group.key}>{groupLabel(group)}</option>)}
        </select>
        <p className="mt-2 text-xs text-slate-500">Each saved exercise name and weight unit has its own history. Use consistent names when logging.</p>
      </div>
      <PeriodControl period={period} now={now} onChange={choosePeriod} />
      <div aria-live="polite">
        <p className="mb-3 text-sm text-slate-300">{period === 'all' ? 'All-time records' : `Records for ${periodLabel}`}</p>
        {periodGroup ? <ProgressDetails key={`${selected.key}:${data.revision}:${period}`} group={periodGroup} onHistory={onHistory} /> : (
          <div role="status" data-progress-status className="card space-y-3 p-6 text-center">
            <p className="text-base font-semibold text-white">
              {period === 'all' ? 'No regular sets logged' : 'No workouts in the selected time range'}
            </p>
            <p className="text-sm text-slate-400">
              {period === 'all'
                ? `No data for the selected exercise. No regular sets for ${groupLabel(selected)}. Complete a workout with a regular set to see earlier progress.`
                : `No workouts in the selected time range. Try selecting a different period or all time. No regular sets for ${groupLabel(selected)} in ${periodLabel}. Choose a longer period or All time to see earlier progress.`}
            </p>
            {period !== 'all' ? (
              <button type="button" className="btn-ghost mx-auto" onClick={() => choosePeriod('all')}>
                Show all time
              </button>
            ) : (
              <button type="button" className="btn-primary mx-auto" onClick={handleWorkout}>
                {data.active ? 'Resume workout' : 'Start workout'}
              </button>
            )}
          </div>
        )}
      </div>
    </>}
  </div>;
}

function PeriodControl({ period, now, onChange }: { period: ProgressPeriod; now: number; onChange: (period: ProgressPeriod) => void }) {
  const start = progressRangeStart(period, now);
  return <div>
    <label htmlFor="progress-period" className="text-sm text-slate-300">Time period</label>
    <select id="progress-period" value={period} onChange={event => onChange(event.target.value as ProgressPeriod)}
      className="mt-1 w-full min-w-0 rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white">
      {PROGRESS_PERIODS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    <p className="mt-2 text-xs text-slate-500">{start === null ? 'All saved completed workouts.' :
      `${new Date(start).toLocaleDateString()} through ${new Date(now).toLocaleString()}. Rolling calendar months from local midnight; shorter months use their last day. Reopen Progress or change periods to refresh the cutoff.`}</p>
  </div>;
}

function ExerciseDetail({ target, data, groups, period, now, periodLabel, onPeriod, onHistory, store, onBack, onWorkout }: {
  target: DetailTarget;
  data: WorkoutData;
  groups: readonly ExerciseProgress[];
  period: ProgressPeriod;
  now: number;
  periodLabel: string;
  onPeriod: (period: ProgressPeriod) => void;
  onHistory: (id: string) => void;
  store?: WorkoutStore;
  onBack: () => void;
  onWorkout?: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const periodHistory = useMemo(() => filterProgressHistory(data.history, period, now), [data.history, period, now]);
  const periodGroup = useMemo(() => buildWorkoutProgress(periodHistory).find(group => group.key === target.key),
    [periodHistory, target.key]);
  // Infinity keeps every completed workout; the period filter above sets the range.
  const entries = useMemo(() => buildExerciseHistory(periodHistory, Number.POSITIVE_INFINITY, target.name, target.unit, target.bodyweight),
    [periodHistory, target.name, target.unit, target.bodyweight]);
  const remaining = useMemo(() => groups.some(group => group.key === target.key) ||
    buildExerciseHistory(data.history, Number.POSITIVE_INFINITY, target.name, target.unit, target.bodyweight).length > 0,
  [groups, data.history, target]);
  const label = groupLabel(target);

  return <div className="space-y-6">
    <button type="button" className="text-sm text-accent underline underline-offset-4" onClick={onBack}>Back to Progress</button>
    <div>
      <h1 ref={heading} tabIndex={-1} className="break-words text-3xl font-bold text-white focus:outline-none">{label}</h1>
      <p className="mt-2 text-sm text-slate-400">Only this exact saved exercise name and {target.unit} unit. Other names and units stay separate and are never converted.{target.bodyweight ? ' Weights are added load on top of bodyweight; negative values are assistance. Loaded entries of this name are listed separately.' : ''}</p>
    </div>
    <WorkoutGoals data={data} store={store} scope={target} onHistory={onHistory} />
    {!remaining ? (
      <div role="status" data-progress-status className="card space-y-3 p-6 text-center">
        <h2 className="text-lg font-semibold text-white">No data for the selected exercise</h2>
        <p className="text-sm text-slate-400">
          No data for the selected exercise. No completed workouts remain for {label}. They may have been deleted.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" className="btn-ghost" onClick={onBack}>Back to Progress</button>
          {onWorkout && (
            <button type="button" className="btn-primary" onClick={onWorkout}>
              {data.active ? 'Resume workout' : 'Start workout'}
            </button>
          )}
        </div>
      </div>
    ) : <>
      <PeriodControl period={period} now={now} onChange={onPeriod} />
      <div aria-live="polite" className="space-y-3">
        <p className="text-sm text-slate-300">{period === 'all' ? 'All-time records' : `Records for ${periodLabel}`} from regular sets. Warm-ups are excluded.</p>
        {periodGroup ? <ProgressDetails key={`${data.revision}:${period}`} group={periodGroup} onHistory={onHistory} showTitle={false} /> : (
          <div role="status" data-progress-status className="card space-y-3 p-6 text-center">
            <p className="text-base font-semibold text-white">
              {period === 'all' ? 'No regular sets logged' : 'No workouts in the selected time range'}
            </p>
            <p className="text-sm text-slate-400">
              {period === 'all'
                ? `No data for the selected exercise. No regular sets for ${label}. Complete a workout with a regular set to see personal records.`
                : `No workouts in the selected time range. Try selecting a different period or all time. No regular sets for ${label} in ${periodLabel}. Choose a longer period or All time to see earlier progress.`}
            </p>
            {period !== 'all' ? (
              <button type="button" className="btn-ghost mx-auto" onClick={() => onPeriod('all')}>
                Show all time
              </button>
            ) : onWorkout ? (
              <button type="button" className="btn-primary mx-auto" onClick={onWorkout}>
                {data.active ? 'Resume workout' : 'Start workout'}
              </button>
            ) : null}
          </div>
        )}
      </div>
      <ExerciseWorkoutHistory key={`${data.revision}:${period}`} entries={entries} name={target.name} unit={target.unit}
        bodyweight={target.bodyweight} periodLabel={periodLabel} onHistory={onHistory} />
    </>}
  </div>;
}

function ProgressDetails({ group, onHistory, showTitle = true }: {
  group: ExerciseProgress;
  onHistory: (id: string) => void;
  showTitle?: boolean;
}) {
  const [visibleWorkouts, setVisibleWorkouts] = useState(20);
  const [visibleWeights, setVisibleWeights] = useState(20);
  const recentWorkouts = [...group.workouts].reverse();
  const bodyweight = group.bodyweight === true;
  const weight = (value: number) => weightParts(value, group.unit, bodyweight).text;
  const label = groupLabel(group);

  return <div className="space-y-6">
    <div>
      {showTitle && <h2 className="break-words text-2xl font-semibold text-white">{bodyweight ? `${group.name} (bodyweight)` : group.name}</h2>}
      <p className="mt-1 text-sm text-slate-400">{group.workouts.length} completed workouts with {group.loggedSetCount} regular sets in {group.unit}.
        {bodyweight && ' Weights are added load; negative values are assistance.'}</p>
      <p className="mt-1 text-xs text-slate-500">Small converted values are rounded for display only; records stay in the saved unit.</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <section aria-label="Heaviest logged set" className="card min-w-0 p-4">
        <h3 className="text-sm text-slate-400">{bodyweight ? 'Most added load in a set' : 'Heaviest logged set'}</h3>
        <p className="mt-2 break-words text-2xl font-semibold tabular-nums text-white">
          {`${weight(group.heaviestSet.weight)} × ${group.heaviestSet.reps} reps`}
          <AlternateWeight weight={group.heaviestSet.weight} unit={group.unit} bodyweight={bodyweight} />
        </p>
        <p className="mt-1 text-xs text-slate-500">{finishedDate(group.heaviestSet)}</p>
        <button type="button" aria-label="View workout for heaviest set" className="mt-3 text-sm text-accent underline underline-offset-4"
          onClick={() => onHistory(group.heaviestSet.workoutId)}>View workout</button>
      </section>
      <section aria-label="Most reps in a set" className="card min-w-0 p-4">
        <h3 className="text-sm text-slate-400">Most reps in a set</h3>
        <p className="mt-2 break-words text-2xl font-semibold tabular-nums text-white">
          {`${group.mostRepsSet.reps} reps at ${weight(group.mostRepsSet.weight)}`}
          <AlternateWeight weight={group.mostRepsSet.weight} unit={group.unit} bodyweight={bodyweight} />
        </p>
        <p className="mt-1 text-xs text-slate-500">{finishedDate(group.mostRepsSet)}</p>
        <button type="button" aria-label="View workout for most reps" className="mt-3 text-sm text-accent underline underline-offset-4"
          onClick={() => onHistory(group.mostRepsSet.workoutId)}>View workout</button>
      </section>
    </div>
    <WorkoutProgressChart workouts={group.workouts} unit={group.unit} bodyweight={bodyweight} />
    <section aria-labelledby="progress-workouts-title" className="space-y-3">
      <h3 id="progress-workouts-title" className="font-semibold text-white">Workout history</h3>
      <div className="overflow-x-auto">
        <table aria-label="Workout progress history" className="w-full text-left text-sm">
          <caption className="sr-only">Heaviest set in each completed workout for {label}</caption>
          <thead className="text-slate-400"><tr><th className="py-2 pr-4">Finished</th><th className="pr-4">Heaviest set</th><th><span className="sr-only">Source</span></th></tr></thead>
          <tbody className="divide-y divide-white/10">{recentWorkouts.slice(0, visibleWorkouts).map(record => <tr key={record.workoutId}>
            <td className="whitespace-nowrap py-3 pr-4">{finishedDate(record)}</td>
            <td className="whitespace-nowrap pr-4 tabular-nums">{weight(record.weight)} × {record.reps} reps
              <AlternateWeight weight={record.weight} unit={group.unit} bodyweight={bodyweight} /></td>
            <td className="text-right"><button type="button" className="py-2 text-accent underline underline-offset-4"
              aria-label={`View workout ${record.workoutName} from ${new Date(record.finishedAt).toLocaleString()}`}
              onClick={() => onHistory(record.workoutId)}>View</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      {visibleWorkouts < recentWorkouts.length && <button type="button" className="btn-ghost" onClick={() => setVisibleWorkouts(current => current + 20)}>Show more workouts</button>}
    </section>
    <section aria-labelledby="progress-weights-title" className="space-y-3">
      <h3 id="progress-weights-title" className="font-semibold text-white">Rep records by weight</h3>
      <div className="overflow-x-auto">
        <table aria-label="Rep records by weight" className="w-full text-left text-sm">
          <caption className="sr-only">Most reps logged at each weight for {label}</caption>
          <thead className="text-slate-400"><tr><th className="py-2 pr-4">Weight</th><th className="pr-4">Best reps</th><th className="pr-4">Finished</th><th><span className="sr-only">Source</span></th></tr></thead>
          <tbody className="divide-y divide-white/10">{group.repRecords.slice(0, visibleWeights).map(record => <tr key={record.weight}>
            <td className="whitespace-nowrap py-3 pr-4 tabular-nums">{weight(record.weight)}
              <AlternateWeight weight={record.weight} unit={group.unit} bodyweight={bodyweight} /></td>
            <td className="pr-4 tabular-nums">{record.reps}</td>
            <td className="whitespace-nowrap pr-4">{finishedDate(record)}</td>
            <td className="text-right"><button type="button" className="py-2 text-accent underline underline-offset-4"
              aria-label={`View record at ${weight(record.weight)}`} onClick={() => onHistory(record.workoutId)}>View</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      {visibleWeights < group.repRecords.length && <button type="button" className="btn-ghost" onClick={() => setVisibleWeights(current => current + 20)}>Show more weight records</button>}
    </section>
  </div>;
}
