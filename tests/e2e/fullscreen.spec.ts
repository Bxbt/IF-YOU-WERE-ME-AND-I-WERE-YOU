/** Full screen (docs/06 "เต็มจอ"): Fullscreen API where it exists, home-screen help on iPhone. */
import { expect, test } from '@playwright/test';
import { tap } from './helpers';

test('manifest makes the home-screen icon open without browser bars', async ({ page }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const res = await page.request.get(new URL(href!, page.url()).toString());
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.display).toBe('fullscreen');
  expect(m.icons.length).toBeGreaterThan(0);
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
});

test('the full-screen button toggles full screen where the browser allows it', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Fullscreen API checked once, in Chromium');
  await page.goto('/');
  await tap(page.getByRole('button', { name: 'เต็มจอ' }));
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await expect(page.getByRole('button', { name: 'ออกจากเต็มจอ' })).toBeVisible();
  await tap(page.getByRole('button', { name: 'ออกจากเต็มจอ' }));
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
});

test('iPhone Safari (no Fullscreen API): the button explains "เพิ่มไปยังหน้าจอโฮม"', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'simulated once');
  await page.addInitScript(() => {
    Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => false });
    Object.defineProperty(Document.prototype, 'webkitFullscreenEnabled', { get: () => false });
    Object.defineProperty(navigator, 'userAgent', {
      get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    });
  });
  await page.goto('/');
  await tap(page.getByRole('button', { name: 'เต็มจอ' }));
  const help = page.getByTestId('fullscreen-help');
  await expect(help).toContainText('เพิ่มไปยังหน้าจอโฮม');
  await tap(help.getByRole('button', { name: 'เข้าใจแล้ว' }));
  await expect(help).toHaveCount(0);
});
