/** M5 — Chapters 2–5, S7 Solo mirror, S15 Ending (docs/12 M5 exit criteria). Fictional names only. */
import { expect, test, type Page } from '@playwright/test';
import { J, noOverflow, noSeriousA11y, playThrough, seed, seedSave, tap } from './helpers';

const choiceVisible = (page: Page, text: RegExp) =>
  page.getByRole('group', { name: 'เลือกสิ่งที่จะทำ' }).getByRole('button', { name: text }).isVisible();

test('TC-PLAY-01: Title → new journey → Ch1–Ch5 with the first option every time → Ending', async ({
  page,
}, info) => {
  test.skip(
    !['desktop', 'mobile-webkit'].includes(info.project.name),
    'full run on one desktop and one phone',
  );
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await tap(page.getByRole('button', { name: /เริ่มการเดินทางใหม่/ }));
  await tap(page.getByRole('button', { name: 'เข้าใจแล้ว เริ่มเลย' }));
  await tap(page.getByRole('button', { name: /เล่นคนเดียว/ }));
  await page.getByLabel(/ชื่อเล่น/).fill('ดาว');
  await tap(page.getByRole('button', { name: 'ถัดไป' }));
  await page.getByLabel(/ชื่อเล่น/).fill('เมฆ');
  await tap(page.getByRole('button', { name: 'บันทึก' }));
  await tap(page.getByRole('link', { name: 'ไว้ทีหลัง — ไปเลือกบท' }));
  // Instant text keeps the run short; everything else stays default.
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('iywm:save')!);
    raw.settings.textSpeed = 'instant';
    localStorage.setItem('iywm:save', JSON.stringify(raw));
  });
  await page.reload();
  await page
    .getByRole('article', { name: /The Incident/ })
    .getByRole('button', { name: 'เริ่ม' })
    .click();
  await tap(page.getByRole('button', { name: 'ฉันเอง' }));
  await tap(page.getByRole('button', { name: 'เริ่มเรื่อง' }));

  const checked = new Set<string>();
  await playThrough(
    page,
    () => page.getByTestId('ending').isVisible(),
    async (kind) => {
      if (checked.has(kind)) return;
      checked.add(kind);
      await noOverflow(page);
      await noSeriousA11y(page);
    },
  );

  // S15: English lines + Thai translation, skip, then the post-game buttons (TC-PLAY-10).
  await expect(
    page
      .getByText('We just have to keep choosing to listen.', { exact: false })
      .or(page.getByText(/We don't have to/)),
  ).toBeVisible();
  await noSeriousA11y(page);
  await tap(page.getByRole('button', { name: 'ข้าม' }));
  await expect(page.getByRole('button', { name: 'ดูสิ่งที่เราเข้าใจ' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'ดูรายงานของฉัน' })).toBeEnabled();
  await noOverflow(page);
  await noSeriousA11y(page);

  const j = await page.evaluate(
    () =>
      Object.values(JSON.parse(localStorage.getItem('iywm:save')!).journeys)[0] as {
        status: string;
        chapterProgress: Record<string, { status: string } | undefined>;
      },
  );
  expect(j.status).toBe('completed');
  expect(['ch1', 'ch2', 'ch3', 'ch4', 'ch5'].map((c) => j.chapterProgress[c]?.status)).toEqual(
    Array(5).fill('completed'),
  );
  expect(errors).toEqual([]);

  await tap(page.getByRole('button', { name: 'กลับหน้าแรก' }));
  await expect(page.getByRole('button', { name: /เล่นต่อ/ })).toBeEnabled();
});

