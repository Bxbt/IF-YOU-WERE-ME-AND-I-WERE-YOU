/** M6 — S8 Comparison, S9 Report, exports (docs/12 M6 exit criteria). Fictional names only. */
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { A, J, noOverflow, noSeriousA11y, seed, seedSave, T } from './helpers';

const answer = (
  questionId: string,
  layer: 'self' | 'perceived',
  selected: string[],
  meta: string | null = null,
) => ({
  questionId,
  layer,
  selected,
  meta,
  status: meta === 'skipped' ? 'skipped' : 'answered',
  revision: 1,
  answeredAt: T,
  updatedAt: T,
});

function richSave() {
  const s = seed({ scenario: 'me' }) as ReturnType<typeof seed> & { profiles: Record<string, unknown> };
  s.profiles = {
    [`${A}:self`]: {
      key: `${A}:self`,
      ownerId: A,
      hiddenObservedCards: [],
      confirmedObserved: {},
      updatedAt: T,
      answers: {
        Q13: answer('Q13', 'self', ['q13_listen']),
        Q22: answer('Q22', 'self', ['q22_words']),
        Q07: answer('Q07', 'self', [], 'not_sure'),
      },
    },
    [`${A}:perceived:pl_imaginedB1`]: {
      key: `${A}:perceived:pl_imaginedB1`,
      ownerId: A,
      aboutId: 'pl_imaginedB1',
      updatedAt: T,
      answers: {
        Q13: answer('Q13', 'perceived', ['q13_listen']),
        Q22: answer('Q22', 'perceived', ['q22_touch']),
        Q07: answer('Q07', 'perceived', ['q07_talk_now']),
      },
    },
  };
  return s;
}

test('TC-SKIP-09: no personality + Ch4 skipped → S8 empty state; both CTAs work', async ({ page }) => {
  await seedSave(page, seed({ scenario: 'me' }));
  await page.goto(`/#/j/${J}/compare`);
  await expect(page.getByText('ยังไม่มีข้อมูลพอจะเปรียบเทียบ')).toBeVisible();
  await noOverflow(page);
  await noSeriousA11y(page);
  await page.getByRole('link', { name: 'ตอบฉบับสั้น 12 ข้อ' }).click();
  await expect(page.getByText('ข้อ 1 จาก 12')).toBeVisible();
  await page.goto(`/#/j/${J}/compare`);
  await page.getByRole('link', { name: 'เล่นบทที่ 4' }).click();
  await expect(page).toHaveURL(/play\/ch4/);
});

test('S8 Solo: three groups, imagined labels, no counts or scores; add to next conversation', async ({
  page,
}) => {
  await seedSave(page, richSave());
  await page.goto(`/#/j/${J}/compare`);
  await expect(page.getByTestId('compare-similar')).toContainText('คุณคิดว่า เมฆ ก็อาจเลือกแบบเดียวกัน');
  await expect(page.getByTestId('compare-different')).toContainText('ความต่างนี้ไม่ได้แปลว่าใครถูก');
  await expect(page.getByTestId('compare-ask')).toContainText('ยังไม่แน่ใจ');
  // The intro itself says "ไม่มีคะแนน" (docs/06 S8); anything else about scores is not allowed.
  const body = (await page.locator('main').innerText()).replace('ไม่มีคะแนน', '');
  expect(body).not.toMatch(/%|คะแนน|\d+\s*(ข้อ|เรื่อง)ที่ตรง/);
  await noOverflow(page);
  await noSeriousA11y(page);
  const card = page.getByTestId('compare-similar').getByRole('article').first();
  await card.getByRole('button', { name: 'ดูคำถามเต็ม' }).click();
  await card.getByRole('button', { name: 'เพิ่มลงคำถามครั้งหน้า' }).click();
  await expect(card.getByRole('button', { name: 'เพิ่มแล้ว' })).toBeDisabled();
});

