import { test as base, expect, type Page } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, run) => {
    await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
    await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
    await run(page);
  },
});
export { expect };

/** Inspect the existing development module, never a production debug global. */
export async function sessionSnapshot(page: Page) {
  return page.evaluate(async () => {
    const path = '/src/store/useSessionStore.ts';
    const { useSessionStore } = await import(path) as typeof import('../../src/store/useSessionStore');
    const state = useSessionStore.getState();
    return {
      processingState: state.processingState,
      delegate: state.engineDelegate,
      clips: state.clips.map(({ id, url, status, errorKind, pose }) => ({ id, url, status, errorKind, pose })),
    };
  });
}