test('TC-PLAY-10: ending shows both English sets with Thai translations; home works', async ({ page }) => {
  await seedSave(page, seed({ scenario: 'me' }));
  await page.goto(`/#/j/${J}/ending`);
  await expect(
    page.getByText("We don't have to feel exactly the same way to understand each other."),
  ).toBeVisible();
  await expect(page.getByText('เราไม่จำเป็นต้องรู้สึกเหมือนกันทุกอย่าง ถึงจะเข้าใจกันได้')).toBeVisible();
  const seen: string[] = [];
  for (let i = 0; i < 12 && !(await page.getByRole('button', { name: 'กลับหน้าแรก' }).isVisible()); i++) {
    seen.push((await page.getByRole('button', { name: 'ถัดไป' }).textContent()) ?? '');
    await tap(page.getByRole('button', { name: 'ถัดไป' }));
  }
  expect(seen.join('|')).toContain('WE ARE NOT THE SAME.');
  expect(seen.join('|')).toContain('เราไม่เหมือนกัน และนั่นก็ไม่เป็นไร');
  // All three post-game buttons work (TC-PLAY-10).
  await tap(page.getByRole('button', { name: 'ดูสิ่งที่เราเข้าใจ' }));
  await expect(page).toHaveURL(new RegExp(`/j/${J}/compare$`));
  await page.goBack();
  await tap(page.getByRole('button', { name: 'ข้าม' }));
  await tap(page.getByRole('button', { name: 'ดูรายงานของฉัน' }));
  await expect(page).toHaveURL(new RegExp(`/j/${J}/report/`));
  await page.goBack();
  await tap(page.getByRole('button', { name: 'ข้าม' }));
  await tap(page.getByRole('button', { name: 'กลับหน้าแรก' }));
  await expect(page).toHaveURL(/#\/$/);
});

test('TC-PLAY-03: Ch2 Solo — partner part shows the imagined banner, own part does not', async ({ page }) => {
  await seedSave(page, seed({ scenario: 'me' })); // self = insider → Part B (waiter) is the partner's
  await page.goto(`/#/j/${J}/play/ch2?start=1`);
  await playThrough(page, () =>
    page.getByRole('note').filter({ hasText: 'คุณกำลังเล่นเป็น ดาว' }).isVisible(),
  );
  await expect(page.getByText(/นี่คือสิ่งที่คุณจินตนาการ/)).toHaveCount(0);
  await playThrough(page, () =>
    page
      .getByRole('note')
      .filter({ hasText: /นี่คือสิ่งที่คุณจินตนาการว่า เมฆ/ })
      .isVisible(),
  );
  await noSeriousA11y(page);
  // Part C timeline appears with both columns.
  await playThrough(page, () => page.getByRole('heading', { name: 'เส้นเวลาของสองคน' }).isVisible());
  await expect(page.getByText('ดาว (ติดฝนอยู่)').first()).toBeVisible();
  await expect(page.getByText('เมฆ (ข้างนอก)').first()).toBeVisible();
  await noOverflow(page);
  await noSeriousA11y(page);
});

test('TC-PLAY-07: Ch3 blame → safety note shows and closes; Interpretation Check lists blame', async ({
  page,
}) => {
  await seedSave(page, seed({ scenario: 'me' }));
  await page.goto(`/#/j/${J}/play/ch3?start=1`);
  await playThrough(page, () => choiceVisible(page, /ทำไมไม่ฟังกันเลย/));
  await tap(page.getByRole('button', { name: /ทำไมไม่ฟังกันเลย/ }));
  const note = page
    .getByRole('note', { name: 'ข้อความถึงคุณ' })
    .filter({ hasText: 'ความกังวลเป็นสิ่งที่เข้าใจได้' });
  await playThrough(page, () => note.isVisible());
  await noSeriousA11y(page);
  await tap(note.getByRole('button', { name: 'ปิดข้อความนี้' }));
  await expect(note).toHaveCount(0);
  await playThrough(page, () => page.getByRole('heading', { name: 'เบื้องหลังคำพูด' }).isVisible());
  await expect(page.getByText('กลัวจะเสียไป')).toBeVisible();
  await expect(page.getByText('น้อยใจที่คำเตือนไม่ถูกรับฟัง')).toBeVisible();
  await expect(page.getByText('สิ่งที่คุณจินตนาการ').first()).toBeVisible(); // the waiter is the partner's role here
  await noOverflow(page);
  await noSeriousA11y(page);
});

test('TC-PLAY-08: Ch3 ask_hug → "ขอแป๊บนึงก่อนนะ" → no hug, stands beside without touching', async ({
  page,
}) => {
  await seedSave(page, seed({ scenario: 'me' }));
  await page.goto(`/#/j/${J}/play/ch3?start=1`);
  await playThrough(page, () => choiceVisible(page, /ขอกอดได้ไหม/));
  await tap(page.getByRole('button', { name: /ขอกอดได้ไหม/ }));
  await playThrough(page, () => choiceVisible(page, /ขอแป๊บนึงก่อน/));
  await tap(page.getByRole('button', { name: /ขอแป๊บนึงก่อน/ }));
  const beside = page.getByText(/ยืนอยู่ข้าง ๆ โดยไม่แตะตัว/).first();
  await playThrough(page, () => beside.isVisible());
  await expect(page.getByText(/กอดกันกลางโถง/)).toHaveCount(0);
});

test('TC-PLAY-09: Ch3 s06 own sentence "<b>hi</b>" is shown as plain text', async ({ page }) => {
  await seedSave(page, seed({ scenario: 'me' }));
  await page.goto(`/#/j/${J}/play/ch3?start=1`);
  await playThrough(page, () => page.getByRole('button', { name: 'พิมพ์เอง' }).isVisible());
  await tap(page.getByRole('button', { name: 'พิมพ์เอง' }));
  await page.getByLabel('ประโยคของคุณ').fill('<b>hi</b>');
  await tap(page.getByRole('button', { name: 'ใช้ประโยคนี้' }));
  const line = page.getByText('<b>hi</b>', { exact: true }).first();
  await playThrough(page, () => line.isVisible());
  expect(await page.locator('b', { hasText: 'hi' }).count()).toBe(0);
});

test('TC-REV-09: Solo mirror — no consent step; "{other} บอก: ยังไม่รู้" card', async ({ page }) => {
  await seedSave(page, seed({ scenario: 'me' }));
  await page.goto(`/#/j/${J}/play/ch4?start=1`);
  await playThrough(page, () => page.getByRole('group', { name: 'ตัวเลือกอื่น' }).isVisible());
  await expect(page.getByText('ในฐานะตัวคุณ')).toBeVisible();
  await noSeriousA11y(page);
  await page
    .getByRole('group', { name: /หลังเจอเรื่องน่ากลัว/ })
    .getByRole('button')
    .first()
    .click();
  await tap(page.getByRole('button', { name: 'ถัดไป', exact: true }).last());
  await expect(page.getByText('ลองเดาว่า เมฆ จะตอบว่าอะไร')).toBeVisible();
  await expect(page.getByText('สิ่งที่คุณคิด').first()).toBeVisible();
  await tap(page.getByRole('button', { name: 'ไม่แน่ใจ' }));
  await tap(page.getByRole('button', { name: 'ถัดไป', exact: true }).last());
  const result = page.getByTestId('mirror-result');
  await expect(result.getByText('สิ่งที่ เมฆ บอก')).toBeVisible();
  await expect(result.getByText('ยังไม่รู้')).toBeVisible();
  await expect(page.getByText(/พร้อมเปิดคำตอบ|ยินยอม/)).toHaveCount(0);
  await noOverflow(page);
  await noSeriousA11y(page);
  await tap(result.getByRole('button', { name: 'เพิ่มเป็นคำถามที่อยากถาม' }));
  await expect(result.getByRole('button', { name: 'เพิ่มแล้ว' })).toBeDisabled();
  await page.waitForTimeout(400); // autosave debounce (300 ms)
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('iywm:save')!).journeys.jr_journey001,
  );
  expect(saved.mirrorItems.M01.entries.pl_playerA01.perceived.meta).toBe('not_sure');
  expect(saved.nextConversation).toHaveLength(1);
});

