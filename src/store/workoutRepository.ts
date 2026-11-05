import { emptyWorkoutData, validateWorkoutData, WorkoutError } from '@/core/workouts';
import type { WorkoutData } from '@/types/workout';
export interface WorkoutRepository {
  load: () => Promise<WorkoutData>;
  save: (expectedRevision: number, next: unknown) => Promise<WorkoutData>;
}
export function createWorkoutRepository(factory?: IDBFactory): WorkoutRepository {
  function operation(expectedRevision?: number, next?: unknown): Promise<WorkoutData> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let database: IDBDatabase | undefined;
      let transaction: IDBTransaction | null = null;
      let result: WorkoutData = emptyWorkoutData();
      const fail = (error?: unknown) => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        try { transaction?.abort(); } catch { /* It may already have completed. */ }
        database?.close();
        reject(error instanceof WorkoutError ? error : new WorkoutError('storage',
          'The save or read could not be confirmed. Reload saved workouts before trying again.'));
      };
      const timer = setTimeout(() => fail(), 10_000);
      try {
        if (!factory) throw new WorkoutError('storage', 'Workout storage is unavailable on this device. Try reloading.');
        let candidate: WorkoutData | undefined;
        if (expectedRevision !== undefined) {
          const valid = validateWorkoutData(next);
          if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 ||
              expectedRevision === Number.MAX_SAFE_INTEGER || valid.revision !== expectedRevision) {
            throw new WorkoutError('validation', 'The workout revision is invalid.');
          }
          // Capture a plain-data snapshot before asynchronous open/transaction events.
          candidate = validateWorkoutData({ ...JSON.parse(JSON.stringify(valid)) as WorkoutData, revision: expectedRevision + 1 });
        }
        const request = factory.open('gymbro-workouts', 1);
        request.onblocked = () => fail();
        request.onerror = () => fail();
        request.onupgradeneeded = () => {
          database = request.result; transaction = request.transaction;
          if (settled) { transaction?.abort(); database.close(); return; }
          if (!database.objectStoreNames.contains('library')) database.createObjectStore('library');
        };
        request.onsuccess = () => {
          if (settled) { request.result.close(); return; }
          database = request.result;
          database.onversionchange = () => fail();
          try {
            transaction = database.transaction('library', candidate ? 'readwrite' : 'readonly');
            transaction.onabort = () => fail();
            transaction.oncomplete = () => {
              if (settled) return;
              settled = true; clearTimeout(timer); database?.close(); resolve(result);
            };
            const store = transaction.objectStore('library');
            const read = store.get('current');
            read.onerror = () => fail();
            read.onsuccess = () => {
              if (settled) return;
              try {
                let current: WorkoutData;
                try { current = read.result === undefined ? emptyWorkoutData() : validateWorkoutData(read.result); }
                catch { throw new WorkoutError('storage', 'Saved workout data could not be opened. Reload saved workouts; existing data has not been replaced.'); }
                if (candidate) {
                  if (current.revision !== expectedRevision) throw new WorkoutError('conflict',
                    'Saved workouts changed in another tab. Reload saved workouts before editing.');
                  result = candidate;
                  const write = store.put(candidate, 'current');
                  write.onerror = () => fail();
                } else result = current;
              } catch (error) { fail(error); }
            };
          } catch (error) { fail(error); }
        };
      } catch (error) { fail(error); }
    });
  }
  return { load: () => operation(), save: (revision, next) =>
    Number.isSafeInteger(revision) && revision >= 0 ? operation(revision, next) :
      Promise.reject(new WorkoutError('validation', 'The workout revision is invalid.')) };
}
