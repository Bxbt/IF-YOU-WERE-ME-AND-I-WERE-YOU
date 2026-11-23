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
  expect(await page.locator('main section').innerText()).not.toContain('ถ้าคุณคือคนที่ติดฝนอยู่ข้างล่าง');
  await page.getByRole('button', { name: 'ฉันคือ ดาว — พร้อมแล้ว' }).click();
  await page
    .getByRole('group', { name: /ถ้าคุณคือคนที่ติดฝนอยู่ข้างล่าง/ })
    .getByRole('button', { name: 'กังวล' })
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
    page
      .getByRole('group', { name: /ถ้าคุณคือคนที่ติดฝนอยู่ข้างล่าง/ })
      .getByRole('button', { name: 'กังวล' }),
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

test('M10: Ch4 mirror — both answer privately, consent on the shared screen, then see both views', async ({
  page,
}) => {
  const progress = {
    ch4: {
      chapterId: 'ch4',
      status: 'in_progress',
      currentSceneId: 'ch4_mirrors',
      lineIndex: 0,
      flags: {},
      choiceLog: [],
      skippedScenes: [],
      playCount: 1,
      startedAt: T,
      revealMode: 'per_question',
    },
  };
  await seedSave(page, seed({ scenario: 'me', together: true, progress }));
  await page.goto(`/#/j/${J}/play/ch4`);
  await playThrough(page, () => page.getByTestId('handoff').isVisible());

  for (const [who, self, guess] of [
    ['ดาว', 'อ้อมกอด', 'คนที่ฟัง'],
    ['เมฆ', 'เวลาเงียบ ๆ', 'อ้อมกอด'],
  ] as const) {
    await page.getByRole('button', { name: `ฉันคือ ${who} — พร้อมแล้ว` }).click();
    await tap(page.getByRole('group', { name: /หลังเจอเรื่องน่ากลัว/ }).getByRole('button', { name: self }));
    await tap(page.getByRole('button', { name: 'ถัดไป', exact: true }).last());
    await tap(page.getByRole('group', { name: /หลังเจอเรื่องน่ากลัว/ }).getByRole('button', { name: guess }));
    await tap(page.getByRole('button', { name: 'ถัดไป', exact: true }).last());
  }

  await page.getByRole('button', { name: 'ได้รับเครื่องแล้ว' }).click();
  const panel = page.getByTestId('reveal-panel');
  await expect(panel).toBeVisible();
  // Nothing of either answer is on the page before consent (R1).
  expect(await panel.innerText()).not.toContain('เวลาเงียบ');
  await noSeriousA11y(page);
  await tap(page.getByRole('button', { name: 'ดาว: เปิดได้' }));
  await tap(page.getByRole('button', { name: 'เมฆ: เปิดได้' }));
  const result = page.getByTestId('reveal-result-M01');
  await expect(result).toContainText('สิ่งที่ เมฆ คิดว่า ดาว ตอบ');
  await expect(result).toContainText('เวลาเงียบ');
  await noSeriousA11y(page);
  await tap(page.getByRole('button', { name: 'ถัดไป', exact: true }));
  await expect(page.getByTestId('reveal-panel')).toHaveCount(0);
  void A;
  void B;
});

test('M10b: each player picks personality answers to open; only questions both picked appear', async ({
  page,
}) => {
  const save = seed({ scenario: 'me', together: true }) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const ans = (qid: string, layer: string, selected: string[]) => ({
    questionId: qid,
    layer,
    selected,
    meta: null,
    status: 'answered',
    revision: 1,
    answeredAt: T,
    updatedAt: T,
  });
  save.profiles = {
    [`${A}:self`]: {
      key: `${A}:self`,
      ownerId: A,
      hiddenObservedCards: [],
      confirmedObserved: {},
      updatedAt: T,
      answers: { Q13: ans('Q13', 'self', ['q13_hug']), Q16: ans('Q16', 'self', ['q16_empathy']) },
    },
    [`${B}:self`]: {
      key: `${B}:self`,
      ownerId: B,
      hiddenObservedCards: [],
      confirmedObserved: {},
      updatedAt: T,
      answers: { Q13: ans('Q13', 'self', ['q13_listen']), Q16: ans('Q16', 'self', ['q16_solution']) },
    },
    [`${B}:perceived:${A}`]: {
      key: `${B}:perceived:${A}`,
      ownerId: B,
      aboutId: A,
      updatedAt: T,
      answers: { Q13: ans('Q13', 'perceived', ['q13_hug']) },
    },
  };
  await seedSave(page, save);
  await page.goto(`/#/j/${J}/compare`);
  await expect(page.getByTestId('profile-offer')).toBeVisible();
  await noSeriousA11y(page);

  // ดาว opens Q13 and Q16; เมฆ opens only Q13.
  await tap(page.getByRole('button', { name: 'ดาว: เลือกข้อที่ยอมเปิด' }));
  const list = page.getByTestId('offer-list');
  await tap(list.getByRole('checkbox', { name: /อยากให้คนรักปลอบแบบไหน/ }));
  await tap(list.getByRole('checkbox', { name: /เล่าปัญหาให้คนรักฟัง/ }));
  await tap(page.getByRole('button', { name: 'บันทึกที่เลือก' }));
  await expect(page.getByTestId('offer-list')).toHaveCount(0);
  expect(await page.locator('main').innerText()).not.toContain('กอด หรือสัมผัสอบอุ่น'); // nothing open yet

  await tap(page.getByRole('button', { name: 'เมฆ: เลือกข้อที่ยอมเปิด' }));
  await tap(page.getByTestId('offer-list').getByRole('checkbox', { name: /อยากให้คนรักปลอบแบบไหน/ }));
  await tap(page.getByRole('button', { name: 'บันทึกที่เลือก' }));

  // Q13 is compared (เมฆ guessed ดาว's answer); Q16 stays closed (only ดาว picked it).
  await expect(page.getByTestId('compare-similar')).toContainText('กอด หรือสัมผัสอบอุ่น');
  expect(await page.locator('main').innerText()).not.toContain('วิธีแก้ปัญหา');
  await noSeriousA11y(page);
});

test('M10b: Play Together can be started from mode selection', async ({ page }) => {
  await page.goto('/#/mode');
  await tap(page.getByRole('button', { name: /เล่นด้วยกัน/ }));
  await expect(page).toHaveURL(/players\/new\?mode=together/);
});
