/** S3 form extras (docs/06 S3): random look, facial hair, custom word for the partner. */
import { expect, test } from '@playwright/test';
import { tap } from './helpers';

test('custom word for the partner is required once chosen; random look and facial hair work', async ({
  page,
}) => {
  await page.goto('/#/players/new');
  await page.getByLabel(/ชื่อเล่น/).fill('ดาว');
  await tap(page.getByRole('button', { name: 'พิมพ์เอง', exact: true }));
  const custom = page.getByLabel('คำที่ใช้เรียกคู่ (เช่น ที่รัก, แก)');
  await expect(custom).toBeVisible();
  await tap(page.getByRole('button', { name: /^(ถัดไป|บันทึก)$/ }));
  await expect(page.getByText('พิมพ์คำที่ใช้เรียกคู่ก่อน หรือเลือกแบบอื่น')).toBeVisible();
  await expect(custom).toBeFocused();
  await custom.fill('ที่รัก');

  await tap(
    page.locator('fieldset', { hasText: 'หนวดเครา' }).getByRole('button', { name: 'เครา', exact: true }),
  );
  await expect(
    page.locator('fieldset', { hasText: 'หนวดเครา' }).getByRole('button', { name: 'เครา', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await tap(page.getByRole('button', { name: 'สุ่มรูปลักษณ์' }));
  await tap(page.getByRole('button', { name: /^(ถัดไป|บันทึก)$/ }));
  await expect(page.getByText('พิมพ์คำที่ใช้เรียกคู่ก่อน')).toHaveCount(0);
  const saved = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('iywm:save') ?? '{}');
    return Object.values(s.players ?? {}).find((p) => (p as { nickname: string }).nickname === 'ดาว');
  });
  expect(saved).toMatchObject({ addressStyle: 'custom', addressCustom: 'ที่รัก' });
});
