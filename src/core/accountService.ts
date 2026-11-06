import type { SupabaseClient, User } from '@supabase/supabase-js';
import { emptyWorkoutData, WorkoutError } from './workouts';
import { syncSnapshot, validateSharedSnapshot, type WorkoutCloud } from './workoutSync';

export interface Account { readonly id: string; readonly email: string }
export interface AccountConfiguration { readonly url: string; readonly key: string }
export interface AccountService {
  readonly namespace: string;
  getAccount: () => Promise<Account | null>;
  subscribe: (receive: (account: Account | null) => void) => () => void;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, token: string) => Promise<Account>;
  signOut: () => Promise<void>;
  cloud: (accountId: string) => WorkoutCloud;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function fail(message: string): never { throw new WorkoutError('validation', message); }
function email(value: string): string {
  const clean = value.trim();
  if (clean.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) fail('Enter a valid email address.');
  return clean;
}
function account(user: Pick<User, 'id' | 'email'> | null | undefined): Account | null {
  if (!user) return null;
  if (!uuid.test(user.id) || !user.email) fail('The account session could not be opened. Sign in again.');
  return { id: user.id, email: email(user.email) };
}
function check(error: unknown, message: string): void {
  if (!error) return;
  const value = error as { status?: number; code?: string };
  if (value.status === 429) fail('Too many requests. Wait a minute before trying again.');
  if (value.code === '40001') fail('Cloud workouts changed after the preview. Preview sync again.');
  fail(message);
}
export function accountConfiguration(env: Readonly<Record<string, unknown>>): AccountConfiguration | null {
  const url = env.VITE_SUPABASE_URL; const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url && !key) return null;
  if (typeof url !== 'string' || typeof key !== 'string') fail('Account setup needs a Supabase URL and publishable key.');
  let parsed: URL;
  try { parsed = new URL(url); } catch { return fail('Account setup needs a valid Supabase URL.'); }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') fail('Use the Supabase project origin as its URL.');
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname))) {
    fail('Use HTTPS for the Supabase service. Localhost HTTP is available for local development.');
  }
  let publicKey = key.startsWith('sb_publishable_');
  if (!publicKey) {
    try { publicKey = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon'; }
    catch { /* An unsupported key is rejected below. */ }
  }
  if (!publicKey) fail('Use a Supabase publishable or legacy anon key. Keep secret and service-role keys on the server.');
  return { url: parsed.origin, key };
}

/** The signal stays attached while the SDK consumes the response body. */
export const deadlineFetch: typeof fetch = (input, init) => {
  const existing = init?.signal ?? (input instanceof Request ? input.signal : null);
  const deadline = AbortSignal.timeout(20_000);
  return fetch(input, { ...init, signal: existing ? AbortSignal.any([existing, deadline]) : deadline });
};
export async function openAccountService(config: AccountConfiguration): Promise<AccountService> {
  const { createClient } = await import('@supabase/supabase-js');
  return createAccountService(createClient(config.url, config.key, {
    auth: { persistSession: true, detectSessionInUrl: false },
    global: { fetch: deadlineFetch },
  }), new URL(config.url).host);
}
export function createAccountService(client: SupabaseClient, namespace: string): AccountService {
  async function getAccount(): Promise<Account | null> {
    const { data, error } = await client.auth.getSession();
    check(error, 'The saved sign-in could not be opened. Check your connection and try again.');
    return account(data.session?.user);
  }
  async function requireAccount(id: string) {
    const { data, error } = await client.auth.getSession();
    check(error, 'The saved sign-in could not be opened. Sign in again.');
    if (!uuid.test(id) || account(data.session?.user)?.id !== id || !data.session?.access_token) fail('The account changed. Reopen Account and sync before trying again.');
    return data.session.access_token;
  }
  return {
    namespace, getAccount,
    subscribe: receive => {
      const { data } = client.auth.onAuthStateChange((_event, session) => receive(account(session?.user)));
      return () => data.subscription.unsubscribe();
    },
    sendCode: async value => {
      const { error } = await client.auth.signInWithOtp({ email: email(value), options: { shouldCreateUser: true } });
      check(error, 'The email code could not be sent. Check your connection and try again.');
    },
    verifyCode: async (value, token) => {
      const cleanEmail = email(value);
      if (!/^\d{6,10}$/.test(token.trim())) fail('Enter the 6–10 digit code from your email.');
      const { data, error } = await client.auth.verifyOtp({ email: cleanEmail, token: token.trim(), type: 'email' });
      check(error, 'The code could not be verified. Check the code or request a new one.');
      return account(data.user) ?? fail('The email code did not create a session. Request a new code.');
    },
    signOut: async () => {
      const { error } = await client.auth.signOut({ scope: 'local' });
      check(error, 'Sign-out could not be confirmed. Check your connection and try again.');
    },
    cloud: id => ({
      read: async () => {
        const token = await requireAccount(id);
        const { data, error } = await client.from('workout_libraries').select('revision,data').eq('user_id', id).maybeSingle()
          .setHeader('Authorization', `Bearer ${token}`);
        check(error, 'Cloud workouts could not be opened. Check your connection and account setup, then preview sync again.');
        await requireAccount(id);
        return data ? validateSharedSnapshot(data) : { revision: 0, data: emptyWorkoutData() };
      },
      write: async (expectedRevision, value) => {
        const payload = syncSnapshot(value);
        if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision === Number.MAX_SAFE_INTEGER) fail('The cloud revision is invalid.');
        const token = await requireAccount(id);
        const { data, error } = await client.rpc('sync_workout_library', { expected_revision: expectedRevision, payload })
          .setHeader('Authorization', `Bearer ${token}`);
        check(error, 'Sync could not be confirmed. Check your connection, then preview sync again.');
        await requireAccount(id);
        return validateSharedSnapshot(data);
      },
    }),
  };
}
