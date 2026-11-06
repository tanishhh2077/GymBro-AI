import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import App from './App';
import { accountConfiguration, openAccountService, type Account, type AccountService } from '@/core/accountService';
import { AccountPanel } from '@/components/AccountPanel';
import { createWorkoutRepository } from '@/store/workoutRepository';
import { createWorkoutStore, workoutStore } from '@/store/useWorkoutStore';
import { useSessionStore } from '@/store/useSessionStore';

let configuredService: Promise<AccountService | null> | undefined;
function loadConfiguredService() {
  const config = accountConfiguration(import.meta.env);
  configuredService ??= config ? openAccountService(config) : Promise.resolve(null);
  return configuredService;
}
interface Access {
  service: AccountService | null; account: Account | null; ready: boolean; error: string;
}
export function AccountRoot({ loadService = loadConfiguredService, factory = globalThis.indexedDB }:
  { loadService?: () => Promise<AccountService | null>; factory?: IDBFactory } = {}) {
  const [access, setAccess] = useState<Access>({ service: null, account: null, ready: false, error: '' });
  const abandon = useRef<() => void>(() => {});
  useEffect(() => {
    let live = true; let events = 0; let release: (() => void) | undefined;
    abandon.current = () => { live = false; release?.(); };
    void (async () => {
      try {
        const service = await loadService();
        if (!live) return;
        if (!service) { setAccess({ service: null, account: null, ready: true, error: '' }); return; }
        release = service.subscribe(account => {
          events++;
          if (live) setAccess({ service, account, ready: true, error: '' });
        });
        const before = events;
        const account = await service.getAccount();
        if (live && before === events) setAccess({ service, account, ready: true, error: '' });
      } catch {
        if (live) setAccess({ service: null, account: null, ready: false,
          error: 'Sign-in could not be opened. Check account configuration or your connection, then reload the app. You can also continue with your guest library.' });
      }
    })();
    return () => { live = false; release?.(); };
  }, [loadService]);
  const identity = access.account ? `${access.service!.namespace}:${access.account.id}` : 'guest';
  const previous = useRef(identity);
  useLayoutEffect(() => {
    if (previous.current !== identity) useSessionStore.getState().reset();
    previous.current = identity;
  }, [identity]);
  const workouts = useMemo(() => identity === 'guest' && factory === globalThis.indexedDB ? workoutStore :
    createWorkoutStore(createWorkoutRepository(factory,
      identity === 'guest' ? 'gymbro-workouts' : `gymbro-account:${identity}`)), [factory, identity]);
  const guest = useMemo(() => createWorkoutRepository(factory), [factory]);
  if (!access.ready) return <main className="mx-auto max-w-lg space-y-4 p-6">
    <p role={access.error ? 'alert' : 'status'} className="text-slate-300">{access.error || 'Opening your workout library…'}</p>
    {access.error && <div className="flex flex-wrap gap-3">
      <button className="btn-primary" onClick={() => window.location.reload()}>Reload app</button>
      <button className="btn-ghost" onClick={() => {
        abandon.current(); setAccess({ service: null, account: null, ready: true, error: '' });
      }}>Continue as guest</button>
    </div>}
  </main>;
  return <App key={identity} workouts={workouts}
    accountLabel={access.account ? `Signed in · ${access.account.email}` : 'Guest mode'}
    accountPanel={<AccountPanel service={access.service} account={access.account} store={workouts} guest={guest} />} />;
}
