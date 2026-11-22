/** M11 Memory Scenes — fictional names only. */
import { expect, test } from '@playwright/test';
import { A, noSeriousA11y, seed, seedSave, tap } from './helpers';

test('TC-MEM: create a memory scene and play it; no overflow, no serious a11y issues', async ({ page }) => {
  await seedSave(page, seed({ scenario: 'me' }));
  await page.goto(`/#/memories/${A}/new`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ฉากใหม่จากความทรงจำ');
  await noSeriousA11y(page);
  await page.getByLabel(/^ชื่อฉาก/).fill('ตอนรอที่สถานี');
  await page.getByRole('textbox', { name: /เกิดอะไรขึ้น/ }).fill('รอนานจนหงุดหงิด');
  await tap(page.getByRole('button', { name: 'บันทึก' }));
  await expect(page.getByText('รอนานจนหงุดหงิด')).toBeVisible();
  await tap(page.getByRole('button', { name: 'ถัดไป' }));
  await tap(page.getByRole('button', { name: 'ถัดไป' }));
  await expect(page.getByRole('note')).toContainText('ไม่ใช่สิ่งที่');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await noSeriousA11y(page);
});
