import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { ExercisePicker } from './ExercisePicker';
import { emptyWorkoutData } from '@/core/workouts';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); });

it('favorites without selecting or submitting, filters equipment and exposes session fallback', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  const change = vi.fn();
  const data = { ...emptyWorkoutData(), routines: [{ id: 'routine', name: 'Plan', unit: 'kg' as const,
    exercises: [{ id: 'one', name: 'My exercise' }] }] };
  act(() => root.render(<ExercisePicker id="exercise" label="Exercise" value="" onChange={change} data={data} />));
  const favorite = container.querySelector<HTMLButtonElement>('[aria-label="Favorite Bench press"]')!;
  expect(favorite).not.toBeNull();
  expect(favorite.type).toBe('button');
  act(() => favorite.click());
  expect(change).not.toHaveBeenCalled();
  expect(container.querySelector('li')!.textContent).toContain('Bench press');
  expect(container.textContent).toContain('session');
  expect(container.querySelector('[role=status]')!.classList.contains('text-warn')).toBe(true);
  const select = container.querySelector('select')!;
  act(() => { select.value = 'Dumbbell'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  expect(container.querySelector('[aria-label="Use Bench press"]')).toBeNull();
  const search = container.querySelector('input[type="search"]')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search, 'My exercise');
    search.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const custom = container.querySelector<HTMLButtonElement>('[aria-label="Use My exercise"]')!;
  expect(custom).not.toBeNull();
  act(() => custom.click());
  expect(change).toHaveBeenCalledWith('My exercise');
});
