import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useStore } from 'zustand';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import type { Workout, WorkoutGoal } from '@/types/workout';
import { WorkoutProgress } from './WorkoutProgress';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let store: WorkoutStore;
let repository: ReturnType<typeof createWorkoutRepository>;
const finished = new Date(2026, 10, 2, 10).getTime();

function workout(id: string, sets: { reps: number; weight: number; warmup?: boolean }[], options: { bodyweight?: boolean; name?: string } = {}): Workout {
  return { id, name: `Workout ${id}`, unit: 'lb', startedAt: 0, finishedAt: finished,
    exercises: [{ id: `${id}-e`, name: options.name ?? 'Bench press', ...(options.bodyweight ? { bodyweight: true as const } : {}),
      sets: sets.map((set, index) => ({ id: `${id}-s${index}`, reps: set.reps, weight: set.weight, ...(set.warmup ? { kind: 'warmup' as const } : {}) })) }] };
}
const goal = (overrides: Partial<WorkoutGoal> = {}): WorkoutGoal =>
  ({ id: 'g1', name: 'Bench press', unit: 'lb', weight: 225, reps: 5, createdAt: 1, ...overrides });

function Harness({ onHistory }: { onHistory: (id: string) => void }) {
  const state = useStore(store);
  return <WorkoutProgress data={state.data} available={state.loaded && !state.needsReload} store={store}
    onHome={() => {}} onWorkout={() => {}} onHistory={onHistory} />;
}
function idle() {
  if (!store.getState().busy) return Promise.resolve();
  return new Promise<void>(resolve => {
    const unsubscribe = store.subscribe(state => { if (!state.busy) { unsubscribe(); resolve(); } });
  });
}
async function render(history: Workout[], goals: WorkoutGoal[] = [], onHistory = vi.fn()) {
  await repository.save(0, { ...emptyWorkoutData(), history, ...(goals.length ? { goals } : {}) });
  await store.getState().load();
  await act(async () => root.render(<Harness onHistory={onHistory} />));
}
beforeEach(() => {
  repository = createWorkoutRepository(new IDBFactory());
  store = createWorkoutStore(repository);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); });

