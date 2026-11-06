import { afterEach, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { accountConfiguration, createAccountService, deadlineFetch } from './accountService';
import { emptyWorkoutData } from './workouts';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const id = '11111111-1111-4111-8111-111111111111';
function setup() {
  let account: { id: string; email: string } | null = { id, email: 'test@example.invalid' };
  let listener!: (_event: string, session: unknown) => void;
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), setHeader: vi.fn().mockResolvedValue({ data: null, error: null }) };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.maybeSingle.mockReturnValue(query);
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: account ? { user: account, access_token: `token-${account.id}` } : null }, error: null })),
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    verifyOtp: vi.fn(async () => ({ data: { user: account }, error: null })),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn(callback => { listener = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; }),
  };
  const write = { setHeader: vi.fn().mockResolvedValue({ data: { revision: 1, data: emptyWorkoutData() }, error: null }) };
  const client = { auth, from: vi.fn(() => query), rpc: vi.fn(() => write) };
  return { auth, client, query, write, service: createAccountService(client as unknown as SupabaseClient, 'test'),
    changeAccount: () => { account = { id: '22222222-2222-4222-8222-222222222222', email: 'other@example.invalid' }; },
    emit: () => listener('SIGNED_OUT', null) };
}
it('keeps missing configuration optional and rejects secret keys and insecure remote URLs', () => {
  expect(accountConfiguration({})).toBeNull();
  expect(() => accountConfiguration({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_private' })).toThrow(/publishable/i);
  expect(() => accountConfiguration({ VITE_SUPABASE_URL: 'http://example.com', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' })).toThrow(/https/i);
  expect(accountConfiguration({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' })?.url).toBe('http://127.0.0.1:54321');
});
it('requests email codes and verifies numeric codes without a redirect flow', async () => {
  const { service, auth } = setup();
  await service.sendCode(' test@example.invalid ');
  expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: 'test@example.invalid', options: { shouldCreateUser: true } });
  expect(await service.verifyCode('test@example.invalid', '123456')).toMatchObject({ id });
  expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'test@example.invalid', token: '123456', type: 'email' });
});
it('rejects invalid emails and codes before any request', async () => {
  const { service, auth } = setup();
  await expect(service.sendCode('bad')).rejects.toThrow(/email/i);
  await expect(service.verifyCode('test@example.invalid', 'abc')).rejects.toThrow(/code/i);
  expect(auth.signInWithOtp).not.toHaveBeenCalled(); expect(auth.verifyOtp).not.toHaveBeenCalled();
});
it('reports auth and rate-limit failures as actionable errors', async () => {
  const { service, auth } = setup();
  auth.signInWithOtp.mockResolvedValueOnce({ error: { status: 429 } });
  await expect(service.sendCode('test@example.invalid')).rejects.toThrow(/wait/i);
  auth.verifyOtp.mockResolvedValueOnce({ data: { user: null }, error: { status: 403 } } as never);
  await expect(service.verifyCode('test@example.invalid', '123456')).rejects.toThrow(/code/i);
});
it('loads an empty cloud library and writes a validated revision-checked snapshot', async () => {
  const { service, client, query } = setup(); const cloud = service.cloud(id);
  expect(await cloud.read()).toEqual({ revision: 0, data: emptyWorkoutData() });
  expect(query.eq).toHaveBeenCalledWith('user_id', id);
  await cloud.write(0, emptyWorkoutData());
  expect(client.rpc).toHaveBeenCalledWith('sync_workout_library', { expected_revision: 0, payload: emptyWorkoutData() });
});
it('rejects another account identity and injected media before remote writes', async () => {
  const { service, client, changeAccount } = setup(); const cloud = service.cloud(id); changeAccount();
  await expect(cloud.read()).rejects.toThrow(/account changed/i);
  await expect(cloud.write(0, emptyWorkoutData())).rejects.toThrow(/account changed/i);
  expect(client.rpc).not.toHaveBeenCalled();
  await expect(service.cloud('22222222-2222-4222-8222-222222222222').write(0, { ...emptyWorkoutData(), video: 'private' } as never)).rejects.toThrow();
  expect(client.rpc).not.toHaveBeenCalled();
});
it('reports stale server revisions and rejects malformed server responses', async () => {
  const { service, write, query } = setup();
  write.setHeader.mockResolvedValueOnce({ data: null, error: { code: '40001' } });
  await expect(service.cloud(id).write(0, emptyWorkoutData())).rejects.toThrow(/preview sync again/i);
  query.setHeader.mockResolvedValueOnce({ data: { revision: 1, data: { version: 99 } }, error: null });
  await expect(service.cloud(id).read()).rejects.toThrow();
});
it('pins each database request to the checked identity token during account changes', async () => {
  const { service, write, query } = setup();
  await service.cloud(id).read(); await service.cloud(id).write(0, emptyWorkoutData());
  expect(query.setHeader).toHaveBeenCalledWith('Authorization', `Bearer token-${id}`);
  expect(write.setHeader).toHaveBeenCalledWith('Authorization', `Bearer token-${id}`);
});
it('subscribes to account changes and releases the auth listener', () => {
  const { service, auth, emit } = setup(); const receive = vi.fn(); const release = service.subscribe(receive);
  emit(); expect(receive).toHaveBeenCalledWith(null); release();
  expect(auth.onAuthStateChange.mock.results[0].value.data.subscription.unsubscribe).toHaveBeenCalledOnce();
});
it('aborts a stalled request after its deadline and retains caller cancellation', async () => {
  let signal: AbortSignal | undefined;
  vi.stubGlobal('fetch', vi.fn((_input, options: RequestInit) => {
    signal = options.signal!;
    return new Promise((_resolve, reject) => signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
  }));
  const abort = new AbortController(); const pending = deadlineFetch('https://example.invalid', { signal: abort.signal });
  expect(signal).toBeDefined(); abort.abort(); await expect(pending).rejects.toThrow();
});
