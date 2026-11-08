import { useEffect, useRef, useState } from 'react';
import { DAY, WEEK, readReminder, saveReminder, type ReminderPreference } from '@/core/localUtilities';

export function BackupReminder({ blocked, onBackup, showSettings = true }: { blocked: boolean; onBackup: () => Promise<boolean>; showSettings?: boolean }) {
  const [preference, setPreference] = useState(readReminder);
  const [now, setNow] = useState(Date.now);
  const [pending, setPending] = useState(false);
  const running = useRef(false);
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    const refresh = () => setNow(Date.now());
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { alive.current = false; window.clearInterval(interval); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  function update(value: ReminderPreference) { setPreference(saveReminder(value, Boolean(preference.notice))); setNow(Date.now()); }
  const due = preference.value.enabled && preference.value.nextDue !== null && now >= preference.value.nextDue;
  if (!showSettings && !due) return null;
  return <section aria-label="Backup reminder" className="card space-y-3 p-4 sm:p-5">
    <h2 className="text-lg font-semibold text-white">Weekly backup reminder</h2>
    {showSettings && <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={preference.value.enabled} disabled={pending}
      onChange={event => update({ enabled: event.target.checked, nextDue: event.target.checked ? Date.now() + WEEK : null })} />Remind me to back up weekly</label>}
    <p className="text-sm text-slate-400">Optional, on this device only. Reminders appear here while using the app; no background notifications. First reminder is one week after enabling. Preferences are not included in backups.</p>
    {preference.notice && <p role="status" className="text-sm text-warn">{preference.notice}</p>}
    {due ? <div className="space-y-3"><p className="text-sm text-slate-300">Time to make a recovery copy. Exporting requests a file; check that you kept it.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={blocked || pending} onClick={async () => {
          if (running.current || blocked) return;
          running.current = true; setPending(true);
          try { const requested = await onBackup(); if (alive.current && requested) update({ enabled: true, nextDue: Date.now() + WEEK }); }
          finally { running.current = false; if (alive.current) setPending(false); }
        }}>Back up now</button>
        <button type="button" className="btn-ghost" disabled={pending} onClick={() => update({ enabled: true, nextDue: Date.now() + DAY })}>Snooze 1 day</button>
        <button type="button" className="btn-ghost" disabled={pending} onClick={() => update({ enabled: true, nextDue: Date.now() + WEEK })}>Dismiss for 1 week</button>
      </div></div> : preference.value.enabled && <p className="text-sm text-slate-400">Next reminder: {new Date(preference.value.nextDue!).toLocaleString()}</p>}
  </section>;
}
