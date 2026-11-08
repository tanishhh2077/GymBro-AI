import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppearanceControl } from './AppearanceControl';
import {
  applyStoredTextSize,
  isTextSize,
  readTextSize,
  TEXT_SIZE_KEY,
  TEXT_SIZE_NOTICE,
  writeTextSize,
} from './textSizePreference';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
const settings = { preference: 'system', resolved: 'dark', notice: '', setPreference: () => {} } as const;
beforeEach(() => {
  localStorage.clear(); delete document.documentElement.dataset.textSize;
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove(); localStorage.clear();
  delete document.documentElement.dataset.textSize; vi.restoreAllMocks();
});
const render = () => act(async () => root.render(<AppearanceControl settings={settings} />));
function textSizeSelect() {
  const label = [...container.querySelectorAll('label')].find(element => element.textContent === 'Text size');
  expect(label, 'a Text size control is offered').toBeDefined();
  return document.getElementById(label!.htmlFor) as HTMLSelectElement;
}
async function choose(value: string) {
  const element = textSizeSelect();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

it('validates stored values and defaults unknown or unreadable storage to normal', () => {
  expect(isTextSize('large')).toBe(true); expect(isTextSize('huge')).toBe(false);
  expect(readTextSize()).toEqual({ size: 'normal', readable: true });
  localStorage.setItem(TEXT_SIZE_KEY, 'bogus');
  expect(readTextSize().size).toBe('normal');
  expect(localStorage.getItem(TEXT_SIZE_KEY)).toBe('bogus');
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
  expect(readTextSize()).toEqual({ size: 'normal', readable: false });
});

it('applies the saved size to the root before any control renders', () => {
  localStorage.setItem(TEXT_SIZE_KEY, 'larger');
  applyStoredTextSize();
  expect(document.documentElement.dataset.textSize).toBe('larger');
});

it('offers Normal, Large and Larger and applies and saves the choice', async () => {
  await render();
  const element = textSizeSelect();
  expect([...element.options].map(option => option.textContent)).toEqual(['Normal', 'Large', 'Larger']);
  expect(element.value).toBe('normal');
  await choose('large');
  expect(document.documentElement.dataset.textSize).toBe('large');
  expect(localStorage.getItem(TEXT_SIZE_KEY)).toBe('large');
  await act(async () => root.unmount()); root = createRoot(container);
  await render();
  expect(textSizeSelect().value).toBe('large');
});

it('keeps the chosen size for the session and says so when storage refuses it', async () => {
  await render();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
  await choose('larger');
  expect(document.documentElement.dataset.textSize).toBe('larger');
  expect(container.textContent).toContain('Text size applies for this session');
});

it('reports unreadable storage with a notice and stays on Normal', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
  await render();
  expect(textSizeSelect().value).toBe('normal');
  expect(container.textContent).toContain('Text size applies for this session');
});

it('rejects corrupt, oversized and wrong-type values in isTextSize', () => {
  const invalid = [
    null, undefined, 0, 1, -1, NaN, Infinity, -Infinity, true, false,
    {}, [], () => {}, Symbol('normal'),
    '', '   ', 'normal ', ' normal', ' large', 'large ', ' larger', 'larger ',
    'NORMAL', 'Normal', 'LARGE', 'Large', 'LARGER', 'Larger',
    'larger\0', 'small', 'huge', 'medium', 'extra-large',
    'large'.repeat(10_000), JSON.stringify({ size: 'large' }),
  ];
  for (const value of invalid) {
    expect(isTextSize(value), `expected ${String(value).slice(0, 20)} to be invalid`).toBe(false);
  }
  expect(isTextSize('normal')).toBe(true);
  expect(isTextSize('large')).toBe(true);
  expect(isTextSize('larger')).toBe(true);
});

it('defaults corrupt, oversized or JSON stored values to normal without rewriting storage', () => {
  const corruptValues = [
    '',
    '{"size":"large"}',
    '["large"]',
    'NORMAL',
    'Normal',
    ' large ',
    'huge',
    'larger\0',
    'large'.repeat(20_000),
  ];
  for (const corrupt of corruptValues) {
    localStorage.setItem(TEXT_SIZE_KEY, corrupt);
    const read = readTextSize();
    expect(read).toEqual({ size: 'normal', readable: true });
    expect(localStorage.getItem(TEXT_SIZE_KEY)).toBe(corrupt);
  }
});

it('handles varied write errors including quota errors and security errors', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError');
  });
  expect(writeTextSize('large')).toBe(false);

  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Access denied', 'SecurityError');
  });
  expect(writeTextSize('larger')).toBe(false);

  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw 'non-error throw';
  });
  expect(writeTextSize('normal')).toBe(false);
});

it('handles varied read errors and blocked localStorage property access', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Storage quota error', 'QuotaExceededError');
  });
  expect(readTextSize()).toEqual({ size: 'normal', readable: false });

  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Access denied', 'SecurityError');
  });
  expect(readTextSize()).toEqual({ size: 'normal', readable: false });

  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw 'string throw';
  });
  expect(readTextSize()).toEqual({ size: 'normal', readable: false });

  const spy = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('localStorage blocked', 'SecurityError');
  });
  try {
    expect(readTextSize()).toEqual({ size: 'normal', readable: false });
    expect(writeTextSize('large')).toBe(false);
  } finally {
    spy.mockRestore();
  }
});

it('keeps the choice for the session on quota error and clears notice when write succeeds later', async () => {
  await render();
  const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('QuotaExceededError', 'QuotaExceededError');
  });
  await choose('larger');
  expect(document.documentElement.dataset.textSize).toBe('larger');
  expect(textSizeSelect().value).toBe('larger');
  expect(container.textContent).toContain(TEXT_SIZE_NOTICE);

  setItemSpy.mockRestore();
  await choose('large');
  expect(document.documentElement.dataset.textSize).toBe('large');
  expect(textSizeSelect().value).toBe('large');
  expect(localStorage.getItem(TEXT_SIZE_KEY)).toBe('large');
  expect(container.textContent).not.toContain(TEXT_SIZE_NOTICE);
});

it('renders cleanly with default Normal when stored value is an oversized corrupt string', async () => {
  const oversized = 'corrupt-text-size-value-'.repeat(5_000);
  localStorage.setItem(TEXT_SIZE_KEY, oversized);
  await render();
  expect(textSizeSelect().value).toBe('normal');
  expect(document.documentElement.dataset.textSize).toBe('normal');
  expect(container.textContent).not.toContain(TEXT_SIZE_NOTICE);
  expect(localStorage.getItem(TEXT_SIZE_KEY)).toBe(oversized);
});
