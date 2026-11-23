/** Phase 3C Live — two devices (two browser contexts) through the real relay. Fictional names only. */
import { expect, test, type Page } from '@playwright/test';
import { playThrough, tap } from './helpers';

const LIVE = 'http://localhost:4174';

async function makePlayer(page: Page, name: string, submit: string) {
  await page.getByLabel('ชื่อเล่น', { exact: false }).first().fill(name);
  await tap(page.getByRole('button', { name: submit }));
}

test('TC-LIVE-08: without a relay, live play is disabled with the reason shown', async ({ page }) => {
  await page.goto('/#/live');
  await expect(page.getByTestId('live-unavailable')).toBeVisible();
  await expect(page.getByRole('button', { name: 'สร้างห้องเล่นสด' })).toHaveCount(0);
});

test('TC-LIVE-07/09: create room → join by link → both enter Ch1 → same scene, controller chooses, private step waits for both', async ({
  browser,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'two-device flow runs once, on desktop');
  test.setTimeout(120_000);
  const ctxA = await browser.newContext({ baseURL: LIVE });
  const ctxB = await browser.newContext({ baseURL: LIVE });
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  await a.goto('/#/live');
  await makePlayer(a, 'ดาว', 'สร้างห้องเล่นสด');
  const invite = await a.getByTestId('live-invite-url').inputValue();
  expect(invite).toContain('#/live?join=');

  await b.goto(invite.replace(/^https?:\/\/[^/]+/, LIVE));
  await expect(b.getByText('ดาว ชวนคุณเล่นสด')).toBeVisible();
  expect(b.url()).not.toContain('join='); // the key leaves the address bar
  await makePlayer(b, 'เมฆ', 'เข้าร่วม');
  await expect(b).toHaveURL(/#\/j\/jr_[^/]+\/chapters/);
  await expect(a).toHaveURL(/#\/j\/jr_[^/]+\/chapters/, { timeout: 15_000 });
  const jid = /#\/j\/(jr_[^/]+)\//.exec(b.url())![1]!;
  expect(a.url()).toContain(jid);

  // A sets the scenario and starts Ch1; B follows into the same chapter.
  await a.goto(`/#/j/${jid}/scenario?next=${encodeURIComponent(`/j/${jid}/play/ch1?start=1`)}`);
  await tap(a.getByRole('button', { name: 'ฉันเอง' }));
  await tap(a.getByRole('button', { name: 'เริ่มเรื่อง' }));
  await expect(a.getByTestId('play')).toBeVisible();
  await expect(a.getByTestId('live-status')).toContainText('ส่งแล้ว', { timeout: 15_000 });
  // TC-LIVE-09: the chapter waits until the partner has entered it too — nobody reads ahead.
  await expect(a.getByTestId('live-wait-enter')).toContainText('รอ เมฆ', { timeout: 15_000 });
  await expect(a.getByRole('button', { name: /^(ถัดไป|แสดงข้อความทั้งหมด)$/ })).toHaveCount(0);
  await b.goto(`/#/j/${jid}/play/ch1`);
  await expect(b.getByTestId('play')).toBeVisible({ timeout: 15_000 });
  await expect(a.getByTestId('live-wait-enter')).toBeHidden({ timeout: 15_000 });
  await expect(b.getByTestId('live-wait-enter')).toBeHidden();

  // A plays forward until somebody has to choose.
  const choicesA = a.getByRole('group', { name: 'เลือกสิ่งที่จะทำ' });
  const waitA = a.getByTestId('live-wait-choice');
  await playThrough(a, async () => (await choicesA.isVisible()) || (await waitA.isVisible()));
  const scene = await a.getByTestId('play').getAttribute('data-scene');
  await expect(b.getByTestId('play')).toHaveAttribute('data-scene', scene!, { timeout: 15_000 });

  const choicesB = b.getByRole('group', { name: 'เลือกสิ่งที่จะทำ' });
  const waitB = b.getByTestId('live-wait-choice');
  if (await choicesA.isVisible()) {
    await expect(waitB).toBeVisible({ timeout: 15_000 });
    await tap(choicesA.getByRole('button').first());
    await expect(waitB).toBeHidden({ timeout: 15_000 });
  } else {
    await expect(choicesB).toBeVisible({ timeout: 15_000 });
    await tap(choicesB.getByRole('button').first());
    await expect(waitA).toBeHidden({ timeout: 15_000 });
  }

  // Drive both devices to the first private step (emotion cards): whoever has a choice picks; A taps on.
  const cards = (p: Page) => p.getByRole('button', { name: 'ไปต่อ', exact: true });
  for (let i = 0; i < 400 && !((await cards(a).isVisible()) && (await cards(b).isVisible())); i++) {
    if (await choicesA.isVisible()) await tap(choicesA.getByRole('button').first());
    else if (await choicesB.isVisible()) await tap(choicesB.getByRole('button').first());
    else {
      const adv = a.getByRole('button', { name: /^(ถัดไป|แสดงข้อความทั้งหมด)$/ }).first();
      if ((await adv.isVisible()) && (await adv.getAttribute('aria-disabled')) !== 'true') await tap(adv);
      else await a.waitForTimeout(150);
    }
  }
  const cardsScene = await a.getByTestId('play').getAttribute('data-scene');
  // Private step: answered at the same time; the first to send waits for the other.
  await tap(cards(a));
  await expect(a.getByTestId('live-wait-answer')).toContainText('รอ เมฆ', { timeout: 15_000 });
  await expect(cards(b)).toBeVisible();
  await tap(cards(b));
  await expect(a.getByTestId('live-wait-answer')).toBeHidden({ timeout: 15_000 });
  await expect(b.getByTestId('live-wait-answer')).toBeHidden();
  await expect(a.getByTestId('play')).not.toHaveAttribute('data-scene', cardsScene!, { timeout: 15_000 });
  await expect(b.getByTestId('play')).toHaveAttribute('data-scene', (await a.getByTestId('play').getAttribute('data-scene'))!, { timeout: 15_000 });
  await ctxA.close();
  await ctxB.close();
});
