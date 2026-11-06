import { useId } from 'react';
import { isAppearancePreference, type AppearanceSettings } from '@/store/useAppearance';

export function AppearanceControl({ settings }: { settings: AppearanceSettings }) {
  const id = useId();
  return <section aria-labelledby={`${id}-label`} className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><label id={`${id}-label`} htmlFor={id} className="text-sm font-semibold text-white">Appearance</label>
        <p id={`${id}-help`} className="mt-1 text-xs text-slate-400">Follow your device or choose a theme.</p></div>
      <select id={id} value={settings.preference} aria-describedby={`${id}-help`}
        className="rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-base text-white"
        onChange={event => { if (isAppearancePreference(event.target.value)) settings.setPreference(event.target.value); }}>
        <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
      </select>
    </div>
    <p role="status" className="text-xs text-slate-500">Using the {settings.resolved} appearance.</p>
    {settings.notice && <p role="status" className="text-xs text-warn">{settings.notice}</p>}
  </section>;
}
