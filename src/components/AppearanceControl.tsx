import { useId } from 'react';
import { isAppearancePreference, type AppearanceSettings } from '@/store/useAppearance';
import { applyStoredTextSize, isTextSize, TEXT_SIZES, useTextSize } from './textSizePreference';

// Runs once when the app loads so a saved size is in place before the first paint.
applyStoredTextSize();

const selectClass = 'rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white';

export function AppearanceControl({ settings }: { settings: AppearanceSettings }) {
  const id = useId();
  const textSize = useTextSize();
  return <section aria-labelledby={`${id}-label`} className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0"><label id={`${id}-label`} htmlFor={id} className="text-sm font-semibold text-white">Appearance</label>
        <p id={`${id}-help`} className="mt-1 text-xs text-slate-400">Follow your device or choose a theme.</p></div>
      <select id={id} value={settings.preference} aria-describedby={`${id}-help`}
        className={selectClass}
        onChange={event => { if (isAppearancePreference(event.target.value)) settings.setPreference(event.target.value); }}>
        <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
      </select>
    </div>
    <p role="status" className="text-xs text-slate-500">Using the {settings.resolved} appearance.</p>
    {settings.notice && <p role="status" className="text-xs text-warn">{settings.notice}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0"><label htmlFor={`${id}-size`} className="text-sm font-semibold text-white">Text size</label>
        <p id={`${id}-size-help`} className="mt-1 text-xs text-slate-400">Make all text larger on this device.</p></div>
      <select id={`${id}-size`} value={textSize.size} aria-describedby={`${id}-size-help`} className={selectClass}
        onChange={event => { if (isTextSize(event.target.value)) textSize.setSize(event.target.value); }}>
        {TEXT_SIZES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
    {textSize.notice && <p role="status" className="text-xs text-warn">{textSize.notice}</p>}
  </section>;
}
