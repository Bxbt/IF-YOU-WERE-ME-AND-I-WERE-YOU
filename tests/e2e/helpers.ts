/** Shared E2E helpers for story specs. Fictional names only (TC-SAFE-07). */
import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const T = '2026-11-22T10:00:00.000Z';
export const J = 'jr_journey001';
export const A = 'pl_playerA01';
export const B = 'pl_imaginedB1';

export function seed(
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
export async function seedSave(page: Page, data: unknown) {
  await page.addInitScript((json) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('iywm:save', json);
      sessionStorage.setItem('seeded', '1');
    }
  }, JSON.stringify(data));
}

export async function noOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
export async function noSeriousA11y(page: Page) {
  await page.waitForTimeout(600);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

export const transitionHeading = (page: Page) => page.getByRole('heading', { name: 'บทที่ 1 จบแล้ว' });

/** Plays forward: first option at every choice, skips cards and reflection. Stops at `until`. */
/**
 * Plays forward. Choices: an option matching `prefer` if any, else the first. Skips cards'
 * extras, reflection, statements; answers mirrors with "ข้าม"; follows "ไปบทที่ N". Stops at `until`.
 */
export async function playThrough(
  page: Page,
  until: () => Promise<boolean>,
  checks?: (kind: string) => Promise<void>,
  prefer: RegExp[] = [],
) {
  const seen = new Set<string>();
  const once = async (kind: string) => {
    if (seen.has(kind)) return;
    seen.add(kind);
    await checks?.(kind);
  };
  for (let i = 0; i < 800; i++) {
    if (await until()) return;
    const choices = page.getByRole('group', { name: 'เลือกสิ่งที่จะทำ' });
    if (await choices.isVisible()) {
      await once('choice');
      const buttons = await choices.getByRole('button').all();
      let target = buttons[0]!;
      for (const b of buttons) {
        const t = (await b.textContent()) ?? '';
        if (prefer.some((r) => r.test(t))) target = b;
      }
      await target.click();
      continue;
    }
    const skipReflection = page.getByRole('button', { name: 'ข้ามคำถามท้ายบท' });
    if (await skipReflection.isVisible()) {
      await once('reflection');
      await skipReflection.click();
      continue;
    }
    const skipStatement = page.getByRole('button', { name: 'ข้ามประโยคนี้' });
    if (await skipStatement.isVisible()) {
      await once('statements');
      await skipStatement.click();
      continue;
    }
    const mirrorResult = page.getByTestId('mirror-result');
    if (await mirrorResult.isVisible()) {
      await once('mirror-result');
      await mirrorResult.getByRole('button', { name: 'ถัดไป' }).click();
      continue;
    }
    const meta = page.getByRole('group', { name: 'ตัวเลือกอื่น' });
    if (await meta.isVisible()) {
      await once('mirror');
      await meta.getByRole('button', { name: 'ข้าม' }).click();
      await page.getByRole('button', { name: 'ถัดไป', exact: true }).last().click();
      continue;
    }
    const goOn = page.getByRole('button', { name: 'ไปต่อ', exact: true });
    if (await goOn.isVisible()) {
      await once((await page.getByRole('heading', { level: 2 }).first().textContent()) ?? 'continue');
      await goOn.click();
      continue;
    }
    const nextChapter = page.getByRole('button', { name: /^ไปบทที่ \d$/ });
    if ((await nextChapter.isVisible()) && (await nextChapter.isEnabled())) {
      await once('transition');
      await nextChapter.click();
      continue;
    }
    const toEnding = page.getByRole('button', { name: 'ไปตอนจบ' });
    if (await toEnding.isVisible()) {
      await toEnding.click();
      continue;
    }
    await page
      .getByRole('button', { name: /^(ถัดไป|แสดงข้อความทั้งหมด)$/ })
      .first()
      .click();
  }
  const where = await page.evaluate(() => ({
    url: location.hash,
    scene: document.querySelector('[data-testid=play]')?.getAttribute('data-scene'),
    text: document.querySelector('main section')?.textContent?.slice(0, 300),
  }));
  throw new Error(`did not reach the target: ${JSON.stringify(where)}`);
}
