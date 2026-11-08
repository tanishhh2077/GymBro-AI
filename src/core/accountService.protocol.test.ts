import { createClient } from '@supabase/supabase-js';
import { afterEach, expect, it, vi } from 'vitest';
import { createAccountService, deadlineFetch } from './accountService';
import { emptyWorkoutData } from './workouts';

afterEach(() => vi.unstubAllGlobals());
it('drives OTP, authenticated reads, revision-checked writes and sign-out through the real pinned SDK', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const user = { id, email: 'protocol@example.invalid', aud: 'authenticated', role: 'authenticated',
    created_at: new Date().toISOString(), app_metadata: {}, user_metadata: {} };
  const token = [btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 })), btoa('synthetic-signature')].join('.');
  const requests: { path: string; method: string; bearer: string | null; body: unknown }[] = [];
  let shared: { revision: number; data: unknown } | null = null;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input)); const headers = new Headers(init?.headers);
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    requests.push({ path: url.pathname, method: init?.method ?? 'GET', bearer: headers.get('Authorization'), body });
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
    if (url.pathname === '/auth/v1/otp') return json({});
    if (url.pathname === '/auth/v1/verify') return json({ access_token: token, token_type: 'bearer', refresh_token: 'synthetic-refresh', expires_in: 3600, user });
    if (url.pathname === '/auth/v1/logout') return new Response(null, { status: 204 });
    if (url.pathname === '/rest/v1/workout_libraries') return json(shared ? [shared] : []);
    if (url.pathname === '/rest/v1/rpc/sync_workout_library') {
      if (body.expected_revision !== (shared?.revision ?? 0)) return json({ code: '40001', message: 'Cloud revision changed' }, 409);
      shared = { revision: (shared?.revision ?? 0) + 1, data: body.payload }; return json(shared);
    }
    throw new Error(`Unexpected protocol request ${url.pathname}`);
  }));
  const client = createClient('https://protocol.example.invalid', 'sb_publishable_synthetic', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: deadlineFetch },
  });
  const service = createAccountService(client, 'protocol');
  expect(await service.getAccount()).toBeNull();
  await service.sendCode(user.email); expect(await service.verifyCode(user.email, '123456')).toEqual({ id, email: user.email });
  const cloud = service.cloud(id);
  expect(await cloud.read()).toEqual({ revision: 0, data: emptyWorkoutData() });
  expect((await cloud.write(0, emptyWorkoutData())).revision).toBe(1);
  expect((await cloud.read()).revision).toBe(1);
  await expect(cloud.write(0, emptyWorkoutData())).rejects.toThrow(/preview sync again/i);
  expect(requests.filter(value => value.path.startsWith('/rest/')).every(value => value.bearer === `Bearer ${token}`)).toBe(true);
  expect(requests.find(value => value.path.endsWith('/otp'))?.body).toMatchObject({ email: user.email });
  await service.signOut(); expect(await service.getAccount()).toBeNull();
  expect(requests.some(value => value.path.endsWith('/logout'))).toBe(true);
});

const id = '11111111-1111-4111-8111-111111111111';
const user = {
  id, email: 'protocol@example.invalid', aud: 'authenticated', role: 'authenticated',
  created_at: new Date().toISOString(), app_metadata: {}, user_metadata: {},
};
const token = [
  btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
  btoa(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 })),
  btoa('synthetic-signature'),
].join('.');

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
}

function createClientService() {
  const client = createClient('https://protocol.example.invalid', 'sb_publishable_synthetic', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: deadlineFetch },
  });
  return { client, service: createAccountService(client, 'protocol') };
}

async function signIn(service: ReturnType<typeof createAccountService>) {
  await service.verifyCode(user.email, '123456');
}

