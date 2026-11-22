/** M7 — polish & QA checks (docs/11 §15 MVP acceptance). Fictional names only. */
import { expect, test } from '@playwright/test';
import { A, B, J, noOverflow, noSeriousA11y, seed, seedSave, T } from './helpers';

const completedSave = () => {
  const s = seed({ scenario: 'me' });
  const done = (id: string) => ({
    chapterId: id,
    status: 'completed',
    flags: {},
    choiceLog: [],
    skippedScenes: [],
    playCount: 1,
    startedAt: T,
    completedAt: T,
  });
  (s.journeys[J] as Record<string, unknown>).chapterProgress = Object.fromEntries(
    ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'].map((c) => [c, done(c)]),
  );
  return s;
};

const ROUTES = [
  '/',
  '/intro',
  '/mode',
  '/settings',
  '/about',
  '/players/new',
  `/players/${A}/edit`,
  '/profile',
  `/profile/${A}/self`,
  `/profile/${A}/self/answers`,
  `/profile/${A}/perceived/${B}`,
  `/profile/${A}/perceived/${B}/answers`,
  `/j/${J}/chapters`,
  `/j/${J}/scenario`,
  `/j/${J}/play/ch1`,
  `/j/${J}/play/ch4`,
  `/j/${J}/compare`,
  `/j/${J}/report/${A}`,
  `/j/${J}/ending`,
  '/art-preview',
  '/no-such-page',
];

test('no dead ends: every route renders, has a way out, no overflow, no serious a11y issues', async ({
  page,
}, info) => {
  test.skip(
    !['desktop', 'mobile-chromium'].includes(info.project.name),
    'crawl on one desktop and one phone',
  );
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await seedSave(page, completedSave());
  for (const r of ROUTES) {
    await page.goto(`/#${r}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('เกิดข้อผิดพลาด'), r).toHaveCount(0);
    // Every screen offers a way out: a back/home link, a pause menu, or main menu buttons.
    const ways = page
      .getByRole('link', { name: /กลับ|หน้าแรก/ })
      .or(page.getByRole('button', { name: /หยุดพัก|กลับ|ข้าม|เริ่มการเดินทางใหม่/ }));
    expect(await ways.count(), r).toBeGreaterThan(0);
    await noOverflow(page);
    await noSeriousA11y(page);
  }
  expect(errors).toEqual([]);
});

test('TC-SAFE-03: "อยากตาย" in free text → support card shows and closes; answer saved; nothing extra stored', async ({
  page,
}) => {
  const answer = (q: string) => ({
    key: `${A}:${q}`,
    playerId: A,
    itemId: q,
    kind: 'reflection',
    layer: 'self',
    selected: [],
    meta: 'skipped',
    updatedAt: T,
  });
  await seedSave(
    page,
    seed({
      scenario: 'me',
      progress: {
        ch1: {
          chapterId: 'ch1',
          status: 'in_progress',
          currentSceneId: 'ch1_reflect',
          lineIndex: 0,
          flags: {},
          choiceLog: [],
          skippedScenes: [],
          playCount: 1,
          startedAt: T,
        },
      },
      storyAnswers: { [`${A}:r1_1`]: answer('r1_1'), [`${A}:r1_2`]: answer('r1_2') },
    }),
  );
  await page.goto(`/#/j/${J}/play/ch1`);
  await page.getByRole('textbox').fill('บางคืนก็อยากตาย');
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  const card = page.getByRole('dialog', { name: /คุณไม่จำเป็นต้องรับมือคนเดียว/ });
  await expect(card).toBeVisible();
  await expect(card.getByRole('link', { name: /1323/ })).toHaveAttribute('href', 'tel:1323');
  await noSeriousA11y(page);
  await card.getByRole('button', { name: 'ปิด' }).click();
  await expect(card).toHaveCount(0);
  await page.waitForTimeout(400);
  const raw = await page.evaluate(() => localStorage.getItem('iywm:save')!);
  const saved = JSON.parse(raw).journeys[J].storyAnswers[`${A}:r1_3`];
  expect(saved.freeText).toBe('บางคืนก็อยากตาย');
  expect(raw.split('อยากตาย').length - 1).toBe(1); // only the answer itself — no flag, no log
});

test('TC-RWD-06: font scale 130% at 360px — S6, S8, S9 keep text inside the screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const s = completedSave();
  (s.settings as Record<string, unknown>).fontScale = 1.3;
  await seedSave(page, s);
  for (const r of [
    `/j/${J}/play/ch3?start=1`,
    `/j/${J}/compare`,
    `/j/${J}/report/${A}`,
    `/j/${J}/chapters`,
  ]) {
    await page.goto(`/#${r}`);
    await page.waitForLoadState('networkidle');
    await noOverflow(page);
  }
});

test('TC-A11Y-04 (S6): reduced motion → whole line at once, no shake animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedSave(page, seed({ scenario: 'me', textSpeed: 'slow' }));
  await page.goto(`/#/j/${J}/play/ch1?start=1`);
  await expect(page.getByRole('button', { name: 'ถัดไป' })).toBeVisible(); // complete immediately, not "แสดงข้อความทั้งหมด"
  for (let i = 0; i < 30 && !(await page.getByText('ทำไมมันไม่ขยับ').first().isVisible()); i++) {
    const choices = page.getByRole('group', { name: 'เลือกสิ่งที่จะทำ' });
    if (await choices.isVisible()) await choices.getByRole('button').first().click();
    else await page.getByRole('button', { name: 'ถัดไป' }).click();
    expect(await page.locator('.animate-scene-shake').count()).toBe(0);
  }
});
