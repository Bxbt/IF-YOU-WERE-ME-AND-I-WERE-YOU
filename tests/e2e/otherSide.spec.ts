/** M16 — storyline 2 "อีกด้านของเรื่อง" (TC-OS-01, TC-OS-05). Fictional names only. */
import { expect, test } from '@playwright/test';
import { J, noOverflow, noSeriousA11y, playThrough, seed, seedSave, tap, transitionHeading } from './helpers';

test('TC-OS-01/05: storyline tab → pick the teller → play os1 to the end; the main story is untouched', async ({
  page,
}, info) => {
  test.skip(!['desktop', 'mobile-webkit'].includes(info.project.name), 'one desktop and one phone');
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await seedSave(page, seed({ scenario: 'me' }));
  await page.goto(`/#/j/${J}/chapters`);

  // Main tab first, as before.
  await expect(page.getByRole('tab', { name: 'เรื่องหลัก' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('article', { name: /The Incident/ })).toBeVisible();
  await tap(page.getByRole('tab', { name: 'อีกด้านของเรื่อง' }));
  await expect(page).toHaveURL(/line=other/);
  await expect(page.getByRole('article', { name: /I Want to Be Loved, Too/ })).toBeVisible();
  await expect(page.getByRole('article', { name: /Choosing Myself/ })).toBeVisible();
  await expect(page.getByRole('article', { name: /The Incident/ })).toHaveCount(0);
  await noSeriousA11y(page);

  await page
    .getByRole('article', { name: /I Want to Be Loved, Too/ })
    .getByRole('button', { name: 'เริ่ม' })
    .click();
  await expect(page.getByTestId('teller')).toBeVisible();
  await noOverflow(page);
  await tap(page.getByRole('button', { name: 'ฉันเอง' }));
  await tap(page.getByRole('button', { name: 'เริ่มเรื่อง' }));
  await expect(page.getByTestId('play')).toHaveAttribute('data-scene', 'os1_s01');
  await expect(page.getByText(/คืออีกด้านของคนที่ใคร ๆ ก็มองว่าเข้มแข็ง/).first()).toBeVisible();

  await playThrough(page, () => transitionHeading(page).isVisible());
  await expect(page.getByRole('button', { name: 'ไปบทที่ 2' })).toBeVisible();

  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('iywm:save')!));
  const j = save.journeys['jr_journey001'];
  expect(j.otherSide.tellerPlayerId).toBe('pl_playerA01');
  expect(j.chapterProgress.os1.status).toBe('completed');
  expect(j.chapterProgress.ch1?.status ?? 'not_started').toBe('not_started');
  expect(Object.keys(j.chapterProgress.os1.flags).every((f: string) => f.startsWith('os_'))).toBe(true);

  // "พักก่อน" goes back to the storyline tab.
  await tap(page.getByRole('button', { name: /พักก่อน/ }));
  await expect(page).toHaveURL(/chapters\?line=other/);
  await expect(page.getByRole('tab', { name: 'อีกด้านของเรื่อง' })).toHaveAttribute('aria-selected', 'true');
  expect(errors).toEqual([]);
});
