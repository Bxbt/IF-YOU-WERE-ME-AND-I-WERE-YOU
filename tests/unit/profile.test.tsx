import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '../../src/routes';
import { useGame } from '../../src/store/game';
import { SaveRoot, createEmptySave } from '../../src/persistence/schema';
import { createPlayer, createSoloJourney, getAnswers, profileKey, saveAnswer, activeJourney } from '../../src/store/actions';
import { emptyPlayerInput } from '../../src/components/PlayerForm';
import { FULL_SET, QUICK_SET, QUESTION_BY_ID, progress, summarize } from '../../src/engine/personality';
import { QUESTIONS, DIMENSIONS } from '../../src/content/th/questions';
import { KEYS } from '../../src/persistence/storage';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  const save = createEmptySave();
  save.settings.textSpeed = 'instant';
  useGame.setState({ ready: true, save, health: 'ok', recovery: null, lastSavedAt: null });
});
afterEach(() => vi.useRealTimers());

const valid = () => expect(SaveRoot.safeParse(useGame.getState().save).success).toBe(true);

describe('question bank content (docs/03)', () => {
  it('has 36 questions, 3 per dimension, 12 quick (one per dimension)', () => {
    expect(QUESTIONS).toHaveLength(36);
    for (const d of DIMENSIONS) {
      const qs = QUESTIONS.filter((q) => q.dimension === d.id);
      expect(qs).toHaveLength(3);
      expect(qs.filter((q) => q.quick)).toHaveLength(1);
    }
  });

  it('option ids are unique, prefixed by the question, and maxSelect is satisfiable', () => {
    const ids = QUESTIONS.flatMap((q) => q.options.map((o) => o.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of QUESTIONS) {
      for (const o of q.options) expect(o.id.startsWith(`${q.id.toLowerCase()}_`)).toBe(true);
      expect(q.maxSelect).toBeLessThanOrEqual(q.options.length);
      expect(q.perceived).toContain('{other}');
    }
  });

  it('TC-SAFE-01 (questions): no forbidden judging words (docs/04 §4.2)', () => {
    const forbidden = ['toxic', 'ผิดปกติ', 'ขี้หึง', 'เย็นชา', 'เอาแต่ใจ', 'เก็บกด', 'วุฒิภาวะ', 'คะแนน', '%'];
    const text = JSON.stringify(QUESTIONS);
    for (const w of forbidden) expect(text).not.toContain(w);
  });

  it('marks q15_none and q23_enough as exclusive; Q33 lets players pick every agreement', () => {
    expect(QUESTION_BY_ID.Q15!.options.find((o) => o.id === 'q15_none')?.exclusive).toBe(true);
    expect(QUESTION_BY_ID.Q23!.options.find((o) => o.id === 'q23_enough')?.exclusive).toBe(true);
    expect(QUESTION_BY_ID.Q33!.maxSelect).toBe(QUESTION_BY_ID.Q33!.options.length);
  });
});

describe('store actions', () => {
  it('creates a solo journey with self + imagined partner and archives the previous active one', () => {
    act(() => {
      const a = createPlayer({ ...emptyPlayerInput(), nickname: 'ผู้เล่น A' }, 'real');
      const b = createPlayer({ ...emptyPlayerInput('p2'), nickname: 'ผู้เล่น B' }, 'imagined', a);
      createSoloJourney(a, b);
      createSoloJourney(a, b);
    });
    const s = useGame.getState().save;
    const journeys = Object.values(s.journeys);
    expect(journeys.filter((j) => j.status === 'active')).toHaveLength(1);
    expect(journeys.filter((j) => j.status === 'archived')).toHaveLength(1);
    expect(activeJourney(s)?.mode).toBe('solo');
    valid();
  });

  it('TC-PROF-04: revision increases only when the answer changes', () => {
    let id = '';
    act(() => {
      id = createPlayer({ ...emptyPlayerInput(), nickname: 'ผู้เล่น A' });
      saveAnswer(id, 'self', undefined, 'Q13', { selected: ['q13_hug'], meta: null, freeText: '' });
      saveAnswer(id, 'self', undefined, 'Q13', { selected: ['q13_hug'], meta: null, freeText: '' });
    });
    expect(getAnswers(useGame.getState().save, profileKey(id, 'self')).Q13!.revision).toBe(1);
    act(() => saveAnswer(id, 'self', undefined, 'Q13', { selected: ['q13_listen'], meta: null, freeText: '' }));
    expect(getAnswers(useGame.getState().save, profileKey(id, 'self')).Q13!.revision).toBe(2);
    valid();
  });

  it('skip answers are stored as status=skipped and meta answers drop selections', () => {
    let id = '';
    act(() => {
      id = createPlayer({ ...emptyPlayerInput(), nickname: 'ผู้เล่น A' });
      saveAnswer(id, 'self', undefined, 'Q01', { selected: [], meta: 'skipped', freeText: 'x' });
      saveAnswer(id, 'self', undefined, 'Q04', { selected: ['q04_face'], meta: 'depends', freeText: 'ขึ้นกับเรื่อง' });
    });
    const a = getAnswers(useGame.getState().save, profileKey(id, 'self'));
    expect(a.Q01).toMatchObject({ status: 'skipped', meta: 'skipped', selected: [] });
    expect(a.Q01!.freeText).toBeUndefined();
    expect(a.Q04).toMatchObject({ status: 'answered', selected: [], freeText: 'ขึ้นกับเรื่อง' });
    valid();
  });

  it('self and perceived answers are stored in separate profiles (docs/04 §2)', () => {
    let a = '';
    let b = '';
    act(() => {
      a = createPlayer({ ...emptyPlayerInput(), nickname: 'ผู้เล่น A' });
      b = createPlayer({ ...emptyPlayerInput('p2'), nickname: 'ผู้เล่น B' }, 'imagined', a);
      saveAnswer(a, 'self', undefined, 'Q13', { selected: ['q13_hug'], meta: null, freeText: '' });
      saveAnswer(a, 'perceived', b, 'Q13', { selected: ['q13_space'], meta: null, freeText: '' });
    });
    const s = useGame.getState().save;
    expect(getAnswers(s, `${a}:self`).Q13!.selected).toEqual(['q13_hug']);
    expect(getAnswers(s, `${a}:perceived:${b}`).Q13!.selected).toEqual(['q13_space']);
    valid();
  });
});

describe('personality engine', () => {
  it('progress counts answered/skipped and finds the first open question', () => {
    expect(progress({}, QUICK_SET)).toEqual({ answered: 0, skipped: 0, total: 12, firstOpen: 0 });
    expect(FULL_SET).toHaveLength(36);
  });

  it('summary never includes prefer_not, marks uncertain dimensions, and has no numbers', () => {
    const t = '2026-11-22T10:00:00.000Z';
    const base = { layer: 'self' as const, revision: 1, answeredAt: t, updatedAt: t, status: 'answered' as const };
    const out = summarize(
      {
        Q13: { ...base, questionId: 'Q13', selected: ['q13_listen'], meta: null },
        Q14: { ...base, questionId: 'Q14', selected: [], meta: 'prefer_not' },
        Q01: { ...base, questionId: 'Q01', selected: [], meta: 'not_sure' },
      },
      'self',
    );
    const d05 = out.find((d) => d.dimension === 'D05')!;
    expect(d05.state).toBe('has_data');
    expect(d05.statements).toHaveLength(1);
    expect(d05.statements[0]!.options).toEqual(['ฟังเงียบ ๆ ไม่ต้องแนะนำ']);
    expect(out.find((d) => d.dimension === 'D01')!.state).toBe('uncertain');
    expect(out.find((d) => d.dimension === 'D12')!.state).toBe('empty');
  });
});

describe('S3 character creation', () => {
  it('TC-PROF-01: empty nickname blocks submit with a message', async () => {
    renderAt('/players/new?mode=solo');
    await userEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
    expect(screen.getByText('ใส่ชื่อเล่นสักชื่อนะ')).toBeInTheDocument();
    expect(screen.getByLabelText(/ชื่อเล่น/)).toHaveAttribute('aria-invalid', 'true');
    expect(Object.keys(useGame.getState().save.players)).toHaveLength(0);
  });

  it('solo flow creates self, imagined partner and journey, then offers the questionnaire', async () => {
    const router = renderAt('/players/new?mode=solo');
    await userEvent.type(screen.getByLabelText(/ชื่อเล่น/), 'ผู้เล่น A');
    await userEvent.click(screen.getByRole('button', { name: 'ค่ะ' }));
    await userEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ผู้เล่น A');
    expect(screen.getByText('สิ่งที่คุณจินตนาการ')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/ชื่อเล่น/), 'ผู้เล่น B');
    await userEvent.click(screen.getByRole('button', { name: 'ใส่' }));
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));

    expect(router.state.location.pathname).toBe('/profile');
    const s = useGame.getState().save;
    const players = Object.values(s.players);
    expect(players.map((p) => [p.nickname, p.kind])).toEqual([['ผู้เล่น A', 'real'], ['ผู้เล่น B', 'imagined']]);
    expect(players[0]!.sentenceEnding).toBe('ค่ะ'); // TC-PROF-03 (stored; rendered in dialogue from M4)
    expect(players[1]!.appearance.accessory).toBe('glasses');
    expect(activeJourney(s)?.playerIds).toEqual(players.map((p) => p.id));
    expect(screen.getByText(/ตอบคำถามเกี่ยวกับตัวเองตอนนี้ไหม/)).toBeInTheDocument();
    expect(localStorage.getItem(KEYS.save)).toContain('ผู้เล่น B');
    valid();
  });

  it('TC-PROF-02 / 06: editing name and appearance updates the hub', async () => {
    let id = '';
    act(() => {
      id = createPlayer({ ...emptyPlayerInput(), nickname: 'ชื่อเดิม' });
    });
    const router = renderAt(`/players/${id}/edit`);
    const name = screen.getByLabelText(/ชื่อเล่น/);
    await userEvent.clear(name);
    await userEvent.type(name, 'ชื่อใหม่');
    await userEvent.click(screen.getByRole('button', { name: 'ยาว' }));
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));
    expect(router.state.location.pathname).toBe('/profile');
    expect(screen.getByRole('heading', { name: 'ชื่อใหม่' })).toBeInTheDocument();
    expect(useGame.getState().save.players[id]!.appearance.hairStyle).toBe(2);
  });
});

