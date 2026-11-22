/** Test data uses fictional names only — never real people (docs/11 §1, TC-SAFE-07). */
import { createEmptySave, type SaveRoot } from '../../src/persistence/schema';

const T = '2026-11-22T10:00:00.000Z';

export function sampleSave(): SaveRoot {
  const save = createEmptySave();
  const appearance = {
    preset: 'p1',
    skin: 2,
    hairStyle: 1,
    hairColor: 3,
    outfit: 0,
    outfitColor: 4,
    accessory: 'none',
  } as const;
  save.players = {
    pl_playerA01: {
      id: 'pl_playerA01',
      kind: 'real',
      createdBy: null,
      nickname: 'ผู้เล่น A',
      sentenceEnding: '',
      addressStyle: 'เธอ',
      appearance,
      createdAt: T,
      updatedAt: T,
      pin: {
        algo: 'PBKDF2-SHA256',
        iterations: 210000,
        salt: 'c2FsdA==',
        hash: 'aGFzaA==',
        failedAttempts: 0,
      },
    },
    pl_imaginedB1: {
      id: 'pl_imaginedB1',
      kind: 'imagined',
      createdBy: 'pl_playerA01',
      nickname: 'ผู้เล่น B',
      sentenceEnding: 'นะ',
      addressStyle: 'name',
      appearance: { ...appearance, preset: 'p2' },
      createdAt: T,
      updatedAt: T,
    },
  };
  save.profiles = {
    'pl_playerA01:self': {
      key: 'pl_playerA01:self',
      ownerId: 'pl_playerA01',
      hiddenObservedCards: [],
      confirmedObserved: {},
      updatedAt: T,
      answers: {
        Q13: {
          questionId: 'Q13',
          layer: 'self',
          selected: ['q13_listen'],
          meta: null,
          status: 'answered',
          revision: 1,
          answeredAt: T,
          updatedAt: T,
        },
        Q16: {
          questionId: 'Q16',
          layer: 'self',
          selected: [],
          meta: 'not_sure',
          freeText: 'แล้วแต่วัน',
          status: 'answered',
          revision: 2,
          answeredAt: T,
          updatedAt: T,
        },
      },
    },
  };
  save.journeys = {
    jr_journey001: {
      id: 'jr_journey001',
      mode: 'solo',
      playerIds: ['pl_playerA01', 'pl_imaginedB1'],
      status: 'active',
      scenario: { insiderPlayerId: 'pl_playerA01', priorWarning: true, randomized: false, setAt: T },
      chapterProgress: {
        ch1: {
          chapterId: 'ch1',
          status: 'in_progress',
          currentSceneId: 'ch1_s02',
          lineIndex: 3,
          flags: { in_reply: 'quick' },
          choiceLog: [
            { choiceId: 'ch1_c01', optionId: 'a', byPlayerId: 'pl_playerA01', asRole: 'insider', at: T },
          ],
          skippedScenes: [],
          playCount: 1,
          startedAt: T,
        },
      },
      storyAnswers: {},
      mirrorItems: {},
      observed: [],
      nextConversation: [],
      introSeen: true,
      createdAt: T,
      updatedAt: T,
      lastPlayedAt: T,
    },
  };
  save.drafts = {
    'pl_playerA01:r1_3': { key: 'pl_playerA01:r1_3', playerId: 'pl_playerA01', text: 'ร่าง', updatedAt: T },
  };
  return save;
}