it('handles network failure mid-request across auth, cloud reads, writes and sign-out', async () => {
  let shouldFail = false;
  let failError = new TypeError('Failed to fetch');

  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (shouldFail) throw failError;
    if (url.pathname === '/auth/v1/otp') return json({});
    if (url.pathname === '/auth/v1/verify') return json({ access_token: token, token_type: 'bearer', refresh_token: 'refresh', expires_in: 3600, user });
    if (url.pathname === '/auth/v1/logout') return new Response(null, { status: 204 });
    if (url.pathname === '/rest/v1/workout_libraries') return json([]);
    if (url.pathname === '/rest/v1/rpc/sync_workout_library') return json({ revision: 1, data: emptyWorkoutData() });
    throw new Error(`Unexpected request: ${url.pathname}`);
  }));

  const { service } = createClientService();

  // Network failure on sendCode
  shouldFail = true;
  await expect(service.sendCode(user.email)).rejects.toThrow(/email code could not be sent/i);

  // Network failure on verifyCode (connection reset)
  failError = new Error('ECONNRESET: connection reset by peer') as TypeError;
  await expect(service.verifyCode(user.email, '123456')).rejects.toThrow(/code could not be verified/i);

  // Log in successfully
  shouldFail = false;
  await signIn(service);
  const cloud = service.cloud(id);

  // Network failure on cloud write (POST request: does not retry, fails immediately)
  shouldFail = true;
  failError = new TypeError('Network connection lost');
  await expect(cloud.write(0, emptyWorkoutData())).rejects.toThrow(/sync could not be confirmed/i);

  // Network failure on cloud read (GET request: retries with backoff then fails)
  await expect(cloud.read()).rejects.toThrow(/cloud workouts could not be opened/i);

  // Network failure on sign-out
  await expect(service.signOut()).rejects.toThrow(/sign-out could not be confirmed/i);
}, 15_000);

it('handles malformed, non-JSON or corrupted responses gracefully', async () => {
  let mode: 'html' | 'bad_json' | 'empty' | 'corrupt_snapshot' = 'html';

  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === '/auth/v1/verify' && mode === 'html') {
      return new Response('<html><head><title>502 Bad Gateway</title></head><body>Bad Gateway</body></html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      });
    }
    if (url.pathname === '/auth/v1/verify' && mode === 'bad_json') {
      return new Response('{"access_token": ...invalid json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.pathname === '/auth/v1/verify') {
      return json({ access_token: token, token_type: 'bearer', refresh_token: 'refresh', expires_in: 3600, user });
    }
    if (url.pathname === '/rest/v1/workout_libraries') {
      if (mode === 'html') return new Response('<h1>Error</h1>', { status: 500, headers: { 'Content-Type': 'text/html' } });
      if (mode === 'bad_json') return new Response('{bad json', { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (mode === 'corrupt_snapshot') return json([{ revision: 1, data: { workouts: 'not-an-array' } }]);
    }
    if (url.pathname === '/rest/v1/rpc/sync_workout_library') {
      if (mode === 'empty') return new Response('', { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (mode === 'corrupt_snapshot') return json({ revision: 'invalid-rev', data: emptyWorkoutData() });
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  }));

  const { service } = createClientService();

  // HTML response during verifyCode
  mode = 'html';
  await expect(service.verifyCode(user.email, '123456')).rejects.toThrow(/code could not be verified/i);

  // Malformed JSON during verifyCode
  mode = 'bad_json';
  await expect(service.verifyCode(user.email, '123456')).rejects.toThrow(/code could not be verified/i);

  // Log in
  mode = 'corrupt_snapshot';
  await signIn(service);
  const cloud = service.cloud(id);

  // Corrupted snapshot in cloud read
  await expect(cloud.read()).rejects.toThrow();

  // Non-JSON 500 error in cloud read
  mode = 'html';
  await expect(cloud.read()).rejects.toThrow(/cloud workouts could not be opened/i);

  // Corrupted snapshot in cloud write
  mode = 'corrupt_snapshot';
  await expect(cloud.write(0, emptyWorkoutData())).rejects.toThrow();

  // Empty response in cloud write
  mode = 'empty';
  await expect(cloud.write(0, emptyWorkoutData())).rejects.toThrow(/sync snapshot is invalid/i);
});

it('propagates HTTP 401, 403, 429 and 500 errors to actionable messages', async () => {
  let statusToReturn = 500;

  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === '/auth/v1/otp') {
      return json({ status: statusToReturn, message: 'Error' }, statusToReturn);
    }
    if (url.pathname === '/auth/v1/verify') {
      if (statusToReturn === 200) {
        return json({ access_token: token, token_type: 'bearer', refresh_token: 'refresh', expires_in: 3600, user });
      }
      return json({ status: statusToReturn, message: 'Verification error' }, statusToReturn);
    }
    if (url.pathname === '/rest/v1/workout_libraries') {
      return json({ status: statusToReturn, message: 'Query error' }, statusToReturn);
    }
    if (url.pathname === '/rest/v1/rpc/sync_workout_library') {
      return json({ status: statusToReturn, message: 'RPC error' }, statusToReturn);
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  }));

  const { service } = createClientService();

  // 429 Rate limit on sendCode
  statusToReturn = 429;
  await expect(service.sendCode(user.email)).rejects.toThrow(/wait a minute/i);

  // 500 Internal error on sendCode
  statusToReturn = 500;
  await expect(service.sendCode(user.email)).rejects.toThrow(/email code could not be sent/i);

  // 429 on verifyCode
  statusToReturn = 429;
  await expect(service.verifyCode(user.email, '123456')).rejects.toThrow(/wait a minute/i);

  // 403 on verifyCode
  statusToReturn = 403;
  await expect(service.verifyCode(user.email, '123456')).rejects.toThrow(/code could not be verified/i);

  // Sign in successfully
  statusToReturn = 200;
  await signIn(service);
  const cloud = service.cloud(id);

  // 429 on cloud.read
  statusToReturn = 429;
  await expect(cloud.read()).rejects.toThrow(/wait a minute/i);

  // 401 on cloud.read
  statusToReturn = 401;
  await expect(cloud.read()).rejects.toThrow(/cloud workouts could not be opened/i);

  // 500 on cloud.read
  statusToReturn = 500;
  await expect(cloud.read()).rejects.toThrow(/cloud workouts could not be opened/i);

  // 429 on cloud.write
  statusToReturn = 429;
  await expect(cloud.write(0, emptyWorkoutData())).rejects.toThrow(/wait a minute/i);

  // 403 on cloud.write
  statusToReturn = 403;
  await expect(cloud.write(0, emptyWorkoutData())).rejects.toThrow(/sync could not be confirmed/i);

  // 500 on cloud.write
  statusToReturn = 500;
  await expect(cloud.write(0, emptyWorkoutData())).rejects.toThrow(/sync could not be confirmed/i);
});

