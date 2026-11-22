/** M4 — S5, S5a, S6 with Chapter 1 (docs/12 M4 exit criteria). Fictional names only (TC-SAFE-07). */
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const T = '2026-11-22T10:00:00.000Z';
const J = 'jr_journey001';
const A = 'pl_playerA01';
const B = 'pl_imaginedB1';

function seed(
  opts: {
    scenario?: 'me' | 'other';
    progress?: Record<string, unknown>;
    storyAnswers?: Record<string, unknown>;
    textSpeed?: string;
  } = {},
) {
  const appearance = {
    preset: 'p1',
    skin: 2,
    hairStyle: 1,
    hairColor: 3,
    outfit: 0,
    outfitColor: 4,
    accessory: 'none',
  };
  return {
    schemaVersion: '1.0.0',
    settings: {
      fontScale: 1,
      textSpeed: opts.textSpeed ?? 'instant',
      reducedMotion: 'system',
      sound: { enabled: false, volume: 0.6 },
      lastJourneyId: J,
    },
    players: {
      [A]: {
        id: A,
        kind: 'real',
        createdBy: null,
        nickname: 'ดาว',
        sentenceEnding: 'นะ',
        addressStyle: 'เธอ',
        appearance,
        createdAt: T,
        updatedAt: T,
      },
      [B]: {
        id: B,
        kind: 'imagined',
        createdBy: A,
        nickname: 'เมฆ',
        sentenceEnding: '',
        addressStyle: 'name',
        appearance: { ...appearance, preset: 'p3' },
        createdAt: T,
        updatedAt: T,
      },
    },
    profiles: {},
    journeys: {
      [J]: {
        id: J,
        mode: 'solo',
        playerIds: [A, B],
        status: 'active',
        ...(opts.scenario
          ? {
              scenario: {
                insiderPlayerId: opts.scenario === 'me' ? A : B,
                priorWarning: true,
                randomized: false,
                setAt: T,
              },
            }
          : {}),
        chapterProgress: opts.progress ?? {},
        storyAnswers: opts.storyAnswers ?? {},
        mirrorItems: {},
        observed: [],
        nextConversation: [],
        introSeen: true,
        createdAt: T,
        updatedAt: T,
        lastPlayedAt: T,
      },
    },
    reports: {},
    memories: {},
    drafts: {},
  };
}

/** Seeds once per test: a reload keeps whatever the game saved since. */
async function seedSave(page: Page, data: unknown) {
  await page.addInitScript((json) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('iywm:save', json);
      sessionStorage.setItem('seeded', '1');
    }
  }, JSON.stringify(data));
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
async function noSeriousA11y(page: Page) {
  await page.waitForTimeout(600);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

const transitionHeading = (page: Page) => page.getByRole('heading', { name: 'บทที่ 1 จบแล้ว' });

/** Plays forward: first option at every choice, skips cards and reflection. Stops at `until`. */
async function playThrough(
  page: Page,
  until: () => Promise<boolean>,
  checks?: (kind: string) => Promise<void>,
) {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    if (await until()) return;
    const choices = page.getByRole('group', { name: 'เลือกสิ่งที่จะทำ' });
    if (await choices.isVisible()) {
      if (!seen.has('choice')) {
        seen.add('choice');
        await checks?.('choice');
      }
      await choices.getByRole('button').first().click();
      continue;
    }
    const cards = page.getByRole('heading', { name: 'การ์ดความรู้สึก' });
    if (await cards.isVisible()) {
      await checks?.('cards');
      await page.getByRole('button', { name: 'ไปต่อ' }).click();
      continue;
    }
    const skipReflection = page.getByRole('button', { name: 'ข้ามคำถามท้ายบท' });
    if (await skipReflection.isVisible()) {
      await checks?.('reflection');
      await skipReflection.click();
      continue;
    }
    await page.getByRole('button', { name: /^(ถัดไป|แสดงข้อความทั้งหมด)$/ }).click();
  }
  throw new Error('did not reach the target');
}

test('Ch1 plays from chapter selection through scenario setup to the end (M4 exit)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await seedSave(page, seed());
  await page.goto(`/#/j/${J}/chapters`);

  await expect(page.getByRole('heading', { level: 1, name: 'เลือกบท' })).toBeVisible();
  await expect(page.getByText('เนื้อเรื่องบทนี้กำลังพัฒนา')).toHaveCount(4);
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

  await expect(page.getByRole('button', { name: 'ไปบทที่ 2' })).toBeDisabled();
  await expect(page.getByText('บทที่ 2 กำลังพัฒนา')).toBeVisible();
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
