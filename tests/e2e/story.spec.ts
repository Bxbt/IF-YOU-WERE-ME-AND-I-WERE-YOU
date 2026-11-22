/** M4 — S5, S5a, S6 with Chapter 1 (docs/12 M4 exit criteria). Fictional names only (TC-SAFE-07). */
import { expect, test } from '@playwright/test';
import {
  A,
  J,
  noOverflow,
  noSeriousA11y,
  playThrough,
  seed,
  seedSave,
  T,
  transitionHeading,
} from './helpers';

test('Ch1 plays from chapter selection through scenario setup to the end (M4 exit)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await seedSave(page, seed());
  await page.goto(`/#/j/${J}/chapters`);

  await expect(page.getByRole('heading', { level: 1, name: 'เลือกบท' })).toBeVisible();
  await expect(page.getByText('เนื้อเรื่องบทนี้กำลังพัฒนา')).toHaveCount(0);
  await noOverflow(page);
  await noSeriousA11y(page);

  await page
    .getByRole('article', { name: /The Incident/ })
    .getByRole('button', { name: 'เริ่ม' })
    .click();
  await expect(page).toHaveURL(/scenario\?next=/);
  await expect(page.getByRole('button', { name: 'เริ่มเรื่อง' })).toBeDisabled();
  await noOverflow(page);
  await noSeriousA11y(page);
  await page.getByRole('button', { name: 'ฉันเอง' }).click();
  await page.getByRole('button', { name: 'เริ่มเรื่อง' }).click();

  await expect(page).toHaveURL(new RegExp(`/j/${J}/play/ch1$`));
  await expect(page.getByText('เย็นวันพฤหัสบดี ฝนตกปรอย ๆ มาตั้งแต่บ่าย').first()).toBeVisible();
  await noOverflow(page);
  await noSeriousA11y(page);

  await playThrough(
    page,
    () => transitionHeading(page).isVisible(),
    async () => {
      await noOverflow(page);
      await noSeriousA11y(page);
    },
  );

  await expect(page.getByRole('button', { name: 'ไปบทที่ 2' })).toBeEnabled();
  await noSeriousA11y(page);
  await page.getByRole('button', { name: /พักก่อน/ }).click();
  await expect(page.getByRole('article', { name: /The Incident/ }).getByText('จบแล้ว')).toBeVisible();
  await expect(page.getByText(/ดาว ติดลิฟต์ · มีการเตือนก่อนหน้า/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('TC-RES-01 (Ch1): reload mid-chapter → Title "เล่นต่อ" returns to the same line with flags', async ({
  page,
}) => {
  await seedSave(page, seed({ scenario: 'me' }));
  await page.goto(`/#/j/${J}/play/ch1?start=1`);
  await expect(page.getByTestId('play')).toHaveAttribute('data-scene', 'ch1_s01');
  await playThrough(page, () => page.getByText('ทางเดินชั้นแปดเงียบ', { exact: false }).first().isVisible());
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  const line = await page.locator('[data-line-variant] [aria-live]').first().textContent();

  await page.waitForTimeout(400); // autosave debounce (300 ms)
  await page.goto('/');
  await page.reload();
  await page.getByRole('button', { name: /เล่นต่อ/ }).click();
  await expect(page.getByTestId('play')).toHaveAttribute('data-scene', 'ch1_s02');
  await expect(page.locator('[data-line-variant] [aria-live]').first()).toHaveText(line!);
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('iywm:save')!).journeys.jr_journey001.chapterProgress.ch1,
  );
  expect(saved.flags.in_reply).toBe('quick');
  expect(saved.status).toBe('in_progress');
});

test('TC-PLAY-02 (Ch1): when the partner is in the elevator, insider scenes show the imagined banner', async ({
  page,
}) => {
  await seedSave(page, seed({ scenario: 'other' }));
  await page.goto(`/#/j/${J}/play/ch1?start=1`);
  await expect(
    page.getByRole('note').getByText('นี่คือสิ่งที่คุณจินตนาการว่า เมฆ อาจรู้สึก — ไม่ใช่สิ่งที่ เมฆ บอก'),
  ).toBeVisible();
  await playThrough(page, () =>
    page.getByTestId('play').evaluate((el) => el.getAttribute('data-scene') === 'ch1_s03'),
  );
  await expect(page.getByRole('note')).toHaveText('คุณกำลังเล่นเป็น ดาว');
});

test('TC-RES-03 (reflection): free-text draft survives a reload', async ({ page }) => {
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
  await expect(page.getByText('ข้อ 3 จาก 3', { exact: false })).toBeVisible();
  await expect(page.getByText('ส่วนตัว')).toBeVisible();
  await page.getByRole('textbox').fill('นั่งรอแล้วเปิดเพลงฟัง');
  await page.waitForTimeout(2600);
  await page.reload();
  await expect(page.getByRole('textbox')).toHaveValue('นั่งรอแล้วเปิดเพลงฟัง');
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await expect(page.getByText('บางครั้ง สิ่งที่แยกเราออกจากกัน ไม่ใช่ระยะทาง').first()).toBeVisible();
});

test('TC-A11Y-03 (start of Ch1): keyboard only — Enter advances, digits choose, Esc pauses', async ({
  page,
}, info) => {
  test.skip(!info.project.name.startsWith('desktop'), 'keyboard play is checked on desktop');
  await seedSave(page, seed({ scenario: 'me' }));
  await page.goto(`/#/j/${J}/play/ch1?start=1`);
  const groupVisible = () => page.getByRole('group', { name: 'เลือกสิ่งที่จะทำ' }).isVisible();
  for (let i = 0; i < 20 && !(await groupVisible()); i++) {
    await expect(page.getByRole('button', { name: 'ถัดไป' })).toBeFocused();
    await page.keyboard.press('Enter');
  }
  await expect(
    page.getByRole('group', { name: 'เลือกสิ่งที่จะทำ' }).getByRole('button').first(),
  ).toBeFocused();
  await page.keyboard.press('2');
  await expect(page.getByText('อืม แค่บอกไว้เฉย ๆ').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'หยุดพัก' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('TC-RWD-02/03: S6 layout — scene on top (portrait) or left 60% (landscape); choices ≥ 44px', async ({
  page,
}, info) => {
  await seedSave(page, seed({ scenario: 'me' }));
  await page.goto(`/#/j/${J}/play/ch1?start=1`);
  await playThrough(page, () => page.getByRole('group', { name: 'เลือกสิ่งที่จะทำ' }).isVisible());
  await noOverflow(page);
  for (const b of await page.getByRole('group', { name: 'เลือกสิ่งที่จะทำ' }).getByRole('button').all()) {
    expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  const scene = (await page.getByTestId('scene').boundingBox())!;
  const vw = page.viewportSize()!.width;
  if (info.project.name === 'landscape') {
    expect(scene.width / vw).toBeGreaterThan(0.5);
    expect(scene.width / vw).toBeLessThan(0.65);
  } else {
    expect(scene.y).toBeLessThan(120);
  }
});

test('pause menu: skip scene moves on, history lists earlier lines', async ({ page }) => {
  await seedSave(page, seed({ scenario: 'me' }));
  await page.goto(`/#/j/${J}/play/ch1?start=1`);
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await page.getByRole('button', { name: 'บทพูดที่ผ่านมา' }).click();
  await expect(
    page.getByRole('dialog', { name: 'บทพูดที่ผ่านมา' }).getByText('เย็นวันพฤหัสบดี', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'ปิด' }).click();
  await page.getByRole('button', { name: 'หยุดพัก' }).click();
  await page.getByRole('button', { name: 'ข้ามฉากนี้' }).click();
  await expect(page.getByTestId('play')).toHaveAttribute('data-scene', 'ch1_s02');
});
