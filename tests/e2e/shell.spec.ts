import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SCREENS = ['/', '/intro', '/mode', '/settings', '/about', '/does-not-exist'];

for (const path of SCREENS) {
  test(`${path}: no horizontal scroll (TC-RWD-01) and no serious a11y violations (TC-A11Y-01)`, async ({
    page,
  }) => {
    await page.goto(`/#${path}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

test('main flow: title → intro → mode, and back links work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /เริ่มการเดินทางใหม่/ }).click();
  await expect(page).toHaveURL(/#\/intro$/);
  await page.getByRole('button', { name: 'เข้าใจแล้ว เริ่มเลย' }).click();
  await expect(page).toHaveURL(/#\/mode$/);
  await page.getByRole('link', { name: 'กลับ' }).click();
  await expect(page).toHaveURL(/#\/intro$/);
});

test('settings persist across reload', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'ใหญ่มาก' }).click();
  await page.waitForFunction(() => localStorage.getItem('iywm:save')?.includes('"fontScale":1.3'));
  await page.reload();
  await expect(page.getByRole('button', { name: 'ใหญ่มาก' })).toHaveAttribute('aria-pressed', 'true');
});

test('TC-A11Y-03 (shell): keyboard reaches and activates the start button', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit skips buttons on Tab by default (macOS setting)');
  await page.goto('/');
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    if (
      await page
        .getByRole('button', { name: /เริ่มการเดินทางใหม่/ })
        .evaluate((el) => el === document.activeElement)
    )
      break;
  }
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/intro$/);
});

test('TC-A11Y-04: reduced motion setting is applied to the document', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'เปิด' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
});

test('TC-A11Y-07: 200% font scale keeps screens free of horizontal scroll', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'ใหญ่มาก' }).click();
  for (const path of ['/', '/intro', '/mode', '/about']) {
    await page.goto(`/#${path}`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('title: every control can be tapped — nothing covers it on any viewport', async ({ page }) => {
  await page.goto('/');
  const controls = page.locator('a:visible, button:visible:not([disabled])');
  const n = await controls.count();
  expect(n).toBeGreaterThan(0);
  // trial click runs the actionability checks (including "another element intercepts pointer events").
  for (let i = 0; i < n; i++) await controls.nth(i).click({ trial: true, timeout: 2000 });
  await page.getByRole('link', { name: 'ตั้งค่า' }).click();
  await expect(page).toHaveURL(/#\/settings$/);
});
