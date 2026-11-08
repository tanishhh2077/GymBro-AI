import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, type WorkoutStore } from '@/store/useWorkoutStore';
import type { Workout, WorkoutRoutine } from '@/types/workout';
import App from './App';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
let store: WorkoutStore;
let repository: ReturnType<typeof createWorkoutRepository>;

const sampleFinishedWorkout: Workout = {
  id: 'finished-1',
  name: 'Upper Body Blast',
  unit: 'kg',
  startedAt: 1000,
  finishedAt: 2000,
  exercises: [
    {
      id: 'ex-1',
      name: 'Bench press',
      sets: [
        { id: 's-1', reps: 8, weight: 60, kind: 'regular' },
      ],
    },
  ],
};

const sampleRoutine: WorkoutRoutine = {
  id: 'routine-1',
  name: 'Push Day Routine',
  unit: 'kg',
  exercises: [
    { id: 'r-ex-1', name: 'Bench press', targetSets: 3, targetReps: 8 },
  ],
};

export interface AllowlistEntry {
  screen: 'Home' | 'Workout' | 'History' | 'Routines' | 'Progress' | 'Backup' | 'Analyze';
  selector: string;
  component: string;
  reason: string;
  match: (el: HTMLElement) => boolean;
}

/**
 * Strict and shrinkable allowlist of known existing accessibility violations.
 * Tests will fail if an unknown violation appears, or if a listed violation is resolved
 * without removing it from this list.
 */
export const KNOWN_A11Y_VIOLATIONS: readonly AllowlistEntry[] = [
  {
    screen: 'Analyze',
    selector: 'input[type="file"][accept=".mp4,video/mp4"].hidden',
    component: 'src/components/ClipDropzone.tsx',
    reason:
      'Hidden file input used for video upload is triggered programmatically via the visible "Choose video" button, but lacks an accessible name (aria-label/title) and an associated <label>.',
    match: el =>
      el.tagName.toLowerCase() === 'input' &&
      (el as HTMLInputElement).type === 'file' &&
      el.getAttribute('accept')?.includes('video/mp4') === true &&
      el.classList.contains('hidden'),
  },
];

function getAccessibleName(el: HTMLElement): string {
  // 1. aria-labelledby
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const parts = labelledBy
      .trim()
      .split(/\s+/)
      .map(id => document.getElementById(id)?.textContent?.trim() ?? '')
      .filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
  }

  // 2. aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

  // 3. Associated label (wrapping or htmlFor)
  const wrappingLabel = el.closest('label');
  if (wrappingLabel && wrappingLabel.textContent?.trim()) {
    return wrappingLabel.textContent.trim();
  }
  if (el.id) {
    const labels = [...document.querySelectorAll('label')].filter(l => l.htmlFor === el.id);
    const text = labels.map(l => l.textContent?.trim() ?? '').filter(Boolean).join(' ');
    if (text) return text;
  }

  // 4. title attribute
  const title = el.getAttribute('title');
  if (title && title.trim()) return title.trim();

  // 5. non-empty text content (for buttons and links)
  const tag = el.tagName.toLowerCase();
  if (tag === 'button' || tag === 'a') {
    const text = el.textContent?.trim();
    if (text) return text;
  }

  // For input type="button" or input type="submit", value attribute acts as label
  if (tag === 'input') {
    const type = (el as HTMLInputElement).type?.toLowerCase();
    if (type === 'button' || type === 'submit') {
      const val = (el as HTMLInputElement).value?.trim();
      if (val) return val;
    }
  }

  return '';
}

function hasAssociatedLabelOrAria(el: HTMLElement): boolean {
  // 1. aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) return true;

  // 2. aria-labelledby
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const parts = labelledBy
      .trim()
      .split(/\s+/)
      .map(id => document.getElementById(id)?.textContent?.trim() ?? '')
      .filter(Boolean);
    if (parts.length > 0) return true;
  }

  // 3. Associated label (wrapping or htmlFor)
  if (el.closest('label')?.textContent?.trim()) return true;
  if (el.id) {
    const labels = [...document.querySelectorAll('label')].filter(l => l.htmlFor === el.id);
    const text = labels.map(l => l.textContent?.trim() ?? '').filter(Boolean).join(' ');
    if (text) return true;
  }

  return false;
}

interface Violation {
  screen: string;
  tag: string;
  outerHTML: string;
  reasons: string[];
}

