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
