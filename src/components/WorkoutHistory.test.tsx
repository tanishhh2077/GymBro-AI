import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import type { Workout } from '@/types/workout';
import { WorkoutHistory } from './WorkoutHistory';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let store: WorkoutStore;
let repository: ReturnType<typeof createWorkoutRepository>;
const onSummary = vi.fn();
const analysis = { onAnalyze: vi.fn(), onView: vi.fn() };
function workout(index: number): Workout {
  return { id: `w${index}`, name: index === 0 ? 'Lower day' : `Upper ${index}`, unit: 'kg',
    startedAt: new Date(2026, 10, index + 1, 9).getTime(), finishedAt: new Date(2026, 10, index + 1, 10).getTime(),
    exercises: [{ id: `e${index}`, name: index === 0 ? 'Squat' : 'Bench press',
      sets: [{ id: `s${index}`, reps: 8, weight: 60 }] }] };
}
beforeEach(() => {
  repository = createWorkoutRepository(new IDBFactory());
  store = createWorkoutStore(repository);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.clearAllMocks(); });
async function render(initialId?: string) {
  await act(async () => root.render(<WorkoutHistory store={store} initialId={initialId} onSummary={onSummary} analysis={analysis} />));
}
async function seed(count = 3) {
  await repository.save(0, { ...emptyWorkoutData(), history: Array.from({ length: count }, (_, i) => workout(i)) });
  await act(async () => { await store.getState().load(); }); await render();
}
async function fill(name: string, value: string) {
  const label = [...container.querySelectorAll('label')].find(el => el.textContent?.trim() === name);
  const input = label && document.getElementById(label.htmlFor) as HTMLInputElement;
  if (!input) throw new Error(`Missing input: ${name}`);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function click(name: string) {
  const button = [...container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') ?? el.textContent?.trim()) === name);
  if (!button) throw new Error(`Missing button: ${name}`);
  await act(async () => {
    button.click();
    if (store.getState().busy) await new Promise<void>(resolve => {
      const off = store.subscribe(state => { if (!state.busy) { off(); resolve(); } });
    });
  });
}
function rows() { return [...container.querySelectorAll('li button span:first-child')].map(el => el.textContent); }
async function openFirst() { await act(async () => container.querySelector<HTMLButtonElement>('li button')!.click()); }

it('combines name and date filters, shows counts and clears without saving', async () => {
  await seed(); const before = store.getState().data;
  await fill('Search workouts or exercises', 'bEnCh');
  expect(rows()).toEqual(['Upper 2', 'Upper 1']);
  expect(container.textContent).toContain('2 of 3 workouts match');
  await fill('From', '2026-11-03'); await fill('To', '2026-11-03');
  expect(rows()).toEqual(['Upper 2']);
  expect(container.textContent).toContain('1 of 3 workouts match');
  await click('Clear filters');
  expect(rows()).toEqual(['Upper 2', 'Upper 1', 'Lower day']);
  expect(container.textContent).toContain('3 of 3 workouts match');
  expect(store.getState().data).toBe(before);
  expect(await repository.load()).toEqual(before);
});

it('distinguishes empty history, no matches and reversed date ranges', async () => {
  await store.getState().load(); await render();
  expect(container.textContent).toContain('Finish a workout to see it here.');
  await seed(); await fill('Search workouts or exercises', 'absent');
  expect(container.textContent).toContain('No workouts match these filters.');
  expect(container.textContent).toContain('0 of 3 workouts match');
  await fill('From', '2026-11-04'); await fill('To', '2026-11-02');
  expect(container.querySelector('[role=alert]')?.textContent).toBe('From date must be on or before To date.');
  expect(rows()).toEqual([]);
  expect(container.textContent).not.toContain('0 of 3 workouts match');
  await fill('To', '2026-11-04');
  expect(container.querySelector('[role=alert]')).toBeNull();
});

it('filters all saved workouts before pagination and resets paging when filters change', async () => {
  await seed(25);
  expect(rows()).toHaveLength(20); expect(rows()[0]).toBe('Upper 24');
  await click('Show more workouts'); expect(rows()).toHaveLength(25);
  await fill('Search workouts or exercises', 'upper'); expect(rows()).toHaveLength(20);
  expect(container.textContent).toContain('24 of 25 workouts match');
  await click('Show more workouts'); expect(rows()).toHaveLength(24);
  await fill('To', '2026-11-23'); expect(rows()).toHaveLength(20);
  await click('Show more workouts'); expect(rows()).toHaveLength(22);
  await fill('From', '2026-11-03'); expect(rows()).toHaveLength(20);
  await click('Clear filters'); expect(rows()).toHaveLength(20);
  await fill('Search workouts or exercises', 'lower'); expect(rows()).toEqual(['Lower day']);
});

it('retains filters on return, while direct workout links bypass them', async () => {
  await seed(); await fill('Search workouts or exercises', 'upper'); await openFirst();
  await click('View summary'); expect(onSummary).toHaveBeenCalledWith('w2');
  await click('Analyze video for set 1 of Bench press');
  expect(analysis.onAnalyze).toHaveBeenCalledWith({ workoutId: 'w2', exerciseId: 'e2', setId: 's2' });
  await click('Back to history'); expect(rows()).toEqual(['Upper 2', 'Upper 1']);
  await render('w0');
  expect(container.querySelector('h1')?.textContent).toBe('Lower day');
  await click('View summary'); expect(onSummary).toHaveBeenLastCalledWith('w0');
  await click('Back to history'); expect(rows()).toEqual(['Upper 2', 'Upper 1']);
});

it('deletes a filtered workout only after confirmation and updates matching counts', async () => {
  await seed(); await fill('Search workouts or exercises', 'Upper 2'); await openFirst();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await click('Delete workout'); expect(store.getState().data.history).toHaveLength(3);
  confirm.mockReturnValue(true); await click('Delete workout');
  expect(rows()).toEqual([]); expect(container.textContent).toContain('0 of 2 workouts match');
  expect((await repository.load()).history.map(w => w.id)).toEqual(['w0', 'w1']);
});

it('clears only the search query when Clear search is clicked, preserving date bounds', async () => {
  await seed();
  await fill('From', '2026-11-02');
  await fill('Search workouts or exercises', 'bench');
  expect(rows()).toEqual(['Upper 2', 'Upper 1']);
  await click('Clear search');
  expect(rows()).toEqual(['Upper 2', 'Upper 1']);
  expect(container.textContent).toContain('2 of 3 workouts match');
  const searchInput = container.querySelector<HTMLInputElement>('input[type="search"]');
  expect(searchInput?.value).toBe('');
  expect(container.querySelector('button[aria-label="Clear search"]')).toBeNull();
});

it('shows clear search button when search matches nothing and clears to restore workouts', async () => {
  await seed();
  await fill('Search workouts or exercises', 'nonexistent workout');
  expect(container.textContent).toContain('No workouts match these filters.');
  expect(container.textContent).toContain('0 of 3 workouts match');
  await click('Clear search');
  expect(rows()).toEqual(['Upper 2', 'Upper 1', 'Lower day']);
  expect(container.textContent).toContain('3 of 3 workouts match');
});
