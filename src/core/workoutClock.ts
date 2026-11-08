const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function span(startedAt: number, now: number | null): number | null {
  if (now === null || !Number.isFinite(startedAt) || !Number.isFinite(now) || now < startedAt) return null;
  return now - startedAt;
}

/** Running clock such as "12:05" or "1:02:05"; null when the clock reads earlier than the start or is invalid. */
export function formatElapsedClock(startedAt: number, now: number): string | null {
  const ms = span(startedAt, now);
  if (ms === null) return null;
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600); const minutes = Math.floor(total % 3600 / 60); const seconds = total % 60;
  const two = (value: number) => String(value).padStart(2, '0');
  return hours ? `${hours}:${two(minutes)}:${two(seconds)}` : `${minutes}:${two(seconds)}`;
}

/** "Duration 52 min" for a finished workout; null rather than a wrong number when times are unusable. */
export function formatDurationLine(startedAt: number, finishedAt: number | null): string | null {
  const ms = span(startedAt, finishedAt);
  if (ms === null) return null;
  if (ms < MINUTE) return 'Duration under 1 min';
  const hours = Math.floor(ms / HOUR); const minutes = Math.floor(ms % HOUR / MINUTE);
  return hours ? `Duration ${hours} h ${minutes} min` : `Duration ${minutes} min`;
}
