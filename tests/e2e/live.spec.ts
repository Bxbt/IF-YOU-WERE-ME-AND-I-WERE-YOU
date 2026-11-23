/** Phase 3C Live — two devices (two browser contexts) through the real relay. Fictional names only. */
import { expect, test, type Page } from '@playwright/test';
import { tap } from './helpers';

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

test('TC-LIVE-10: the partner joins by typing the room code', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'two-device flow runs once, on desktop');
  test.setTimeout(60_000);
  const ctxA = await browser.newContext({ baseURL: LIVE });
  const ctxB = await browser.newContext({ baseURL: LIVE });
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  await a.goto('/#/live');
  await makePlayer(a, 'ดาว', 'สร้างห้องเล่นสด');
  const code = (await a.getByTestId('live-invite-code').textContent())!;
  expect(code).toMatch(/^\w{5}-\w{5}$/);

  await b.goto('/#/live');
  await b.getByTestId('live-code-input').fill('00000-00000');
  await tap(b.getByRole('button', { name: 'เข้าร่วมด้วยโค้ด' }));
  await expect(b.getByRole('alert')).toContainText('ไม่พบห้องนี้');

  await b.goto('/#/live');
  await b.reload();
  await b.getByTestId('live-code-input').fill(code.toLowerCase().replace('-', ' '));
  await tap(b.getByRole('button', { name: 'เข้าร่วมด้วยโค้ด' }));
  await expect(b.getByText('ดาว ชวนคุณเล่นสด')).toBeVisible({ timeout: 15_000 });
  await makePlayer(b, 'เมฆ', 'เข้าร่วม');
  await expect(b).toHaveURL(/#\/j\/jr_[^/]+\/chapters/);
  await expect(a).toHaveURL(/#\/j\/jr_[^/]+\/chapters/, { timeout: 15_000 });
  await ctxA.close();
  await ctxB.close();
});

test('TC-LIVE-07/09/11/12: invite → join → each reads at their own pace → meet at answer steps', async ({
  browser,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'two-device flow runs once, on desktop');
  test.setTimeout(180_000);
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

  // A sets the scenario and starts Ch1 → waits for B (TC-LIVE-09).
  await a.goto(`/#/j/${jid}/scenario?next=${encodeURIComponent(`/j/${jid}/play/ch1?start=1`)}`);
  await tap(a.getByRole('button', { name: 'ฉันเอง' }));
  await tap(a.getByRole('button', { name: 'เริ่มเรื่อง' }));
  await expect(a.getByTestId('live-wait-enter')).toContainText('รอ เมฆ', { timeout: 15_000 });
  await expect(a.getByRole('button', { name: /^(ถัดไป|แสดงข้อความทั้งหมด)$/ })).toHaveCount(0);

  // TC-LIVE-11: B is asked on the chapter list; "ขอเวลาก่อน" tells A, who can invite again.
  const popup = b.getByRole('dialog');
  await expect(popup).toContainText('ดาว ชวนเริ่มบทด้วยกัน', { timeout: 15_000 });
  await expect(b.getByTestId('live-invite')).toContainText('บทที่ 1');
  await tap(popup.getByRole('button', { name: 'ขอเวลาก่อน' }));
  await expect(b.getByRole('dialog')).toHaveCount(0);
  await expect(a.getByTestId('live-declined')).toContainText('เมฆ ขอเวลาก่อน', { timeout: 15_000 });
  await b.waitForTimeout(1500);
  await expect(b.getByRole('dialog')).toHaveCount(0); // not asked again by itself
  await tap(a.getByRole('button', { name: 'ชวนอีกครั้ง' }));
  await expect(b.getByRole('dialog')).toContainText('ดาว ชวนเริ่มบทด้วยกัน', { timeout: 15_000 });
  await tap(b.getByRole('dialog').getByRole('button', { name: 'เข้าบทด้วยกัน' }));
  await expect(b).toHaveURL(/play\/ch1/);
  await expect(b.getByTestId('play')).toBeVisible({ timeout: 15_000 });
  await expect(a.getByTestId('live-wait-enter')).toBeHidden({ timeout: 15_000 });

  // TC-LIVE-12: A reads ahead alone and stops at the first answer step; B has not moved.
  const adv = (p: Page) => p.getByRole('button', { name: /^(ถัดไป|แสดงข้อความทั้งหมด)$/ }).first();
  const readOn = async (p: Page) => {
    const btn = adv(p);
    if ((await btn.isVisible()) && (await btn.getAttribute('aria-disabled')) !== 'true') await tap(btn);
    else await p.waitForTimeout(120);
  };
  const choicesA = a.getByRole('group', { name: 'เลือกสิ่งที่จะทำ' });
  const choicesB = b.getByRole('group', { name: 'เลือกสิ่งที่จะทำ' });
  const arriveA = a.getByTestId('live-wait-arrive');
  const bScene = await b.getByTestId('play').getAttribute('data-scene');
  for (let i = 0; i < 80 && !(await arriveA.isVisible()); i++) await readOn(a);
  await expect(arriveA).toContainText('รอ เมฆ อ่านมาถึงตรงนี้');
  await expect(choicesA).toHaveCount(0);
  await expect(b.getByTestId('play')).toHaveAttribute('data-scene', bScene!);

  // B reads up to the same step on their own; then the choice opens (A owns the insider role).
  for (let i = 0; i < 80 && !(await arriveA.isHidden()); i++) await readOn(b);
  await expect(choicesA).toBeVisible({ timeout: 15_000 });
  await expect(b.getByTestId('live-wait-choice')).toBeVisible({ timeout: 15_000 });
  await tap(choicesA.getByRole('button').first());
  await expect(b.getByTestId('live-wait-choice')).toBeHidden({ timeout: 15_000 });

  // Both read on to the first private step (emotion cards) and answer it together.
  const cards = (p: Page) => p.getByRole('button', { name: 'ไปต่อ', exact: true });
  for (let i = 0; i < 600 && !((await cards(a).isVisible()) && (await cards(b).isVisible())); i++) {
    if (await choicesA.isVisible()) await tap(choicesA.getByRole('button').first());
    else if (await choicesB.isVisible()) await tap(choicesB.getByRole('button').first());
    await readOn(i % 2 ? a : b);
  }
  const cardsScene = await a.getByTestId('play').getAttribute('data-scene');
  await tap(cards(a));
  await expect(a.getByTestId('live-wait-answer')).toContainText('รอ เมฆ', { timeout: 15_000 });
  await tap(cards(b));
  await expect(a.getByTestId('live-wait-answer')).toBeHidden({ timeout: 15_000 });
  await expect(b.getByTestId('live-wait-answer')).toBeHidden();
  await expect(a.getByTestId('play')).not.toHaveAttribute('data-scene', cardsScene!, { timeout: 15_000 });
  await ctxA.close();
  await ctxB.close();
});