function button(label: string) {
  const found = [...container.querySelectorAll('button')].find(item => (item.getAttribute('aria-label') ?? item.textContent?.trim()) === label);
  if (!found) throw new Error(`Missing button ${label}`);
  return found;
}
async function click(label: string) { await act(async () => { button(label).click(); await idle(); }); }
function field(label: string) {
  const found = [...container.querySelectorAll('label')].find(item => item.textContent?.trim() === label);
  const control = found && (found.control ?? found.querySelector('input, select'));
  if (!control) throw new Error(`Missing field ${label}`);
  return control as HTMLInputElement | HTMLSelectElement;
}
async function type(label: string, value: string) {
  const control = field(label);
  await act(async () => {
    const prototype = control instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(control, value);
    control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}
async function submit() {
  await act(async () => { container.querySelector<HTMLFormElement>('form[aria-label="Save goal"]')!.requestSubmit(); await idle(); });
}
const goalCard = (label: string) => container.querySelector(`[aria-label="Goal for ${label}"]`);

it('adds a goal and shows the closest logged set with the remaining shortfall', async () => {
  await render([workout('a', [{ reps: 5, weight: 205 }, { reps: 3, weight: 230 }, { reps: 8, weight: 300, warmup: true }])]);
  expect(container.textContent).toContain('Goal progress comes only from regular sets you logged in completed workouts.');
  expect(container.textContent).toContain('No goals yet.');
  await click('Add goal');
  await type('Exercise name', 'Bench press');
  await type('Weight unit', 'lb');
  await type('Goal weight (lb)', '225');
  await type('Goal reps', '5');
  await submit();
  expect(store.getState().data.goals).toMatchObject([{ name: 'Bench press', unit: 'lb', weight: 225, reps: 5 }]);
  expect(container.querySelector('form[aria-label="Save goal"]')).toBeNull();
  expect(container.textContent).toContain('Goal saved.');
  const card = goalCard('Bench press (lb)')!;
  expect(card.textContent).toContain('Goal: 5 reps × 225 lb');
  expect(card.textContent).toContain('102 kg');
  expect(card.textContent).toContain('Best so far: 5 reps × 205 lb');
  expect(card.textContent).toContain('20 lb to go');
});

it('shows the achieving set with its workout link and date', async () => {
  const onHistory = vi.fn();
  await render([workout('win', [{ reps: 6, weight: 230 }])], [goal()], onHistory);
  const card = goalCard('Bench press (lb)')!;
  expect(card.textContent).toContain('Achieved: 6 reps × 230 lb');
  expect(card.textContent).toContain(`Workout win on ${new Date(finished).toLocaleDateString()}`);
  await click('View achieving workout for Bench press (lb)');
  expect(onHistory).toHaveBeenCalledWith('win');
});

it('says when no regular sets exist yet and never counts warm-ups or other units', async () => {
  await render([workout('warm', [{ reps: 10, weight: 300, warmup: true }])], [goal()]);
  expect(goalCard('Bench press (lb)')!.textContent).toContain('No regular sets logged yet for this exact name and unit.');
});

it('describes rep and weight shortfalls together', async () => {
  await render([workout('a', [{ reps: 2, weight: 200 }])], [goal()]);
  expect(goalCard('Bench press (lb)')!.textContent).toContain('25 lb and 3 more reps to go');
});

it('edits a goal with its opening revision and keeps the draft when saved goals changed', async () => {
  await render([], [goal()]);
  await click('Edit goal for Bench press (lb)');
  await type('Goal reps', '3');
  // Another tab changes the library after the editor opened.
  await act(async () => { await store.getState().createGoal({ name: 'Row', unit: 'lb', weight: 100, reps: 8 }); });
  await submit();
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Saved goals changed');
  expect((field('Goal reps') as HTMLInputElement).value).toBe('3');
  await click('Reopen goal');
  expect((field('Goal reps') as HTMLInputElement).value).toBe('5');
  await type('Goal reps', '4');
  await submit();
  expect(store.getState().data.goals?.find(item => item.id === 'g1')).toMatchObject({ reps: 4, createdAt: 1 });
});

it('rejects blank values instead of saving zero', async () => {
  await render([]);
  await click('Add goal');
  await type('Exercise name', 'Squat');
  await type('Goal reps', '5');
  await submit();
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Enter a weight');
  expect(store.getState().data.goals).toBeUndefined();
});

it('deletes a goal only after confirmation', async () => {
  await render([], [goal()]);
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  await click('Delete goal for Bench press (lb)');
  expect(store.getState().data.goals).toHaveLength(1);
  await click('Delete goal for Bench press (lb)');
  expect(confirm).toHaveBeenLastCalledWith('Delete the goal for Bench press (lb)? Logged workouts stay saved.');
  expect(store.getState().data.goals).toEqual([]);
  expect(container.textContent).toContain('Goal deleted.');
});

it('adds a bodyweight goal from the exercise detail view and keeps it separate from loaded entries', async () => {
  await render([
    workout('bw', [{ reps: 8, weight: -20 }, { reps: 5, weight: 10 }], { bodyweight: true, name: 'Pull-up' }),
    workout('loaded', [{ reps: 6, weight: 40 }], { name: 'Pull-up' }),
  ]);
  await click('Open details for Pull-up (lb, bodyweight)');
  await click('Add goal');
  expect((field('Exercise name') as HTMLInputElement).value).toBe('Pull-up');
  expect((field('Bodyweight exercise') as HTMLInputElement).checked).toBe(true);
  await type('Added weight (lb)', '25');
  await type('Goal reps', '5');
  await submit();
  expect(store.getState().data.goals).toMatchObject([{ name: 'Pull-up', unit: 'lb', bodyweight: true, weight: 25, reps: 5 }]);
  const card = goalCard('Pull-up (lb, bodyweight)')!;
  expect(card.textContent).toContain('Goal: 5 reps × +25 lb');
  expect(card.textContent).toContain('Best so far: 5 reps × +10 lb');
  expect(card.textContent).toContain('15 lb to go');
});

it('lists goals read-only when no store is connected', async () => {
  await repository.save(0, { ...emptyWorkoutData(), goals: [goal()] });
  await store.getState().load();
  await act(async () => root.render(<WorkoutProgress data={store.getState().data} available onHome={() => {}} onWorkout={() => {}} onHistory={() => {}} />));
  expect(goalCard('Bench press (lb)')).not.toBeNull();
  expect(container.querySelector('button[aria-label="Edit goal for Bench press (lb)"]')).toBeNull();
});

it('suggests catalog and previously logged exercise names via a datalist while allowing custom names', async () => {
  await render([
    workout('w1', [{ reps: 8, weight: 100 }], { name: 'Custom Cable Crossover' }),
  ]);
  await click('Add goal');
  const input = field('Exercise name') as HTMLInputElement;
  const listId = input.getAttribute('list');
  expect(listId).toBeTruthy();

  const datalist = container.querySelector<HTMLDataListElement>('datalist');
  expect(datalist).toBeTruthy();
  expect(datalist!.id).toBe(listId);

  const options = [...datalist!.querySelectorAll('option')].map(opt => opt.value);
  // Catalog exercises are suggested
  expect(options).toContain('Bench press');
  expect(options).toContain('Back squat');
  expect(options).toContain('Deadlift');
  // Previously logged exercise names are suggested
  expect(options).toContain('Custom Cable Crossover');

  // Custom name not in catalog or previous exercises is still allowed
  await type('Exercise name', 'My Special Lift');
  await type('Goal weight (lb)', '150');
  await type('Goal reps', '10');
  await submit();

  expect(store.getState().data.goals).toMatchObject([{ name: 'My Special Lift', unit: 'lb', weight: 150, reps: 10 }]);
  expect(goalCard('My Special Lift (lb)')).not.toBeNull();
});

it('restores focus to the Add goal button after canceling the goal form', async () => {
  await render([]);
  const addBtn = button('Add goal');
  addBtn.focus();
  expect(document.activeElement).toBe(addBtn);
  await click('Add goal');
  expect(document.activeElement).not.toBe(addBtn);
  await click('Cancel');
  expect(document.activeElement).toBe(button('Add goal'));
});

it('associates bodyweight assistance hint with the added weight input via aria-describedby', async () => {
  await render([]);
  await click('Add goal');
  const bwCheckbox = field('Bodyweight exercise') as HTMLInputElement;
  await act(async () => { bwCheckbox.click(); });
  const weightInput = field('Added weight (lb)') as HTMLInputElement;
  const descId = weightInput.getAttribute('aria-describedby');
  expect(descId).toBeTruthy();
  const desc = document.getElementById(descId!);
  expect(desc?.textContent).toContain('Enter added weight');
});
