import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppearanceControl } from './AppearanceControl';
import { applyStoredTextSize, isTextSize, readTextSize, TEXT_SIZE_KEY } from './textSizePreference';

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