test('Ch5 statements: starters fill the field, private by default, saved', async ({ page }) => {
  await seedSave(page, seed({ scenario: 'me' }));
  await page.goto(`/#/j/${J}/play/ch5?start=1`);
  await playThrough(page, () =>
    page.getByRole('heading', { name: /สิ่งที่ฉันเข้าใจเธอมากขึ้นตอนนี้คือ/ }).isVisible(),
  );
  await expect(page.getByRole('button', { name: 'เก็บไว้' })).toHaveAttribute('aria-pressed', 'true');
  await tap(page.getByRole('group', { name: 'ตัวช่วยเริ่มประโยค' }).getByRole('button').first());
  await expect(page.getByRole('textbox')).not.toHaveValue('');
  await noSeriousA11y(page);
  await tap(page.getByRole('button', { name: 'ถัดไป', exact: true }));
  await expect(page.getByText('ประโยค 2 จาก 5', { exact: false })).toBeVisible();
  await page.waitForTimeout(400);
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('iywm:save')!).journeys.jr_journey001.mirrorItems.cs1,
  );
  expect(saved.kind).toBe('statement');
  expect(saved.entries.pl_playerA01.shareIntent).toBe(false);
});

test('Ch4/Ch5 reflection questions show the partner name, never a raw {other}', async ({ page }) => {
  await seedSave(
    page,
    seed({
      scenario: 'me',
      progress: {
        ch4: {
          chapterId: 'ch4',
          status: 'in_progress',
          currentSceneId: 'ch4_reflect',
          lineIndex: 0,
          flags: {},
          choiceLog: [],
          skippedScenes: [],
          playCount: 1,
          startedAt: '2026-11-22T10:00:00.000Z',
        },
      },
    }),
  );
  await page.goto(`/#/j/${J}/play/ch4`);
  const q2 = page.getByText(/มีเรื่องไหนที่คุณอยากให้ .+ รู้เกี่ยวกับตัวคุณ/);
  await playThrough(page, async () => (await q2.count()) > 0 || (await page.getByText('ข้อ 1 จาก 3').isVisible()));
  if (!(await q2.isVisible())) {
    await tap(page.getByRole('button', { name: 'ไม่มี', exact: true }));
    await tap(page.getByRole('button', { name: 'ถัดไป', exact: true }));
  }
  await expect(q2).toContainText('เมฆ');
  expect(await page.locator('main').innerText()).not.toContain('{other}');
});

test('Ch4 dialogue cards show the speaking player’s portrait (A/B speakers)', async ({ page }) => {
  await seedSave(page, seed({ scenario: 'me' }));
  await page.goto(`/#/j/${J}/play/ch4?start=1`);
  const line = page.getByText(/เมื่อวาน… ถ้าเป็น/).first();
  await playThrough(page, () => line.isVisible());
  const card = line.locator('xpath=ancestor::div[contains(@class,"panel")][1]');
  await expect(card.locator('canvas')).toHaveCount(1);
});
