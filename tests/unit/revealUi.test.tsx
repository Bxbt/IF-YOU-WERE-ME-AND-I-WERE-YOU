/**
 * M10 wiring: Together store actions, RevealPanel, Together comparison and report ownership.
 * The engine itself is covered in reveal.test.ts. Fictional names only.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEmptySave, SaveRoot, type GameSession } from '../../src/persistence/schema';
import { useGame } from '../../src/store/game';
import { useSession } from '../../src/store/session';
import { consentItems, submitTogetherMirror, submitTogetherStatement } from '../../src/store/story';
import { RevealPanel } from '../../src/components/Reveal';
import { compareTogether } from '../../src/engine/compare';
import { buildReport } from '../../src/engine/report';
import { compareSolo } from '../../src/engine/compare';
import { MIRRORS } from '../../src/content/th/questions';
import { createPinRecord, type PinRecord } from '../../src/lib/pin';

const T = '2026-11-22T10:00:00.000Z';
const A = 'pl_dao0000001';
const B = 'pl_mek0000001';
const J = 'jr_together01';
const names = { [A]: 'ดาว', [B]: 'เมฆ' };
const q = (id: string) => MIRRORS.find((m) => m.id === id);
const ans = (selected: string[], meta: null | 'prefer_not' | 'not_sure' = null) => ({ selected, meta, freeText: '' });

function base(): SaveRoot {
  const s = createEmptySave();
  const appearance = { preset: 'p1', skin: 1, hairStyle: 0, hairColor: 1, outfit: 0, outfitColor: 2, accessory: 'none' } as const;
  for (const [id, nickname] of [[A, 'ดาว'], [B, 'เมฆ']] as const) {
    s.players[id] = { id, kind: 'real', createdBy: null, nickname, sentenceEnding: '', addressStyle: 'เธอ', appearance, createdAt: T, updatedAt: T };
  }
  s.journeys[J] = {
    id: J, mode: 'together', playerIds: [A, B], status: 'active',
    scenario: { insiderPlayerId: A, priorWarning: true, randomized: false, setAt: T },
    chapterProgress: {}, storyAnswers: {}, mirrorItems: {}, observed: [], nextConversation: [],
    introSeen: true, createdAt: T, updatedAt: T, lastPlayedAt: T,
  };
  return s;
}

function answerBoth(s: SaveRoot, qid: string, aSelf: string[], aGuess: string[], bSelf: string[], bGuess: string[], ctx: 'self' | 'role' = 'self') {
  s = submitTogetherMirror(s, J, qid, ctx, A, 'self', ans(aSelf));
  s = submitTogetherMirror(s, J, qid, ctx, A, 'perceived', ans(aGuess));
  s = submitTogetherMirror(s, J, qid, ctx, B, 'self', ans(bSelf));
  s = submitTogetherMirror(s, J, qid, ctx, B, 'perceived', ans(bGuess));
  return s;
}
const j = (s: SaveRoot): GameSession => s.journeys[J]!;

beforeEach(() => {
  useSession.getState().lock();
});

describe('Together store actions', () => {
  it('mirror goes open → partial → awaiting_consent → revealed and stays schema-valid', () => {
    let s = base();
    s = submitTogetherMirror(s, J, 'M01', 'self', A, 'self', ans(['m01_hug']));
    expect(j(s).mirrorItems.M01!.state).toBe('partial');
    s = answerBoth(s, 'M01', ['m01_hug'], ['m01_listen'], ['m01_listen'], ['m01_hug']);
    expect(j(s).mirrorItems.M01!.state).toBe('awaiting_consent');
    s = consentItems(s, J, ['M01'], A, true);
    expect(j(s).mirrorItems.M01!.state).toBe('awaiting_consent');
    s = consentItems(s, J, ['M01'], B, true);
    expect(j(s).mirrorItems.M01!.state).toBe('revealed');
    expect(SaveRoot.safeParse(s).success).toBe(true);
  });

  it('TC-REV-07: group consent with an exclusion leaves that item closed', () => {
    let s = base();
    for (const id of ['M01', 'M02', 'M03']) s = answerBoth(s, id, [`${id.toLowerCase()}_x`], [], [`${id.toLowerCase()}_x`], []);
    s = consentItems(s, J, ['M01', 'M02', 'M03'], A, true, ['M03']);
    s = consentItems(s, J, ['M01', 'M02', 'M03'], B, true);
    expect(j(s).mirrorItems.M01!.state).toBe('revealed');
    expect(j(s).mirrorItems.M02!.state).toBe('revealed');
    expect(j(s).mirrorItems.M03!.state).toBe('awaiting_consent');
  });

  it('statements use the engine: only shared ones of each player are visible after reveal', () => {
    let s = base();
    s = submitTogetherStatement(s, J, A, 'cs1', { text: 'ความลับ', skipped: false, shareIntent: false });
    s = submitTogetherStatement(s, J, B, 'cs1', { text: 'แชร์นะ', skipped: false, shareIntent: true });
    expect(j(s).mirrorItems.cs1!.state).toBe('awaiting_consent');
    expect(SaveRoot.safeParse(s).success).toBe(true);
  });
});

describe('RevealPanel (shared screen)', () => {
  function mount(s: SaveRoot, keys: string[], mode: 'single' | 'group' | 'statements' = 'single') {
    useGame.setState({ ready: true, save: s, health: 'ok', recovery: null, lastSavedAt: null });
    const onDone = vi.fn();
    render(
      <RevealPanel journey={j(s)} ch="ch4" keys={keys} mode={mode} names={names} questionFor={q} onDone={onDone} />,
    );
    return onDone;
  }

  it('TC-PRIV-01/R1: shows no answer until both consent, then shows both views', async () => {
    const s = answerBoth(base(), 'M01', ['m01_hug'], ['m01_listen'], ['m01_space'], ['m01_hug']);
    const user = userEvent.setup();
    mount(s, ['M01']);
    const panel = screen.getByTestId('reveal-panel');
    for (const text of ['อ้อมกอด', 'คนที่ฟัง', 'เวลาเงียบ ๆ']) expect(panel).not.toHaveTextContent(text);
    expect(panel).toHaveTextContent('เมื่อเปิดแล้ว เมฆ จะได้เห็นคำตอบนี้');
    await user.click(screen.getByRole('button', { name: 'ดาว: เปิดได้' }));
    expect(screen.getByTestId(`consent-status-${A}`)).toHaveTextContent('ดาว ยินยอมแล้ว');
    expect(panel).not.toHaveTextContent('อ้อมกอด');
    await user.click(screen.getByRole('button', { name: 'เมฆ: เปิดได้' }));
    const result = await screen.findByTestId('reveal-result-M01');
    expect(within(result).getByText('สิ่งที่ ดาว บอก')).toBeInTheDocument();
    expect(within(result).getByText('สิ่งที่ เมฆ คิดว่า ดาว ตอบ')).toBeInTheDocument();
    expect(result).toHaveTextContent('อ้อมกอด');
  });

  it('TC-REV-04: consent can be withdrawn before reveal', async () => {
    const s = answerBoth(base(), 'M01', ['m01_hug'], [], ['m01_hug'], []);
    const user = userEvent.setup();
    mount(s, ['M01']);
    await user.click(screen.getByRole('button', { name: 'ดาว: เปิดได้' }));
    await user.click(screen.getByRole('button', { name: 'ดาว: ถอนการยินยอม' }));
    await user.click(screen.getByRole('button', { name: 'เมฆ: เปิดได้' }));
    expect(useGame.getState().save.journeys[J]!.mirrorItems.M01!.state).toBe('awaiting_consent');
  });

  it('"เก็บไว้ก่อน" moves on without revealing', async () => {
    const s = answerBoth(base(), 'M01', ['m01_hug'], [], ['m01_hug'], []);
    const user = userEvent.setup();
    const onDone = mount(s, ['M01']);
    await user.click(screen.getByRole('button', { name: 'เก็บไว้ก่อน แล้วไปต่อ' }));
    expect(onDone).toHaveBeenCalled();
    expect(useGame.getState().save.journeys[J]!.mirrorItems.M01!.state).toBe('awaiting_consent');
  });

  it('TC-PRIV-09: prefer_not shows only the marker after reveal', async () => {
    let s = base();
    s = submitTogetherMirror(s, J, 'M01', 'self', A, 'self', ans([], 'prefer_not'));
    s = submitTogetherMirror(s, J, 'M01', 'self', A, 'perceived', ans([], 'prefer_not'));
    s = submitTogetherMirror(s, J, 'M01', 'self', B, 'self', ans(['m01_hug']));
    const user = userEvent.setup();
    mount(s, ['M01']);
    await user.click(screen.getByRole('button', { name: 'ดาว: เปิดได้' }));
    await user.click(screen.getByRole('button', { name: 'เมฆ: เปิดได้' }));
    expect(await screen.findByText('ดาว เลือกไม่ตอบข้อนี้')).toBeInTheDocument();
  });

  it('TC-REV-10: no right/wrong colours, ticks or numbers in the result', async () => {
    const s = answerBoth(base(), 'M01', ['m01_hug'], ['m01_space'], ['m01_listen'], ['m01_hug']);
    const user = userEvent.setup();
    mount(s, ['M01']);
    await user.click(screen.getByRole('button', { name: 'ดาว: เปิดได้' }));
    await user.click(screen.getByRole('button', { name: 'เมฆ: เปิดได้' }));
    const result = await screen.findByTestId('reveal-result-M01');
    expect(result.innerHTML).not.toMatch(/green|red-|text-danger|bg-danger/);
    expect(result.textContent).not.toMatch(/\d+\s*(ข้อ|%)/);
  });

  it('TC-REV-08: statements — each sees only what the other chose to share', async () => {
    let s = base();
    s = submitTogetherStatement(s, J, A, 'cs1', { text: 'ข้อของดาวที่เก็บไว้', skipped: false, shareIntent: false });
    s = submitTogetherStatement(s, J, A, 'cs2', { text: 'ข้อของดาวที่แชร์', skipped: false, shareIntent: true });
    s = submitTogetherStatement(s, J, B, 'cs1', { text: 'ข้อของเมฆที่แชร์', skipped: false, shareIntent: true });
    s = submitTogetherStatement(s, J, B, 'cs2', { text: '', skipped: true, shareIntent: false });
    const user = userEvent.setup();
    mount(s, ['cs1', 'cs2'], 'statements');
    await user.click(screen.getByRole('button', { name: 'ดาว: เปิดได้' }));
    await user.click(screen.getByRole('button', { name: 'เมฆ: เปิดได้' }));
    const dao = await screen.findByTestId(`statements-${A}`);
    expect(dao).toHaveTextContent('ข้อของดาวที่แชร์');
    expect(dao).not.toHaveTextContent('ข้อของดาวที่เก็บไว้');
    expect(screen.getByTestId(`statements-${B}`)).toHaveTextContent('ข้อของเมฆที่แชร์');
  });

  it('a player with a PIN passes the PIN gate before consenting', async () => {
    const pin: PinRecord = await createPinRecord('2580', 1000);
    const s = answerBoth(base(), 'M01', ['m01_hug'], [], ['m01_hug'], []);
    s.players[A]!.pin = pin;
    const user = userEvent.setup();
    mount(s, ['M01']);
    await user.click(screen.getByRole('button', { name: 'ดาว: เปิดได้' }));
    expect(screen.getByRole('dialog', { name: /ใส่ PIN ของ ดาว/ })).toBeInTheDocument();
    expect(useGame.getState().save.journeys[J]!.mirrorItems.M01!.entries[A]!.consent).toBe(false);
    for (const d of '2580') await user.click(screen.getByRole('button', { name: `เลข ${d}` }));
    await user.click(screen.getByRole('button', { name: 'ยืนยัน PIN' }));
    await waitFor(() => expect(useGame.getState().save.journeys[J]!.mirrorItems.M01!.entries[A]!.consent).toBe(true));
  });
});

describe('Together comparison and report', () => {

  it('uses only revealed mirror items; pending lists ids only; W3 never counted', () => {
    let s = answerBoth(base(), 'M01', ['m01_hug'], ['m01_listen'], ['m01_space'], ['m01_hug']);
    s = answerBoth(s, 'M02', ['m02_words'], [], ['m02_words'], []);
    s = answerBoth(s, 'w3_1', ['x'], [], ['x'], [], 'role');
    s = consentItems(s, J, ['M01', 'w3_1'], A, true);
    s = consentItems(s, J, ['M01', 'w3_1'], B, true);
    const c = compareTogether(j(s));
    expect(c.pending).toEqual(['M02']);
    const all = [...c.similar, ...c.different, ...c.ask];
    expect(all.every((i) => i.question.id === 'M01')).toBe(true);
    expect(c.similar.some((i) => i.view === 'a_view')).toBe(true); // B guessed A's hug
    expect(c.different.some((i) => i.view === 'direct')).toBe(true);
  });

  it('report of player B uses B’s own data, never A’s (privacy regression)', () => {
    let s = base();
    s.profiles[`${A}:self`] = {
      key: `${A}:self`, ownerId: A, hiddenObservedCards: [], confirmedObserved: {}, updatedAt: T,
      answers: { Q13: { questionId: 'Q13', layer: 'self', selected: ['q13_hug'], meta: null, freeText: 'ความลับของดาว', status: 'answered', revision: 1, answeredAt: T, updatedAt: T } },
    };
    s = answerBoth(s, 'M01', ['m01_hug'], [], ['m01_space'], []);
    const report = buildReport(s, j(s), B, compareSolo(s, j(s), B));
    const text = JSON.stringify(report);
    expect(text).not.toContain('ความลับของดาว');
    expect(text).not.toContain('อ้อมกอด'); // A's unrevealed M01 answer
  });

  it('report differences list only revealed differences, marked as partner data', () => {
    let s = answerBoth(base(), 'M01', ['m01_hug'], [], ['m01_space'], []);
    s = consentItems(s, J, ['M01'], A, true);
    s = consentItems(s, J, ['M01'], B, true);
    const report = buildReport(s, j(s), A, compareSolo(s, j(s), A));
    const diff = report.find((r) => r.id === 'differences')!;
    const items = diff.groups.flatMap((g) => g.items);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.source === 'partner_revealed' && !i.preselect)).toBe(true);
  });
});
