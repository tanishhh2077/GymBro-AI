import { useLayoutEffect, useState } from 'react';

// A device-local display preference, kept apart from workout records and backups.
export type TextSize = 'normal' | 'large' | 'larger';
export const TEXT_SIZE_KEY = 'gymbro-ai:text-size-v1';
export const TEXT_SIZE_NOTICE = 'Text size applies for this session. Device settings storage is unavailable.';
export const TEXT_SIZES: readonly { value: TextSize; label: string }[] = [
  { value: 'normal', label: 'Normal' }, { value: 'large', label: 'Large' }, { value: 'larger', label: 'Larger' },
];

export function isTextSize(value: unknown): value is TextSize {
  return value === 'normal' || value === 'large' || value === 'larger';
}

/** Unknown stored values read as Normal and are never rewritten by a read. */
export function readTextSize(): { size: TextSize; readable: boolean } {
  try {
    const saved = window.localStorage.getItem(TEXT_SIZE_KEY);
    return { size: isTextSize(saved) ? saved : 'normal', readable: true };
  } catch { return { size: 'normal', readable: false }; }
}

/** Returns false when the device refuses the write; the size still applies for this session. */
export function writeTextSize(size: TextSize): boolean {
  try { window.localStorage.setItem(TEXT_SIZE_KEY, size); return true; } catch { return false; }
}

function applyTextSize(size: TextSize) { document.documentElement.dataset.textSize = size; }

/** Applies the saved size straight away at startup, before any component renders, to avoid a size flash. */
export function applyStoredTextSize() { applyTextSize(readTextSize().size); }

export function useTextSize() {
  const [state, setState] = useState(() => { const read = readTextSize(); return { size: read.size, notice: read.readable ? '' : TEXT_SIZE_NOTICE }; });
  useLayoutEffect(() => applyTextSize(state.size), [state.size]);
  function setSize(size: TextSize) {
    setState({ size, notice: writeTextSize(size) ? '' : TEXT_SIZE_NOTICE });
  }
  return { ...state, setSize };
}