describe('S4 questionnaire', () => {
  function setup() {
    let id = '';
    act(() => {
      id = createPlayer({ ...emptyPlayerInput(), nickname: 'ผู้เล่น A' });
    });
    return id;
  }

  it('TC-SKIP-01/02: next is disabled until an option, meta or free text is given', async () => {
    const id = setup();
    renderAt(`/profile/${id}/self?set=quick`);
    const next = screen.getByRole('button', { name: /ถัดไป/ });
    expect(next).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่มคำอธิบาย' }));
    await userEvent.type(screen.getByRole('textbox'), 'ตอบเอง');
    expect(next).toBeEnabled();
    await userEvent.click(next);
    expect(getAnswers(useGame.getState().save, profileKey(id, 'self')).Q01).toMatchObject({ selected: [], meta: null, freeText: 'ตอบเอง' });
    expect(screen.getByText('ข้อ 2 จาก 12')).toBeInTheDocument();
  });

  it('TC-SKIP-05: skipping all 12 shows the summary and returns to skipped questions', async () => {
    const id = setup();
    renderAt(`/profile/${id}/self?set=quick`);
    for (let i = 0; i < 12; i++) {
      await userEvent.click(screen.getByRole('button', { name: 'ข้าม' }));
      await userEvent.click(screen.getByRole('button', { name: i === 11 ? /เสร็จแล้ว/ : /ถัดไป/ }));
    }
    expect(screen.getByRole('status')).toHaveTextContent('ตอบแล้ว 0 ข้อ · ข้าม 12 ข้อ');
    await userEvent.click(screen.getByRole('button', { name: 'กลับไปตอบข้อที่ข้าม' }));
    expect(screen.getByText('ข้อ 1 จาก 12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ข้าม' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('TC-RES-02: reopening resumes at the first unanswered question', async () => {
    const id = setup();
    act(() => {
      for (const q of QUICK_SET.slice(0, 6)) saveAnswer(id, 'self', undefined, q, { selected: [], meta: 'not_sure', freeText: '' });
    });
    renderAt(`/profile/${id}/self?set=quick`);
    expect(screen.getByText('ข้อ 7 จาก 12')).toBeInTheDocument();
  });

  it('perceived questions name the partner and carry the assumption tag', async () => {
    let a = '';
    let b = '';
    act(() => {
      a = createPlayer({ ...emptyPlayerInput(), nickname: 'ผู้เล่น A' });
      b = createPlayer({ ...emptyPlayerInput('p2'), nickname: 'ผู้เล่น B' }, 'imagined', a);
    });
    renderAt(`/profile/${a}/perceived/${b}?set=quick`);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ผู้เล่น B');
    expect(screen.getByText('สิ่งที่คุณคิด')).toBeInTheDocument();
  });

  it('Q33 shows the safety note with a link to support resources', () => {
    const id = setup();
    renderAt(`/profile/${id}/self?set=full&q=Q33`);
    expect(screen.getByText(/ไม่ใช่เรื่องของความชอบ/)).toBeInTheDocument();
  });

  it('TC-PROF-05: delete in edit mode can be undone; otherwise it is removed after 5 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const id = setup();
    act(() => saveAnswer(id, 'self', undefined, 'Q13', { selected: ['q13_hug'], meta: null, freeText: '' }));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const router = renderAt(`/profile/${id}/self?set=full&q=Q13&single=1`);
    await user.click(screen.getByRole('button', { name: /ลบคำตอบนี้/ }));
    expect(router.state.location.pathname).toBe(`/profile/${id}/self/answers`);
    const row = screen.getByText(/อยากให้คนรักปลอบแบบไหน/).closest('li')!;
    expect(within(row).getByText('ยังไม่ได้ตอบ')).toBeInTheDocument();
    // still stored until the undo window ends
    expect(getAnswers(useGame.getState().save, profileKey(id, 'self')).Q13).toBeDefined();
    act(() => vi.advanceTimersByTime(5100));
    expect(getAnswers(useGame.getState().save, profileKey(id, 'self')).Q13).toBeUndefined();
  });
});