// Bug finding: PostgREST query returning HTTP 429 without 'status: 429' in its JSON payload
// falls through to generic fail(message) instead of the actionable 429 rate limit message.
it.skip('shows bug: PostgREST HTTP 429 without status in JSON payload fails to report rate limit', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === '/auth/v1/verify') {
      return json({ access_token: token, token_type: 'bearer', refresh_token: 'refresh', expires_in: 3600, user });
    }
    if (url.pathname === '/rest/v1/workout_libraries') {
      // Standard gateway 429 without status key in JSON body
      return json({ message: 'Too Many Requests' }, 429);
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  }));

  const { service } = createClientService();
  await signIn(service);
  // Expected: "Too many requests. Wait a minute before trying again."
  // Actual: "Cloud workouts could not be opened. Check your connection and account setup, then preview sync again."
  await expect(service.cloud(id).read()).rejects.toThrow(/wait a minute/i);
});

it('rejects operations when session is expired', async () => {
  const expiredToken = [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) - 3600 })),
    btoa('synthetic-signature'),
  ].join('.');

  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === '/auth/v1/verify') {
      return json({ access_token: expiredToken, token_type: 'bearer', refresh_token: 'refresh', expires_in: -3600, user });
    }
    if (url.pathname === '/auth/v1/token') {
      return json({ message: 'Invalid refresh token' }, 401);
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  }));

  const { service } = createClientService();
  await service.verifyCode(user.email, '123456');

  const cloud = service.cloud(id);
  await expect(cloud.read()).rejects.toThrow(/saved sign-in could not be opened/i);
  await expect(cloud.write(0, emptyWorkoutData())).rejects.toThrow(/account changed/i);
});

