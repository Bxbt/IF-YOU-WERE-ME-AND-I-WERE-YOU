import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
async function noSeriousA11y(page: Page) {
  // Choice buttons fade in (≈0.5 s); scanning mid-fade reports false contrast failures.
  await page.waitForTimeout(600);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

test('solo setup: create self + imagined partner, answer quick set, persist across reload', async ({ page }) => {
  await page.goto('/#/mode');
  await page.getByRole('button', { name: /เล่นคนเดียว/ }).click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('สร้างตัวตนของคุณ');
  await noOverflow(page);
  await noSeriousA11y(page);
  await page.getByLabel(/ชื่อเล่น/).fill('ผู้เล่น A');
  await page.getByRole('button', { name: 'ถัดไป' }).click();

  await expect(page.getByText('สิ่งที่คุณจินตนาการ')).toBeVisible();
  await page.getByLabel(/ชื่อเล่น/).fill('ผู้เล่น B');
  await page.getByRole('button', { name: 'บันทึก' }).click();

  await expect(page).toHaveURL(/#\/profile\?created=1$/);
  await noOverflow(page);
  await noSeriousA11y(page);
  await page.getByRole('link', { name: 'ฉบับสั้น (12 ข้อ)' }).first().click();

  await expect(page.getByText('ข้อ 1 จาก 12')).toBeVisible();
  await noOverflow(page);
  await noSeriousA11y(page);
  await page.getByRole('group', { name: /เวลามีเรื่องอะไรรบกวนใจ/ }).getByRole('button').first().click();
  await page.getByRole('button', { name: /ถัดไป/ }).click();
  await page.getByRole('button', { name: 'ไม่แน่ใจ' }).click();
  await page.getByRole('button', { name: /ถัดไป/ }).click();
  await expect(page.getByText('ข้อ 3 จาก 12')).toBeVisible();
  await page.getByRole('button', { name: /บันทึกแล้วออก/ }).click();

  await page.reload();
  await expect(page.getByText(/ตอบแล้ว 2 · ข้าม 0 · จากทั้งหมด 36 ข้อ/).first()).toBeVisible();
  await page.getByRole('link', { name: 'ดูและแก้คำตอบ' }).first().click();
  await expect(page.getByText('ไม่แน่ใจ').first()).toBeVisible();
  await noOverflow(page);
  await noSeriousA11y(page);
});

test('art preview renders without overflow', async ({ page }) => {
  await page.goto('/#/art-preview');
  await expect(page.getByRole('img', { name: /ในลิฟต์/ })).toBeVisible();
  await noOverflow(page);
  await noSeriousA11y(page);
});
