import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { PlateCalculator } from './PlateCalculator';
import { WorkoutEditor } from './WorkoutEditor';
import { createWorkoutStore } from '@/store/useWorkoutStore';
import { IDBFactory } from 'fake-indexeddb';
import { createWorkoutRepository } from '@/store/workoutRepository';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); document.body.replaceChildren(); });
async function render(unit: 'lb' | 'kg' = 'lb') { await act(async () => root.render(<PlateCalculator unit={unit} />)); }
async function input(label: string, value: string) {
  const field = [...container.querySelectorAll('input')].find(el => el.labels?.[0]?.textContent === label);
  expect(field, label).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, value);
    field!.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function calculate() {
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}
it('starts collapsed and uses the supplied workout unit', async () => {
  await render('kg');
  expect(container.querySelector('details')?.open).toBe(false);
  expect([...container.querySelectorAll('summary')].some(el => el.textContent === 'Plate calculator')).toBe(true);
  await input('Total target weight (kg)', '25'); await calculate();
  expect(container.querySelector('output')?.textContent).toContain('Resulting total: 25 kg');
  expect(container.querySelector('output')?.textContent).toContain('2.5 kg');
  expect(container.textContent).toContain('does not log');
});
it('clears stale results on edits and explains invalid and impossible targets', async () => {
  await render(); await input('Total target weight (lb)', '45'); await calculate();
  expect(container.querySelector('output')?.textContent).toContain('Bar only');
  await input('Bar weight (lb)', '46');
  expect(container.querySelector('output')).toBeNull();
  await calculate(); expect(container.querySelector('[role=alert]')?.textContent).toContain('below');
  await input('Total target weight (lb)', '47'); await calculate();
  expect(container.querySelector('[role=status]')?.textContent).toContain('No exact balanced loading');
  await input('Available pairs 1', '-1'); await calculate();
  expect(container.querySelector('[role=alert]')?.textContent).toContain('whole numbers');
});
it('edits denominations and pair counts, supports adding/removing rows and resets on remount', async () => {
  await render('kg'); await input('Total target weight (kg)', '22.5');
  await input('Plate weight 1 (kg)', '1.25'); await input('Available pairs 1', '1'); await calculate();
  expect(container.querySelector('output')?.textContent).toContain('1 × 1.25 kg');
  const click = async (name: string) => act(async () => { [...container.querySelectorAll('button')].find(el => el.textContent === name)!.click(); });
  const count = container.querySelectorAll('input').length;
  await click('Add denomination'); expect(container.querySelectorAll('input')).toHaveLength(count + 2);
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Remove plate denomination 7"]')!.click());
  expect(container.querySelectorAll('input')).toHaveLength(count);
  await act(async () => root.render(null)); await render('kg');
  expect(container.querySelector('output')).toBeNull();
  expect(container.querySelector<HTMLInputElement>('input')?.value).toBe('');
});
it('is integrated without modifying workout records or logging a set', async () => {
  const repository = createWorkoutRepository(new IDBFactory());
  const store = createWorkoutStore(repository);
  await store.getState().load();
  await store.getState().startWorkout('Calculator test', 'kg');
  const before = JSON.stringify(store.getState().data);
  await act(async () => root.render(<WorkoutEditor store={store} onFinished={() => {}} />));
  expect([...container.querySelectorAll('summary')].some(el => el.textContent === 'Plate calculator')).toBe(true);
  await input('Total target weight (kg)', '25');
  await act(async () => container.querySelector('form[aria-label="Plate calculator"]')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(container.querySelector('output')?.textContent).toContain('25 kg');
  expect(JSON.stringify(store.getState().data)).toBe(before);
  expect(await repository.load()).toEqual(store.getState().data);
});
