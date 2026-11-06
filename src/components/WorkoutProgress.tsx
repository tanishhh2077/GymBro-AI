import { useMemo, useState } from 'react';
import { buildWorkoutProgress } from '@/core/workoutProgress';
import type { ExerciseProgress, RecordedSet } from '@/types/progress';
import type { WorkoutData } from '@/types/workout';
import { WorkoutProgressChart } from './WorkoutProgressChart';

interface Props {
  data: WorkoutData;
  available: boolean;
  onHome: () => void;
  onWorkout: () => void;
  onHistory: (id: string) => void;
}

function finishedDate(record: RecordedSet): string {
  return new Date(record.finishedAt).toLocaleDateString();
}

export function WorkoutProgress({ data, available, onHome, onWorkout, onHistory }: Props) {
  const groups = useMemo(() => buildWorkoutProgress(data.history), [data.history]);
  const [selectedKey, setSelectedKey] = useState('');
  const selected = groups.find(group => group.key === selectedKey) ?? groups[0];

  return <div className="space-y-6">
    <button type="button" className="text-sm text-accent underline underline-offset-4" onClick={onHome}>Back to Home</button>
    <div>
      <h1 className="text-3xl font-bold text-white">Progress</h1>
      <p className="mt-2 text-sm text-slate-400">Personal records from regular sets in completed workouts saved on this device. Warm-ups are excluded.</p>
    </div>
    {!available && <p className="text-slate-400">Reload saved workouts to view progress.</p>}
    {available && !selected && <div className="space-y-4">
      <p className="text-slate-400">Complete a workout with a regular set to see your progress.</p>
      <button type="button" className="btn-primary" onClick={onWorkout}>{data.active ? 'Resume workout' : 'Start workout'}</button>
    </div>}
    {available && selected && <>
      <div>
        <label htmlFor="progress-exercise" className="text-sm text-slate-300">Exercise and unit</label>
        <select id="progress-exercise" value={selected.key} onChange={event => setSelectedKey(event.target.value)}
          className="mt-1 w-full min-w-0 rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white">
          {groups.map(group => <option key={group.key} value={group.key}>{group.name} ({group.unit})</option>)}
        </select>
        <p className="mt-2 text-xs text-slate-500">Each saved exercise name and weight unit has its own history. Use consistent names when logging.</p>
      </div>
      <ProgressDetails key={`${selected.key}:${data.revision}`} group={selected} onHistory={onHistory} />
    </>}
  </div>;
}

function ProgressDetails({ group, onHistory }: { group: ExerciseProgress; onHistory: (id: string) => void }) {
  const [visibleWorkouts, setVisibleWorkouts] = useState(20);
  const [visibleWeights, setVisibleWeights] = useState(20);
  const recentWorkouts = [...group.workouts].reverse();

  return <div className="space-y-6">
    <div>
      <h2 className="break-words text-2xl font-semibold text-white">{group.name}</h2>
      <p className="mt-1 text-sm text-slate-400">{group.workouts.length} completed workouts with {group.loggedSetCount} regular sets in {group.unit}.</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <section aria-label="Heaviest logged set" className="card min-w-0 p-4">
        <h3 className="text-sm text-slate-400">Heaviest logged set</h3>
        <p className="mt-2 break-words text-2xl font-semibold tabular-nums text-white">
          {`${group.heaviestSet.weight} ${group.unit} × ${group.heaviestSet.reps} reps`}
        </p>
        <p className="mt-1 text-xs text-slate-500">{finishedDate(group.heaviestSet)}</p>
        <button type="button" aria-label="View workout for heaviest set" className="mt-3 text-sm text-accent underline underline-offset-4"
          onClick={() => onHistory(group.heaviestSet.workoutId)}>View workout</button>
      </section>
      <section aria-label="Most reps in a set" className="card min-w-0 p-4">
        <h3 className="text-sm text-slate-400">Most reps in a set</h3>
        <p className="mt-2 break-words text-2xl font-semibold tabular-nums text-white">
          {`${group.mostRepsSet.reps} reps at ${group.mostRepsSet.weight} ${group.unit}`}
        </p>
        <p className="mt-1 text-xs text-slate-500">{finishedDate(group.mostRepsSet)}</p>
        <button type="button" aria-label="View workout for most reps" className="mt-3 text-sm text-accent underline underline-offset-4"
          onClick={() => onHistory(group.mostRepsSet.workoutId)}>View workout</button>
      </section>
    </div>
    <WorkoutProgressChart workouts={group.workouts} unit={group.unit} />
    <section aria-labelledby="progress-workouts-title" className="space-y-3">
      <h3 id="progress-workouts-title" className="font-semibold text-white">Workout history</h3>
      <div className="overflow-x-auto">
        <table aria-label="Workout progress history" className="w-full text-left text-sm">
          <caption className="sr-only">Heaviest set in each completed workout for {group.name} ({group.unit})</caption>
          <thead className="text-slate-400"><tr><th className="py-2 pr-4">Finished</th><th className="pr-4">Heaviest set</th><th><span className="sr-only">Source</span></th></tr></thead>
          <tbody className="divide-y divide-white/10">{recentWorkouts.slice(0, visibleWorkouts).map(record => <tr key={record.workoutId}>
            <td className="whitespace-nowrap py-3 pr-4">{finishedDate(record)}</td>
            <td className="whitespace-nowrap pr-4 tabular-nums">{record.weight} {group.unit} × {record.reps} reps</td>
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
          <caption className="sr-only">Most reps logged at each weight for {group.name} ({group.unit})</caption>
          <thead className="text-slate-400"><tr><th className="py-2 pr-4">Weight</th><th className="pr-4">Best reps</th><th className="pr-4">Finished</th><th><span className="sr-only">Source</span></th></tr></thead>
          <tbody className="divide-y divide-white/10">{group.repRecords.slice(0, visibleWeights).map(record => <tr key={record.weight}>
            <td className="whitespace-nowrap py-3 pr-4 tabular-nums">{record.weight} {group.unit}</td>
            <td className="pr-4 tabular-nums">{record.reps}</td>
            <td className="whitespace-nowrap pr-4">{finishedDate(record)}</td>
            <td className="text-right"><button type="button" className="py-2 text-accent underline underline-offset-4"
              aria-label={`View record at ${record.weight} ${group.unit}`} onClick={() => onHistory(record.workoutId)}>View</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      {visibleWeights < group.repRecords.length && <button type="button" className="btn-ghost" onClick={() => setVisibleWeights(current => current + 20)}>Show more weight records</button>}
    </section>
  </div>;
}
