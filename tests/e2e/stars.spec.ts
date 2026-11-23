/** S1 star layer (docs/06 S1 Motion): twinkling stars + a shooting star; none with reduced motion. */
import { expect, test } from '@playwright/test';

test('S1 stars twinkle and a shooting star crosses; buttons still work', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'animation timing checked once');
  await page.goto('/');
  const field = page.getByTestId('star-field');
  await expect(field).toBeAttached();
  await expect(field).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('[data-shooting="1"]')).toBeAttached({ timeout: 10_000 });
  // The layer never takes clicks.
  await page.getByRole('button', { name: /เริ่มการเดินทางใหม่/ }).click();
  await expect(page).toHaveURL(/#\/intro/);
});

test('S1 has no star animation with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /เริ่มการเดินทางใหม่/ })).toBeVisible();
  await expect(page.getByTestId('star-field')).toHaveCount(0);
});
