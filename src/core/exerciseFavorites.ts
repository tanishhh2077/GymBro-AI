export const FAVORITES_KEY = 'gymbro-ai:exercise-favorites';
const MAX_NAMES = 1000;
const MAX_LENGTH = 128_000;
const SESSION_NOTICE = 'Favorites apply for this session. Device settings storage is unavailable or invalid.';
interface FavoritesSnapshot { readonly names: readonly string[]; readonly notice: string }

function validName(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 80 && value.trim() === value;
}

export function createExerciseFavorites() {
  const listeners = new Set<() => void>();
  let persistent = true;
  function read(): string[] {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (raw === null) return [];
    if (raw.length > MAX_LENGTH) throw new Error('Favorites exceed the supported size.');
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 2 ||
      !('version' in value) || value.version !== 1 || !('names' in value) || !Array.isArray(value.names) ||
      value.names.length > MAX_NAMES || !value.names.every(validName) || new Set(value.names).size !== value.names.length) {
      throw new Error('Invalid favorites.');
    }
    return value.names;
  }
  let current: FavoritesSnapshot;
  try { current = { names: read(), notice: '' }; }
  catch { persistent = false; current = { names: [], notice: SESSION_NOTICE }; }
  function publish(names: readonly string[], notice: string) {
    current = { names, notice };
    listeners.forEach(listener => listener());
  }
  return {
    snapshot: () => current,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    toggle: (name: string) => {
      if (!validName(name)) throw new Error('Choose an exercise name from 1 to 80 characters.');
      const remove = current.names.includes(name);
      let names = [...current.names];
      if (persistent) {
        try { names = read(); }
        catch { persistent = false; }
      }
      names = names.filter(item => item !== name);
      if (!remove) names.push(name);
      const serialized = JSON.stringify({ version: 1, names });
      if (names.length > MAX_NAMES || serialized.length > MAX_LENGTH) {
        publish(current.names, 'Favorites are full (up to 1000 names). Remove a favorite before adding another.');
        return;
      }
      if (persistent) {
        try { window.localStorage.setItem(FAVORITES_KEY, serialized); }
        catch { persistent = false; }
      }
      publish(names, persistent ? '' : SESSION_NOTICE);
    },
  };
}

// One controller keeps multiple pickers and session-only choices consistent.
let deviceFavorites: ReturnType<typeof createExerciseFavorites> | undefined;
export function getExerciseFavorites() {
  return deviceFavorites ??= createExerciseFavorites();
}
