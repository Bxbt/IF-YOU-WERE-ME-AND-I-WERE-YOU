/** M16 — storyline 2 "อีกด้านของเรื่อง" (TC-OS-02/03/06). Fictional names only. */
import { describe, expect, it } from 'vitest';
import { sampleSave } from '../fixtures/factory';
import { SaveRoot } from '../../src/persistence/schema';
import {
  buildStoryState,
  controllerFor,
  emptyProgress,
  playerForRole,
  roleView,
  setTeller,
  storylineOf,
  tellerResetsProgress,
} from '../../src/store/story';
import { chaptersOf } from '../../src/content/th/chapters';

const J = 'jr_journey001';
const A = 'pl_playerA01';
const B = 'pl_imaginedB1';

describe('storyline 2', () => {
  it('lists six chapters on its own tab; the main tab is unchanged', () => {
    expect(chaptersOf('main').map((c) => c.id)).toEqual(['ch1', 'ch2', 'ch3', 'ch4', 'ch5']);
    expect(chaptersOf('other').map((c) => c.id)).toEqual(['os1', 'os2', 'os3', 'os4', 'os5', 'os6']);
    expect(chaptersOf('other').every((c) => c.needsTeller && !c.needsScenario && c.load)).toBe(true);
    expect(storylineOf('os3')).toBe('other');
    expect(storylineOf('ch3')).toBe('main');
  });

  it('the teller holds the insider role in os*, the scenario keeps it in ch* (roleView)', () => {
    const s = setTeller(sampleSave(), J, { tellerPlayerId: B, randomized: false });
    const j = s.journeys[J]!;
    expect(playerForRole(roleView(j, 'os1'), 'insider')).toBe(B);
    expect(playerForRole(roleView(j, 'os1'), 'waiter')).toBe(A);
    expect(playerForRole(roleView(j, 'ch1'), 'insider')).toBe(A); // scenario untouched
    expect(roleView(j, 'ch1')).toBe(j);
    expect(controllerFor({ ...roleView(j, 'os2'), mode: 'together' }, 'os2', 'insider')).toBe(B);
  });

  it('TC-OS-02: flags of the two storylines never mix', () => {
    const s = sampleSave();
    const j = s.journeys[J]!;
    j.chapterProgress.os1 = { ...emptyProgress('os1'), flags: { os_greet: 'tired' } };
    expect(buildStoryState(j, 'ch2').flags).toEqual({ in_reply: 'quick' });
    expect(buildStoryState(j, 'os2').flags).toEqual({ os_greet: 'tired' });
  });

  it('TC-OS-03: changing the teller resets os1–os6 only', () => {
    let s = setTeller(sampleSave(), J, { tellerPlayerId: A, randomized: false });
    s.journeys[J]!.chapterProgress.os1 = {
      ...emptyProgress('os1'),
      status: 'completed',
      flags: { os_greet: 'ask' },
      playCount: 1,
    };
    s.journeys[J]!.storyAnswers['pl_playerA01:ro1_2'] = {
      key: 'pl_playerA01:ro1_2',
      playerId: A,
      itemId: 'ro1_2',
      kind: 'reflection',
      layer: 'self',
      selected: [],
      meta: null,
      freeText: 'เรื่องสมมติ',
      updatedAt: '2026-11-23T00:00:00.000Z',
    };
    expect(tellerResetsProgress(s.journeys[J]!)).toBe(true);
    s = setTeller(s, J, { tellerPlayerId: B, randomized: false });
    const j = s.journeys[J]!;
    expect(j.chapterProgress.os1).toMatchObject({ status: 'not_started', flags: {}, playCount: 1 });
    expect(j.chapterProgress.ch1?.status).toBe('in_progress');
    expect(j.storyAnswers['pl_playerA01:ro1_2']?.freeText).toBe('เรื่องสมมติ');
  });

  it('TC-OS-06: saves without otherSide still load; new chapter ids validate', () => {
    expect(SaveRoot.safeParse(sampleSave()).success).toBe(true);
    const s = setTeller(sampleSave(), J, { tellerPlayerId: A, randomized: true });
    s.journeys[J]!.chapterProgress.os6 = emptyProgress('os6');
    expect(SaveRoot.safeParse(s).success).toBe(true);
  });
});
