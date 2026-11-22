/** Phase 2 — Play Together on one device (M8). Fictional names only. */
import { expect, test } from '@playwright/test';
import { A, B, J, noSeriousA11y, playThrough, seed, seedSave, T, tap } from './helpers';

const reflectAt = (scene = 'ch1_reflect') => ({
  ch1: {
    chapterId: 'ch1',
    status: 'in_progress',
    currentSceneId: scene,
    lineIndex: 0,
    flags: {},
    choiceLog: [],
    skippedScenes: [],
    playCount: 1,
    startedAt: T,
  },
});

test('TC-PLAY-11: Together Ch2 — Part A by Ch1 waiter, handoff before Part B', async ({ page }) => {
  await seedSave(page, seed({ scenario: 'me', together: true })); // A = insider in Ch1 → B plays Part A
  await page.goto(`/#/j/${J}/play/ch2?start=1`);
  await playThrough(page, () => page.getByTestId('handoff').isVisible());
  await expect(page.getByRole('heading', { name: 'ส่งเครื่องให้ เมฆ' })).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole('button', { name: 'ฉันคือ เมฆ — พร้อมแล้ว' }).click();
  await expect(page.getByRole('note').filter({ hasText: 'เมฆ กำลังเล่นเป็น ดาว' })).toBeVisible();
  await playThrough(page, () => page.getByTestId('handoff').isVisible());
  await expect(page.getByRole('heading', { name: 'ส่งเครื่องให้ ดาว' })).toBeVisible();
  await page.getByRole('button', { name: 'ฉันคือ ดาว — พร้อมแล้ว' }).click();
  await expect(page.getByRole('note').filter({ hasText: 'ดาว กำลังเล่นเป็น เมฆ' })).toBeVisible();
});

test('TC-PRIV-01/08/11: reflection is answered privately; B never sees A’s answer or draft', async ({
  page,
}) => {
  await seedSave(page, seed({ scenario: 'me', together: true, progress: reflectAt() }));
  await page.goto(`/#/j/${J}/play/ch1`);
  // A first: handoff screen shows nothing of the content.
  await expect(page.getByRole('heading', { name: 'ส่งเครื่องให้ ดาว' })).toBeVisible();
  expect(await page.locator('main section').innerText()).not.toContain('ถ้าคุณคือคนในลิฟต์');
  await page.getByRole('button', { name: 'ฉันคือ ดาว — พร้อมแล้ว' }).click();
  await page
    .getByRole('group', { name: /ถ้าคุณคือคนในลิฟต์/ })
    .getByRole('button', { name: 'กลัว' })
    .click();
  await tap(page.getByRole('button', { name: 'ถัดไป', exact: true }));
  await page.getByRole('button', { name: 'คงไม่มีอะไร' }).click();
  await tap(page.getByRole('button', { name: 'ถัดไป', exact: true }));
  await page.getByRole('textbox').fill('ความลับของดาวเกี่ยวกับการรอ');
  await page.waitForTimeout(2300); // a draft is saved…
  await tap(page.getByRole('button', { name: 'ถัดไป', exact: true }));
  // …and B gets the device.
  await expect(page.getByRole('heading', { name: 'ส่งเครื่องให้ เมฆ' })).toBeVisible();
  expect(await page.content()).not.toContain('ความลับของดาว');
  await page.getByRole('button', { name: 'ฉันคือ เมฆ — พร้อมแล้ว' }).click();
  await expect(page.getByText('ข้อ 1 จาก 3', { exact: false })).toBeVisible();
  expect(await page.content()).not.toContain('ความลับของดาว');
  await expect(
    page.getByRole('group', { name: /ถ้าคุณคือคนในลิฟต์/ }).getByRole('button', { name: 'กลัว' }),
  ).toHaveAttribute('aria-pressed', 'false');
  await tap(page.getByRole('button', { name: 'ข้ามคำถามท้ายบท' }));
  await expect(page.getByRole('heading', { name: /ส่งเครื่องคืนให้ ทั้งสองคน/ })).toBeVisible();
  await page.getByRole('button', { name: 'ได้รับเครื่องแล้ว' }).click();
  await expect(page.getByText('บางครั้ง สิ่งที่แยกเราออกจากกัน ไม่ใช่ระยะทาง').first()).toBeVisible();
  await page.waitForTimeout(400); // autosave debounce
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('iywm:save')!));
  expect(Object.keys(saved.journeys.jr_journey001.storyAnswers)).toContain('pl_playerA01:r1_3');
  expect(saved.journeys.jr_journey001.storyAnswers['pl_playerA01:r1_3'].freeText).toBe(
    'ความลับของดาวเกี่ยวกับการรอ',
  );
  expect(Object.keys(saved.drafts)).toEqual([]);
});

test('TC-PRIV-02 + resume (audit M-2): leaving mid private step resumes at the handoff of whoever is left', async ({
  page,
}) => {
  const progress = reflectAt();
  (progress.ch1 as Record<string, unknown>).pendingPrivateSteps = [
    { itemId: 'ch1_reflect:0', playerIds: [B] },
  ];
  await seedSave(page, seed({ scenario: 'me', together: true, progress }));
  await page.goto(`/#/j/${J}/chapters`);
  await page.goto(`/#/j/${J}/play/ch1`);
  await expect(page.getByRole('heading', { name: 'ส่งเครื่องให้ เมฆ' })).toBeVisible();
  await page.getByRole('button', { name: 'ฉันคือ เมฆ — พร้อมแล้ว' }).click();
  await expect(page.getByText('ข้อ 1 จาก 3', { exact: false })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/chapters$/);
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'ส่งเครื่องให้ เมฆ' })).toBeVisible(); // never straight back into the answers
  void A;
});
