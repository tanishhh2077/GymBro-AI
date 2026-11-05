import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import { test, expect, sessionSnapshot } from './app';

const invalidVideo = { name: 'invalid.mp4', mimeType: 'video/mp4', buffer: Buffer.from('not a movie') };

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('rejects empty files before creating a clip or loading the model', async ({ page }) => {
  const modelRequests: string[] = [];
  page.on('request', (request) => {
    if (/\/(models|wasm)\//.test(request.url())) modelRequests.push(request.url());
  });
  await page.locator('input[type=file]').setInputFiles({ ...invalidVideo, buffer: Buffer.alloc(0) });
  await expect(page.getByRole('alert', { name: 'Video not accepted' })).toContainText('empty');
  expect((await sessionSnapshot(page)).clips).toHaveLength(0);
  expect(modelRequests).toHaveLength(0);
});

test('rejects other extensions even with an MP4 MIME hint', async ({ page }) => {
  await page.locator('input[type=file]').setInputFiles({ ...invalidVideo, name: 'recording.mov' });
  await expect(page.getByRole('alert')).toContainText('Choose an .mp4 video');
  expect((await sessionSnapshot(page)).clips).toHaveLength(0);
});

test('rejects a multiple-file drop as one selection', async ({ page }) => {
  await page.getByRole('group', { name: 'Video drop area' }).evaluate((element) => {
    const data = new DataTransfer();
    for (const name of ['one.mp4', 'two.mp4']) data.items.add(new File(['x'], name, { type: 'video/mp4' }));
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }));
  });
  await expect(page.getByRole('alert')).toContainText('only one video');
  expect((await sessionSnapshot(page)).clips).toHaveLength(0);
});

for (const [filename, message] of [
  ['over-duration', 'longer than 60 seconds'],
  ['over-long-edge', 'longest side exceeds 1920 pixels'],
  ['over-pixels', 'more than 2073600 pixels per frame'],
]) {
  test(`rejects decoded metadata outside limits: ${filename}`, async ({ page }) => {
    const modelRequests: string[] = [];
    page.on('request', (request) => {
      if (/\/(models|wasm)\//.test(request.url())) modelRequests.push(request.url());
    });
    await page.locator('input[type=file]').setInputFiles(fileURLToPath(new URL(`../fixtures/${filename}.mp4`, import.meta.url)));
    await expect(page.getByRole('alert')).toContainText(message);
    expect((await sessionSnapshot(page)).clips[0].errorKind).toBe('validation');
    expect(modelRequests).toHaveLength(0);
  });
}

test('reports real decode failure, blocks replacement, and restores keyboard admission', async ({ page }) => {
  const choose = page.getByRole('button', { name: 'Choose video' });
  await choose.focus();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.keyboard.press('Enter');
  await (await chooserPromise).setFiles(invalidVideo);
  await expect(page.getByRole('alert')).toContainText('The video could not be read');
  await expect(choose).toBeDisabled();
  await expect(page.locator('input[type=file]')).toBeDisabled();
  const before = (await sessionSnapshot(page)).clips[0];
  expect(before.errorKind).toBe('video-load');
  await page.getByRole('group', { name: 'Video drop area' }).evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(['replacement'], 'replacement.mp4', { type: 'video/mp4' }));
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }));
  });
  expect((await sessionSnapshot(page)).clips.map((clip) => clip.id)).toEqual([before.id]);
  const remove = page.getByRole('button', { name: 'Remove clip', exact: true });
  await remove.focus();
  await page.keyboard.press('Enter');
  await expect(choose).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Add your bench press video' })).toBeFocused();
  await expect.poll(async () => (await sessionSnapshot(page)).clips.length).toBe(0);
  await page.locator('input[type=file]').setInputFiles(invalidVideo);
  await expect(page.getByRole('alert')).toContainText('The video could not be read');
  expect((await sessionSnapshot(page)).clips[0].id).not.toBe(before.id);
});
