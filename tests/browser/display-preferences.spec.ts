import { test, expect } from './app';

test('text size scales the page, persists after reload and does not overflow at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const size = page.getByRole('combobox', { name: 'Text size', exact: true });
  await expect(size).toHaveValue('normal');
  await size.selectOption('larger');
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'larger');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('20px');
  await page.reload();
  await expect(size).toHaveValue('larger');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('reduced motion removes transition time', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const duration = await page.evaluate(() => getComputedStyle(document.querySelector('button')!).transitionDuration);
  expect(parseFloat(duration)).toBeLessThan(0.001);
});