function assertScreenAccessibility(screen: AllowlistEntry['screen']) {
  const elements = [...container.querySelectorAll<HTMLElement>('button, input, select, textarea, a')];
  expect(elements.length, `Expected interactive elements to be rendered on ${screen}`).toBeGreaterThan(0);

  const screenAllowlist = KNOWN_A11Y_VIOLATIONS.filter(v => v.screen === screen);
  const usedAllowlist = new Set<AllowlistEntry>();
  const violations: Violation[] = [];

  for (const el of elements) {
    const tag = el.tagName.toLowerCase();
    const accessibleName = getAccessibleName(el);
    const reasons: string[] = [];

    if (!accessibleName) {
      reasons.push('missing-accessible-name');
    }

    if (tag === 'input' || tag === 'select' || tag === 'textarea') {
      if (!hasAssociatedLabelOrAria(el)) {
        reasons.push('form-field-missing-label');
      }
    }

    if (reasons.length > 0) {
      const match = screenAllowlist.find(entry => !usedAllowlist.has(entry) && entry.match(el));
      if (match) {
        usedAllowlist.add(match);
      } else {
        violations.push({
          screen,
          tag,
          outerHTML: el.outerHTML,
          reasons,
        });
      }
    }
  }

  if (violations.length > 0) {
    console.error(`Accessibility violations on ${screen}:`, JSON.stringify(violations, null, 2));
  }

  expect(violations, `Unexpected accessibility violations found on ${screen}`).toEqual([]);

  const unused = screenAllowlist.filter(entry => !usedAllowlist.has(entry));
  expect(unused, `Allowlist contains entries that did not match any violation on ${screen} (shrink the allowlist!)`).toEqual([]);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('gymbro-intro-v1', 'seen');
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  repository = createWorkoutRepository(new IDBFactory());
  store = createWorkoutStore(repository);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = vi.fn(() => 'blob:backup');
  } else {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup');
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    URL.revokeObjectURL = vi.fn();
  } else {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  }
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function idle() {
  if (!store.getState().busy) return Promise.resolve();
  return new Promise<void>(resolve => {
    const unsubscribe = store.subscribe(state => {
      if (!state.busy) {
        unsubscribe();
        resolve();
      }
    });
  });
}

async function renderApp() {
  await act(async () => root.render(<App workouts={store} />));
  await act(idle);
}

async function clickNav(name: string) {
  const btn = [...container.querySelectorAll('nav button')].find(
    el => el.textContent?.trim() === name
  ) as HTMLButtonElement | undefined;
  if (!btn) throw new Error(`Nav button "${name}" not found`);
  await act(async () => {
    btn.click();
    await idle();
  });
}

async function clickButton(name: string) {
  const btn = [...container.querySelectorAll('button')].find(
    el => (el.getAttribute('aria-label') ?? el.textContent?.trim()) === name
  );
  if (!btn) throw new Error(`Button "${name}" not found`);
  await act(async () => {
    btn.click();
    await idle();
  });
}

async function settleLazy() {
  for (let i = 0; i < 1000 && !container.textContent?.includes('Choose video'); i++) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  }
}

describe('Accessible labels smoke test', () => {
  it('Screen 1: Home', async () => {
    await repository.save(0, {
      ...emptyWorkoutData(),
      history: [sampleFinishedWorkout],
      routines: [sampleRoutine],
    });
    await renderApp();
    assertScreenAccessibility('Home');
  });

  it('Screen 2: Workout (with active workout and one exercise)', async () => {
    await store.getState().load();
    await store.getState().startWorkout('Upper Body', 'kg');
    await store.getState().addExercise('Bench press');
    await renderApp();
    await clickNav('Workout');
    assertScreenAccessibility('Workout');
  });

  it('Screen 3: History (with a finished workout)', async () => {
    await repository.save(0, {
      ...emptyWorkoutData(),
      history: [sampleFinishedWorkout],
    });
    await renderApp();
    await clickButton('View workout history');
    assertScreenAccessibility('History');
  });

  it('Screen 4: Routines', async () => {
    await repository.save(0, {
      ...emptyWorkoutData(),
      routines: [sampleRoutine],
    });
    await renderApp();
    await clickNav('Routines');
    assertScreenAccessibility('Routines');
  });

  it('Screen 5: Progress', async () => {
    await repository.save(0, {
      ...emptyWorkoutData(),
      history: [sampleFinishedWorkout],
    });
    await renderApp();
    await clickButton('View progress');
    assertScreenAccessibility('Progress');
  });

  it('Screen 6: Backup', async () => {
    await renderApp();
    await clickButton('Backup and restore');
    assertScreenAccessibility('Backup');
  });

  it('Screen 7: Analyze', async () => {
    await renderApp();
    await clickNav('Analyze');
    await settleLazy();
    assertScreenAccessibility('Analyze');
  });
});
