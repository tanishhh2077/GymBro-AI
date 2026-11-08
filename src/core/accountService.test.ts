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
it('retains caller cancellation in the request deadline signal', async () => {
  let signal: AbortSignal | undefined;
  vi.stubGlobal('fetch', vi.fn((_input, options: RequestInit) => {
    signal = options.signal!;
    return new Promise((_resolve, reject) => signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
  }));
  const abort = new AbortController(); const pending = deadlineFetch('https://example.invalid', { signal: abort.signal });
  expect(signal).toBeDefined(); abort.abort(); await expect(pending).rejects.toThrow();
});
it('aborts a stalled request at the configured 20-second deadline', async () => {
  const timeout = AbortSignal.timeout.bind(AbortSignal);
  vi.spyOn(AbortSignal, 'timeout').mockImplementation(ms => { expect(ms).toBe(20_000); return timeout(5); });
  vi.stubGlobal('fetch', vi.fn((_input, options: RequestInit) => new Promise((_resolve, reject) => {
    options.signal!.addEventListener('abort', () => reject(new DOMException('timeout', 'TimeoutError')));
  })));
  await expect(deadlineFetch('https://example.invalid')).rejects.toThrow('timeout');
});
it('reports network and server errors on getAccount and signOut', async () => {
  const { service, auth } = setup();
  auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: { status: 500 } } as never);
  await expect(service.getAccount()).rejects.toThrow(/saved sign-in could not be opened/i);
  auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: { status: 429 } } as never);
  await expect(service.getAccount()).rejects.toThrow(/wait a minute/i);
  auth.getSession.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await expect(service.getAccount()).rejects.toThrow(/Failed to fetch/);

  auth.signOut.mockResolvedValueOnce({ error: { status: 429 } });
  await expect(service.signOut()).rejects.toThrow(/wait a minute/i);
  auth.signOut.mockResolvedValueOnce({ error: { status: 500 } });
  await expect(service.signOut()).rejects.toThrow(/sign-out could not be confirmed/i);
  auth.signOut.mockRejectedValueOnce(new Error('ECONNRESET'));
  await expect(service.signOut()).rejects.toThrow(/ECONNRESET/);
});
it('handles HTTP 401, 403, 429, 500 and network rejections on cloud operations', async () => {
  const { service, query, write } = setup();
  const cloud = service.cloud(id);

  query.setHeader.mockResolvedValueOnce({ data: null, error: { status: 429 } });
  await expect(cloud.read()).rejects.toThrow(/wait a minute/i);
  query.setHeader.mockResolvedValueOnce({ data: null, error: { status: 401 } });
  await expect(cloud.read()).rejects.toThrow(/cloud workouts could not be opened/i);
  query.setHeader.mockResolvedValueOnce({ data: null, error: { status: 500 } });
  await expect(cloud.read()).rejects.toThrow(/cloud workouts could not be opened/i);
  query.setHeader.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await expect(cloud.read()).rejects.toThrow(/Failed to fetch/);

  write.setHeader.mockResolvedValueOnce({ data: null, error: { status: 429 } });
  await expect(cloud.write(0, emptyWorkoutData())).rejects.toThrow(/wait a minute/i);
  write.setHeader.mockResolvedValueOnce({ data: null, error: { status: 403 } });
  await expect(cloud.write(0, emptyWorkoutData())).rejects.toThrow(/sync could not be confirmed/i);
  write.setHeader.mockResolvedValueOnce({ data: null, error: { status: 500 } });
  await expect(cloud.write(0, emptyWorkoutData())).rejects.toThrow(/sync could not be confirmed/i);
  write.setHeader.mockRejectedValueOnce(new Error('ECONNRESET'));
  await expect(cloud.write(0, emptyWorkoutData())).rejects.toThrow(/ECONNRESET/);
});
it('enforces session integrity and rejects expired or corrupted sessions', async () => {
  const { service, auth } = setup();
  const cloud = service.cloud(id);

  auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
  await expect(cloud.read()).rejects.toThrow(/account changed/i);

  auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
  await expect(cloud.write(0, emptyWorkoutData())).rejects.toThrow(/account changed/i);

  auth.getSession.mockResolvedValueOnce({ data: { session: { user: { id, email: 'test@example.invalid' }, access_token: '' } }, error: null } as never);
  await expect(cloud.read()).rejects.toThrow(/account changed/i);

  auth.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'not-a-uuid', email: 'test@example.invalid' }, access_token: 'token' } }, error: null } as never);
  await expect(cloud.read()).rejects.toThrow(/account session could not be opened/i);

  auth.getSession.mockResolvedValueOnce({ data: { session: { user: { id, email: '' }, access_token: 'token' } }, error: null } as never);
  await expect(cloud.read()).rejects.toThrow(/account session could not be opened/i);
});
it('rejects sign-out or session invalidation while a cloud read or write is in flight', async () => {
  const { service, auth, query, write } = setup();
  const cloud = service.cloud(id);

  let finishQuery!: (value: unknown) => void;
  query.setHeader.mockImplementationOnce(() => new Promise(resolve => { finishQuery = resolve; }));
  const pendingRead = cloud.read();
  await vi.waitFor(() => expect(query.setHeader).toHaveBeenCalled());
  auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
  finishQuery({ data: { revision: 1, data: emptyWorkoutData() }, error: null });
  await expect(pendingRead).rejects.toThrow(/account changed/i);

  let finishWrite!: (value: unknown) => void;
  write.setHeader.mockImplementationOnce(() => new Promise(resolve => { finishWrite = resolve; }));
  const pendingWrite = cloud.write(0, emptyWorkoutData());
  await vi.waitFor(() => expect(write.setHeader).toHaveBeenCalled());
  auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
  finishWrite({ data: { revision: 1, data: emptyWorkoutData() }, error: null });
  await expect(pendingWrite).rejects.toThrow(/account changed/i);
});
it('rejects malformed server payloads and OTP verification responses', async () => {
  const { service, auth, query, write } = setup();
  const cloud = service.cloud(id);

  auth.verifyOtp.mockResolvedValueOnce({ data: { user: null }, error: null } as never);
  await expect(service.verifyCode('test@example.invalid', '123456')).rejects.toThrow(/did not create a session/i);

  auth.verifyOtp.mockResolvedValueOnce({ data: { user: { id: 'bad-uuid', email: 'test@example.invalid' } }, error: null } as never);
  await expect(service.verifyCode('test@example.invalid', '123456')).rejects.toThrow(/could not be opened/i);

  auth.verifyOtp.mockResolvedValueOnce({ data: { user: { id, email: 'invalid-email' } }, error: null } as never);
  await expect(service.verifyCode('test@example.invalid', '123456')).rejects.toThrow(/valid email address/i);

  query.setHeader.mockResolvedValueOnce({ data: { revision: -1, data: emptyWorkoutData() }, error: null });
  await expect(cloud.read()).rejects.toThrow(/revision/i);

  query.setHeader.mockResolvedValueOnce({ data: { revision: 1, data: null }, error: null });
  await expect(cloud.read()).rejects.toThrow();

  write.setHeader.mockResolvedValueOnce({ data: { revision: 'not-a-number' }, error: null });
  await expect(cloud.write(0, emptyWorkoutData())).rejects.toThrow();

  await expect(cloud.write(NaN, emptyWorkoutData())).rejects.toThrow(/revision is invalid/i);
  await expect(cloud.write(-1, emptyWorkoutData())).rejects.toThrow(/revision is invalid/i);
  await expect(cloud.write(Number.MAX_SAFE_INTEGER, emptyWorkoutData())).rejects.toThrow(/revision is invalid/i);
});
it('coordinates concurrent reads, writes and OTP requests without interference', async () => {
  const { service } = setup();
  const cloud = service.cloud(id);

  const [read1, read2, read3] = await Promise.all([cloud.read(), cloud.read(), cloud.read()]);
  expect(read1).toEqual({ revision: 0, data: emptyWorkoutData() });
  expect(read2).toEqual({ revision: 0, data: emptyWorkoutData() });
  expect(read3).toEqual({ revision: 0, data: emptyWorkoutData() });

  const [readResult, writeResult] = await Promise.all([cloud.read(), cloud.write(0, emptyWorkoutData())]);
  expect(readResult.revision).toBe(0);
  expect(writeResult.revision).toBe(1);

  await expect(Promise.all([
    service.sendCode('user1@example.invalid'),
    service.sendCode('user2@example.invalid'),
  ])).resolves.toBeDefined();
});
it('attaches timeout and preserves Request signal or propagates network failure in deadlineFetch', async () => {
  let capturedSignal: AbortSignal | undefined;
  vi.stubGlobal('fetch', vi.fn((_input, options: RequestInit) => {
    capturedSignal = options.signal!;
    return new Promise((_resolve, reject) => capturedSignal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
  }));
  const abort = new AbortController();
  const request = new Request('https://example.invalid', { signal: abort.signal });
  const pending = deadlineFetch(request);
  expect(capturedSignal).toBeDefined();
  abort.abort();
  await expect(pending).rejects.toThrow();

  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));
  await expect(deadlineFetch('https://example.invalid')).rejects.toThrow('Failed to fetch');
});
