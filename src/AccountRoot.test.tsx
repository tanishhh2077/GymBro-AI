import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Account, AccountService } from '@/core/accountService';
import { emptyWorkoutData } from '@/core/workouts';
import { createWorkoutRepository } from '@/store/workoutRepository';
import type { SharedWorkoutSnapshot } from '@/core/workoutSync';
import { AccountRoot } from './AccountRoot';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root; let container: HTMLDivElement; let factory: IDBFactory;
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'synthetic@example.invalid' };
function service(initial: Account | null = null) {
  let current = initial; const listeners = new Set<(value: Account | null) => void>();
  let shared: SharedWorkoutSnapshot = { revision: 0, data: emptyWorkoutData() };
  const emit = (value: Account | null) => { current = value; listeners.forEach(callback => callback(value)); };
  const api: AccountService = { namespace: 'test', getAccount: async () => current,
    subscribe: callback => { listeners.add(callback); return () => { listeners.delete(callback); }; },
    sendCode: vi.fn(async () => {}), verifyCode: vi.fn(async () => { emit(user); return user; }),
    signOut: vi.fn(async () => { emit(null); }), cloud: () => ({
      read: async () => shared, write: vi.fn(async (revision, data) => {
        if (revision !== shared.revision) throw new Error('Preview sync again');
        shared = { revision: revision + 1, data }; return shared;
      }),
    }),
  };
  return { api, emit, listeners, cloud: () => shared, setCloud: (value: SharedWorkoutSnapshot) => { shared = value; } };
}
beforeEach(() => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  factory = new IDBFactory(); container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.replaceChildren(); vi.restoreAllMocks(); });
async function settle(check: () => boolean) {
  for (let i = 0; i < 100 && !check(); i++) await act(async () => new Promise(resolve => setTimeout(resolve, 5)));
  expect(check()).toBe(true);
}
async function render(api: AccountService | null) {
  await act(async () => root.render(<AccountRoot loadService={async () => api} factory={factory} />));
  await settle(() => !!container.querySelector('h1'));
  await settle(() => [...container.querySelectorAll('button')].some(item =>
    ['Start workout', 'Resume workout'].includes(item.getAttribute('aria-label') ?? '') && !item.disabled));
}
function button(text: string) {
  const found = [...container.querySelectorAll('button')].find(item => item.getAttribute('aria-label') === text || item.textContent?.trim() === text);
  if (!found) throw new Error(`Missing button ${text}`); return found;
}
async function click(text: string) { await act(async () => button(text).click()); }
async function fill(label: string, value: string) {
  const item = [...container.querySelectorAll('input')].find(input => input.getAttribute('aria-label') === label);
  expect(item).toBeDefined();
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(item, value);
    item!.dispatchEvent(new Event('input', { bubbles: true })); });
}
it('keeps logging usable when accounts are unconfigured and explains setup in Account', async () => {
  await render(null); await settle(() => !button('Start workout').disabled);
  await click('Account and sync'); expect(container.textContent).toContain('Accounts are not configured');
  await click('Home'); expect(button('Start workout').disabled).toBe(false);
});
it('signs in with a code, opens a separate library and returns to the intact guest library', async () => {
  const guest = createWorkoutRepository(factory);
  await guest.save(0, { ...emptyWorkoutData(), active: { id: 'guest', name: 'Guest workout', unit: 'kg', startedAt: 1, finishedAt: null, exercises: [] } });
  const { api } = service(); await render(api); await click('Account and sync');
  await fill('Email address', user.email); await click('Send email code');
  await settle(() => container.textContent!.includes('Verify email code'));
  await fill('Email code', '123456'); await click('Verify email code');
  await settle(() => container.textContent!.includes('Signed in'));
  await settle(() => !![...container.querySelectorAll('button')].find(item => item.getAttribute('aria-label') === 'Start workout' && !item.disabled));
  expect(container.textContent).not.toContain('Guest workout');
  await click('Account and sync'); vi.spyOn(window, 'confirm').mockReturnValue(true); await click('Sign out');
  await settle(() => container.textContent!.includes('Guest workout'));
  expect((await guest.load()).active?.name).toBe('Guest workout');
});
it('previews and explicitly copies guest records into the account before manual cloud sync', async () => {
  const guest = createWorkoutRepository(factory);
  await guest.save(0, { ...emptyWorkoutData(), routines: [{ id: 'r', name: 'Guest routine', unit: 'kg', exercises: [{ id: 'e', name: 'Bench press' }] }] });
  const fake = service(user); await render(fake.api); await click('Account and sync');
  await click('Preview guest copy'); await settle(() => container.textContent!.includes('Copy guest records'));
  expect(fake.cloud().revision).toBe(0);
  await click('Copy guest records'); await settle(() => container.textContent!.includes('Guest records copied'));
  expect((await createWorkoutRepository(factory, `gymbro-account:test:${user.id}`).load()).routines).toHaveLength(1);
  await click('Preview sync'); await settle(() => !!container.querySelector('[aria-label="Sync preview"]'));
  expect(fake.cloud().revision).toBe(0);
  await click('Confirm sync'); await settle(() => container.textContent!.includes('Sync complete'));
  expect(fake.cloud().data.routines).toHaveLength(1);
  expect((await guest.load()).routines).toHaveLength(1);
});
it('retains the account library and local logging after cloud reads fail', async () => {
  const fake = service(user); fake.api.cloud = () => ({ read: async () => { throw new Error('Connection unavailable'); }, write: vi.fn() });
  await render(fake.api); await click('Account and sync'); await click('Preview sync');
  await settle(() => container.textContent!.includes('Connection unavailable'));
  await click('Home'); expect(button('Start workout').disabled).toBe(false);
});
it('switches authenticated identities without displaying another account library', async () => {
  const fake = service(user); await render(fake.api);
  await act(async () => fake.emit({ ...user, id: '22222222-2222-4222-8222-222222222222' }));
  await settle(() => !button('Start workout').disabled);
  await act(async () => root.unmount());
  expect(fake.listeners.size).toBe(0);
  root = createRoot(container);
});
it('shows a failed code request and keeps the guest account usable', async () => {
  const fake = service(); fake.api.sendCode = async () => { throw new Error('Wait before requesting another code'); };
  await render(fake.api); await click('Account and sync'); await fill('Email address', user.email); await click('Send email code');
  await settle(() => container.textContent!.includes('Wait before requesting another code'));
  expect(button('Send email code').disabled).toBe(false);
});
it('shows both versions of a conflict and requires a deliberate selection before uploading', async () => {
  const fake = service(user);
  const routine = { id: 'r', name: 'Device plan', unit: 'kg' as const, exercises: [{ id: 'e', name: 'Bench press' }] };
  await createWorkoutRepository(factory, `gymbro-account:test:${user.id}`).save(0, { ...emptyWorkoutData(), routines: [routine] });
  fake.setCloud({ revision: 1, data: { ...emptyWorkoutData(), routines: [{ ...routine, name: 'Cloud plan' }] } });
  await render(fake.api); await click('Account and sync'); await click('Preview sync');
  await settle(() => !!container.querySelector('input[type="radio"]'));
  expect(container.textContent).toContain('Device plan'); expect(container.textContent).toContain('Cloud plan');
  expect(button('Confirm sync').disabled).toBe(true);
  await act(async () => (container.querySelector('input[value="cloud"]') as HTMLInputElement).click());
  expect(button('Confirm sync').disabled).toBe(false); await click('Confirm sync');
  await settle(() => container.textContent!.includes('Sync complete'));
  expect((await createWorkoutRepository(factory, `gymbro-account:test:${user.id}`).load()).routines?.[0].name).toBe('Cloud plan');
});
it('does not restore an older identity over a more recent auth event', async () => {
  const fake = service(user); let finish!: (value: Account | null) => void;
  fake.api.getAccount = () => new Promise(resolve => { finish = resolve; });
  await act(async () => root.render(<AccountRoot loadService={async () => fake.api} factory={factory} />));
  const other = { id: '22222222-2222-4222-8222-222222222222', email: 'other@example.invalid' };
  await act(async () => { fake.emit(other); finish(user); });
  await settle(() => !!container.querySelector('h1'));
  await click('Account and sync');
  expect(container.textContent).toContain(other.email);
  await settle(() => !!container.querySelector('button'));
});
it('offers full reload recovery after failed service initialization and keeps guest fallback explicit', async () => {
  await act(async () => root.render(<AccountRoot loadService={async () => { throw new Error('chunk load failed'); }} factory={factory} />));
  await settle(() => container.textContent!.includes('Sign-in could not be opened'));
  expect(button('Reload app')).toBeDefined();
  await click('Continue as guest'); await settle(() => !!container.querySelector('h1'));
  await settle(() => !button('Start workout').disabled);
});
it('uses the existing themed, phone-sized input treatment for email and code', async () => {
  const fake = service(); await render(fake.api); await click('Account and sync');
  const email = container.querySelector('input[aria-label="Email address"]')!;
  expect(email.classList.contains('bg-ink-900')).toBe(true);
  expect(email.classList.contains('text-base')).toBe(true);
  await fill('Email address', user.email); await click('Send email code');
  await settle(() => !!container.querySelector('input[aria-label="Email code"]'));
  expect(container.querySelector('input[aria-label="Email code"]')!.className).toBe(email.className);
});