test('TC-SKIP-10: empty journey → S9 shows the four sections with CTAs; TXT export works', async ({
  page,
}) => {
  await seedSave(page, seed({ scenario: 'me' }));
  await page.goto(`/#/j/${J}/report/${A}`);
  for (const id of ['me', 'understanding', 'differences', 'next'])
    await expect(page.getByTestId(`report-${id}`)).toBeVisible();
  await expect(page.getByRole('link', { name: 'ตอบ 3 คำถาม' }).first()).toBeVisible();
  await noOverflow(page);
  await noSeriousA11y(page);
  await page.getByRole('button', { name: 'ข้อความ (.txt)' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'ดาวน์โหลด' }).click();
  expect((await download).suggestedFilename()).toMatch(/^iywm-report-\d{8}-\d{4}\.txt$/);
});

test('TC-EXP-07: select 3 items → TXT has only those 3 with source labels', async ({ page }) => {
  await seedSave(page, richSave());
  await page.goto(`/#/j/${J}/report/${A}`);
  await page.getByRole('button', { name: 'เลือกสิ่งที่จะแชร์/ส่งออก' }).click();
  const boxes = page.getByRole('checkbox');
  for (let i = 0; i < 3; i++) await boxes.nth(i).check();
  await expect(page.getByText('เลือกไว้ 3 รายการ')).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole('button', { name: 'ข้อความ (.txt)' }).click();
  await expect(page.getByTestId('text-preview')).toContainText('[คุณ');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'ดาวน์โหลด' }).click();
  const text = readFileSync((await (await download).path())!, 'utf-8');
  const lines = text.split('\n').filter((l) => l.startsWith('['));
  expect(lines).toHaveLength(3);
  for (const l of lines) expect(l).toMatch(/^\[(คุณบอก|คุณคิด|คุณเขียน|คำถามครั้งหน้า)\] /);
});

test('TC-EXP-08: PNG card is 1080×1350', async ({ page }, info) => {
  test.skip(
    info.project.name === 'mobile-webkit' || info.project.name === 'landscape',
    'download of blob PNG checked on Chromium/WebKit desktop sizes',
  );
  await seedSave(page, richSave());
  await page.goto(`/#/j/${J}/report/${A}`);
  await page.getByRole('button', { name: 'เลือกสิ่งที่จะแชร์/ส่งออก' }).click();
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'การ์ดภาพ (.png)' }).click();
  const img = page.getByTestId('png-preview');
  await expect(img).toBeVisible();
  const size = await img.evaluate((el: HTMLImageElement) => [el.naturalWidth, el.naturalHeight]);
  expect(size).toEqual([1080, 1350]);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'ดาวน์โหลด' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
});

test('Next Conversation checklist: add, mark done, edit, delete', async ({ page }) => {
  await seedSave(page, seed({ scenario: 'me' }));
  await page.goto(`/#/j/${J}/report/${A}`);
  await page.getByPlaceholder('เพิ่มคำถามของคุณเอง').fill('วันหยุดนี้อยากไปไหน');
  await page.getByRole('button', { name: 'เพิ่ม', exact: true }).click();
  await page.getByRole('checkbox', { name: /วันหยุดนี้อยากไปไหน/ }).check();
  await page.getByRole('button', { name: 'แก้ไข: วันหยุดนี้อยากไปไหน' }).click();
  await page.getByLabel('แก้ไข', { exact: true }).fill('วันหยุดนี้อยากไปทะเลไหม');
  await page.getByRole('button', { name: 'บันทึก' }).click();
  await expect(page.getByText('วันหยุดนี้อยากไปทะเลไหม').first()).toBeVisible();
  await noSeriousA11y(page);
  await page.getByRole('button', { name: 'ลบ: วันหยุดนี้อยากไปทะเลไหม' }).click();
  await expect(page.getByText('วันหยุดนี้อยากไปทะเลไหม')).toHaveCount(0);
});
