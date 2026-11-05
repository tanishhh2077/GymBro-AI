import { test as base, expect, type Page } from '@playwright/test';
import process from 'node:process';

// Config-loader environment changes need not propagate to test workers.
// Set the pinned runner's error-snapshot switch in this worker as well.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';

export const test = base.extend({
  page: async ({ page, context, baseURL }, run, testInfo) => {
    const origin = new URL(baseURL!).origin;
    const outgoing: string[] = [];
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    context.on('page', other => other.on('pageerror', error => errors.push(error.message)));
    await context.route('**/*', (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if ((['http:', 'https:'].includes(url.protocol) && url.origin !== origin) ||
          !['GET', 'HEAD'].includes(request.method())) {
        outgoing.push(`${request.method()} ${url.origin}${url.pathname}`);
        return route.abort();
      }
      return route.continue();
    });
    await run(page);
    if (testInfo.status !== testInfo.expectedStatus) {
      const state = await sessionSnapshot(page);
      console.info('Synthetic test failure state:', {
        processingState: state.processingState,
        clips: state.clips.map(({ status, errorKind }) => ({ status, errorKind })),
      });
    }
    expect(outgoing, 'only local read requests are permitted').toEqual([]);
    expect(errors, 'no uncaught browser errors').toEqual([]);
  },
});
export { expect };

export async function openAnalysis(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Analyze video', exact: true }).click();
}

export async function expectNoPose(page: Page) {
  // Fail promptly on terminal error/false-positive output instead of waiting
  // five minutes for a notice that those states will never render.
  await expect.poll(async () => (await sessionSnapshot(page)).clips[0]?.status,
    { timeout: 310_000 }).toMatch(/^(no-pose|ready|error)$/);
  expect((await sessionSnapshot(page)).clips[0].status).toBe('no-pose');
  await expect(page.getByRole('status').filter({ hasText: 'No pose detected' }))
    .toContainText('No pose detected');
}

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