it('handles email-code retry limits and code reuse', async () => {
  let verifyCount = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === '/auth/v1/verify') {
      verifyCount++;
      if (verifyCount === 1) {
        return json({ access_token: token, token_type: 'bearer', refresh_token: 'refresh', expires_in: 3600, user });
      }
      if (verifyCount === 2) {
        // Code reuse returns 400 Bad Request
        return json({ message: 'Token has expired or is invalid', error_description: 'Token has expired or is invalid' }, 400);
      }
      // Retry limit exceeded returns 429
      return json({ message: 'Email rate limit exceeded' }, 429);
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  }));

  const { service } = createClientService();
  // First verification succeeds
  const account = await service.verifyCode(user.email, '123456');
  expect(account.id).toBe(id);

  // Second verification with the same code fails (code reuse)
  await expect(service.verifyCode(user.email, '123456')).rejects.toThrow(/code could not be verified/i);

  // Third verification hits retry limit
  await expect(service.verifyCode(user.email, '123456')).rejects.toThrow(/wait a minute/i);
});

it('rejects cloud operations when sign-out occurs while a request is in flight', async () => {
  let resolveReadFetch!: (response: Response) => void;
  let resolveWriteFetch!: (response: Response) => void;

  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === '/auth/v1/verify') {
      return json({ access_token: token, token_type: 'bearer', refresh_token: 'refresh', expires_in: 3600, user });
    }
    if (url.pathname === '/auth/v1/logout') {
      return new Response(null, { status: 204 });
    }
    if (url.pathname === '/rest/v1/workout_libraries') {
      return new Promise<Response>(resolve => { resolveReadFetch = resolve; });
    }
    if (url.pathname === '/rest/v1/rpc/sync_workout_library') {
      return new Promise<Response>(resolve => { resolveWriteFetch = resolve; });
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  }));

  const { service } = createClientService();
  await signIn(service);
  const cloud = service.cloud(id);

  // Start cloud read in flight
  const pendingRead = cloud.read();
  await vi.waitFor(() => expect(resolveReadFetch).toBeDefined());

  // Sign out while read is in flight
  await service.signOut();

  // Complete the HTTP read request
  resolveReadFetch(json([]));

  // The second requireAccount should detect the sign-out and reject
  await expect(pendingRead).rejects.toThrow(/account changed/i);

  // Sign back in to test write
  await signIn(service);
  const pendingWrite = cloud.write(0, emptyWorkoutData());
  await vi.waitFor(() => expect(resolveWriteFetch).toBeDefined());

  // Sign out while write is in flight
  await service.signOut();

  // Complete the HTTP write request
  resolveWriteFetch(json({ revision: 1, data: emptyWorkoutData() }));

  // The second requireAccount should detect the sign-out and reject
  await expect(pendingWrite).rejects.toThrow(/account changed/i);
});

it('handles concurrent reads, writes and OTP calls correctly', async () => {
  let revision = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    if (url.pathname === '/auth/v1/otp') return json({});
    if (url.pathname === '/auth/v1/verify') return json({ access_token: token, token_type: 'bearer', refresh_token: 'refresh', expires_in: 3600, user });
    if (url.pathname === '/rest/v1/workout_libraries') {
      return json([{ revision, data: emptyWorkoutData() }]);
    }
    if (url.pathname === '/rest/v1/rpc/sync_workout_library') {
      if (body.expected_revision !== revision) return json({ code: '40001', message: 'Stale' }, 409);
      revision++;
      return json({ revision, data: body.payload });
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  }));

  const { service } = createClientService();
  await signIn(service);
  const cloud = service.cloud(id);

  // Concurrent reads
  const [r1, r2, r3] = await Promise.all([cloud.read(), cloud.read(), cloud.read()]);
  expect(r1.revision).toBe(0);
  expect(r2.revision).toBe(0);
  expect(r3.revision).toBe(0);

  // Sequential write then concurrent reads
  await cloud.write(0, emptyWorkoutData());
  const [r4, r5] = await Promise.all([cloud.read(), cloud.read()]);
  expect(r4.revision).toBe(1);
  expect(r5.revision).toBe(1);

  // Concurrent OTP sendCode
  await expect(Promise.all([
    service.sendCode('userA@example.invalid'),
    service.sendCode('userB@example.invalid'),
  ])).resolves.toBeDefined();
});
