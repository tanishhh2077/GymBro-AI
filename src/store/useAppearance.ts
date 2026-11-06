import { useLayoutEffect, useState, useSyncExternalStore } from 'react';

export type AppearancePreference = 'system' | 'light' | 'dark';
export interface AppearanceSettings {
  preference: AppearancePreference;
  resolved: 'light' | 'dark';
  notice: string;
  setPreference: (value: AppearancePreference) => void;
}
const KEY = 'gymbro-ai:appearance';
const QUERY = '(prefers-color-scheme: dark)';
const SESSION_NOTICE = 'Appearance applies for this session. Device settings storage is unavailable.';
export function isAppearancePreference(value: unknown): value is AppearancePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}
function initialSelection(): { preference: AppearancePreference; notice: string } {
  try {
    const saved = window.localStorage.getItem(KEY);
    return { preference: isAppearancePreference(saved) ? saved : 'system', notice: '' };
  } catch {
    return { preference: 'system', notice: SESSION_NOTICE };
  }
}
function subscribeToSystem(listener: () => void) {
  const media = window.matchMedia?.(QUERY);
  media?.addEventListener('change', listener);
  return () => media?.removeEventListener('change', listener);
}
function systemIsDark() { return window.matchMedia?.(QUERY).matches ?? true; }

export function useAppearance(): AppearanceSettings {
  const [selection, setSelection] = useState(initialSelection);
  const systemDark = useSyncExternalStore(subscribeToSystem, systemIsDark, () => true);
  const resolved = selection.preference === 'system' ? (systemDark ? 'dark' : 'light') : selection.preference;
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.theme;
    const wasDark = root.classList.contains('dark');
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousColor = meta?.content;
    root.dataset.theme = resolved;
    root.classList.toggle('dark', resolved === 'dark');
    if (meta) meta.content = resolved === 'light' ? '#f5f7fb' : '#05070d';
    return () => {
      if (previous === undefined) root.removeAttribute('data-theme'); else root.dataset.theme = previous;
      root.classList.toggle('dark', wasDark);
      if (meta && previousColor !== undefined) meta.content = previousColor;
    };
  }, [resolved]);
  function setPreference(preference: AppearancePreference) {
    let notice = '';
    try { window.localStorage.setItem(KEY, preference); } catch { notice = SESSION_NOTICE; }
    setSelection({ preference, notice });
  }
  return { preference: selection.preference, resolved, notice: selection.notice, setPreference };
}
