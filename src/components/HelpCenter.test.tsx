import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { HelpCenter } from './HelpCenter';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

it('explains logging, privacy and honest bench limits and returns Home', () => {
  const close = vi.fn();
  act(() => root.render(<HelpCenter onClose={close} />));
  expect(container.textContent).toContain('shoulders, elbows, and wrists');
  expect(container.textContent).toContain('not validated technique');
  expect(container.textContent).toContain('Regular');
  expect(container.textContent).toContain('device');
  act(() => container.querySelector('button')!.click());
  expect(close).toHaveBeenCalledOnce();
});

it('searches case-insensitive words, shows an empty result and clears search', () => {
  act(() => root.render(<HelpCenter onClose={() => {}} />));
  const input = container.querySelector('input')!;
  function search(value: string) {
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  search('BACKUP restore');
  expect(container.querySelectorAll('article')).toHaveLength(1);
  expect(container.textContent).toContain('Backup and restore');
  search('unmatched-xyz');
  expect(container.querySelectorAll('article')).toHaveLength(0);
  expect(container.textContent).toContain('No help topics match');
  act(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Clear search')!.click());
  expect(container.querySelectorAll('article').length).toBeGreaterThan(3);
});
