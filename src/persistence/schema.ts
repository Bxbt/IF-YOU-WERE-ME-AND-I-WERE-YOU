/**
 * Save data schema — single source for runtime validation and TypeScript types.
 * Mirrors docs/07-data-architecture.md (schemaVersion 1.0.0).
 * Types are derived with z.infer so the schema and the types cannot drift apart.
 */
import { z } from 'zod';

export const SCHEMA_VERSION = '1.0.0';

const isoDate = z.string().datetime({ offset: true });
const playerId = z.string().regex(/^pl_[A-Za-z0-9_-]{6,}$/);
const journeyId = z.string().regex(/^jr_[A-Za-z0-9_-]{6,}$/);

export const DimensionId = z.enum([
  'D01',
  'D02',
  'D03',
  'D04',
  'D05',
  'D06',
  'D07',
  'D08',
  'D09',
  'D10',
  'D11',
  'D12',
]);
export const ChapterId = z.enum(['ch1', 'ch2', 'ch3', 'ch4', 'ch5']);
export const Role = z.enum(['insider', 'waiter']);
export const Layer = z.enum(['self', 'perceived']);
export const Mode = z.enum(['solo', 'together', 'remote_sealed', 'remote_online']);
export const Meta = z.enum(['depends', 'not_sure', 'prefer_not', 'skipped']).nullable();

// ---------- Player (§3) ----------

export const Appearance = z.object({
  preset: z.enum(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']),
  skin: z.number().int().min(0).max(5),
  hairStyle: z.number().int().min(0).max(4),
  hairColor: z.number().int().min(0).max(9),
  outfit: z.number().int().min(0).max(2),
  outfitColor: z.number().int().min(0).max(8),
  accessory: z.enum(['none', 'glasses']),
  /** Absent = long (older saves). docs/07 §3. */
  legs: z.enum(['long', 'short']).optional(),
});

export const PinRecord = z.object({
  algo: z.literal('PBKDF2-SHA256'),
  iterations: z.number().int().positive(),
  salt: z.string(),
  hash: z.string(),
  failedAttempts: z.number().int().min(0),
  lockedUntil: isoDate.optional(),
});

export const Player = z.object({
  id: playerId,
  kind: z.enum(['real', 'imagined']),
  createdBy: playerId.nullable(),
  nickname: z.string().trim().min(1).max(20),
  sentenceEnding: z.enum(['', 'ครับ', 'ค่ะ', 'นะ']),
  addressStyle: z.enum(['เธอ', 'ตัวเอง', 'name']),
  pronouns: z.string().max(20).optional(),
  bio: z.string().max(140).optional(),
  appearance: Appearance,
  pin: PinRecord.optional(),
  remoteUserId: z.string().optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

// ---------- Answers (§4) ----------

export const PersonalityAnswer = z
  .object({
    questionId: z.string().min(1),
    layer: Layer,
    selected: z.array(z.string().min(1)),
    meta: Meta,
    freeText: z.string().max(280).optional(),
    status: z.enum(['answered', 'skipped']),
    revision: z.number().int().min(1),
    answeredAt: isoDate,
    updatedAt: isoDate,
  })
  .superRefine((a, ctx) => {
    if (a.meta !== null && a.selected.length > 0) {
      ctx.addIssue({ code: 'custom', message: 'meta answers must not have selected options' });
    }
    if (a.meta === 'skipped' && (a.status !== 'skipped' || a.freeText)) {
      ctx.addIssue({ code: 'custom', message: 'skipped answers must have status=skipped and no freeText' });
    }
    if (a.status === 'skipped' && a.meta !== 'skipped') {
      ctx.addIssue({ code: 'custom', message: 'status=skipped requires meta=skipped' });
    }
  });

export const PlayerProfile = z.object({
  key: z.string().regex(/^pl_[A-Za-z0-9_-]+:self$/),
  ownerId: playerId,
  answers: z.record(PersonalityAnswer),
  hiddenObservedCards: z.array(z.string()),
  confirmedObserved: z.record(z.boolean()),
  updatedAt: isoDate,
});

export const PerceivedPartnerProfile = z.object({
  key: z.string().regex(/^pl_[A-Za-z0-9_-]+:perceived:pl_[A-Za-z0-9_-]+$/),
  ownerId: playerId,
  aboutId: playerId,
  answers: z.record(PersonalityAnswer),
  updatedAt: isoDate,
});

export const Profile = z.union([PlayerProfile, PerceivedPartnerProfile]);

// ---------- Journey (§5–§7) ----------

export const ScenarioConfig = z.object({
  insiderPlayerId: playerId,
  priorWarning: z.boolean(),
  randomized: z.boolean(),
  setAt: isoDate,
});

export const ChapterProgress = z.object({
  chapterId: ChapterId,
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']),
  currentSceneId: z.string().optional(),
  lineIndex: z.number().int().min(0).optional(),
  flags: z.record(z.string()),
  choiceLog: z.array(
    z.object({
      choiceId: z.string(),
      optionId: z.string(),
      byPlayerId: playerId,
      asRole: z.union([Role, z.literal('self')]),
      at: isoDate,
    }),
  ),
  skippedScenes: z.array(z.string()),
  revealMode: z.enum(['per_question', 'end_of_chapter']).optional(),
  pendingPrivateSteps: z.array(z.object({ itemId: z.string(), playerIds: z.array(playerId) })).optional(),
  startedAt: isoDate.optional(),
  completedAt: isoDate.optional(),
  playCount: z.number().int().min(0),
  /** Phase 3C: bumped on every local position change; the higher one wins a merge (docs/10 §10.3). */
  syncSeq: z.number().int().min(0).optional(),
});

export const StoryAnswer = z.object({
  key: z.string(),
  playerId,
  itemId: z.string(),
  kind: z.enum(['reflection', 'interpretation', 'emotion_card']),
  layer: Layer,
  selected: z.array(z.string()),
  interpretation: z.record(z.enum(['yes', 'no', 'unsure'])).optional(),
  meta: Meta,
  freeText: z.string().max(280).optional(),
  updatedAt: isoDate,
});

const SharedEntry = z.object({
  self: PersonalityAnswer.optional(),
  perceived: PersonalityAnswer.optional(),
  statement: z.object({ text: z.string().max(280), starterId: z.string().optional(), meta: Meta }).optional(),
  shareIntent: z.boolean().optional(),
  submittedAt: isoDate.optional(),
  consent: z.boolean(),
  consentAt: isoDate.optional(),
});

export const SharedAnswer = z.object({
  key: z.string(),
  questionId: z.string(),
  kind: z.enum(['mirror', 'statement', 'profile']),
  context: z.enum(['self', 'role']),
  state: z.enum(['open', 'partial', 'awaiting_consent', 'revealed', 'skipped']),
  entries: z.record(SharedEntry),
  revealedAt: isoDate.optional(),
  revealedRevision: z.record(z.number().int()).optional(),
});

export const ObservedSignal = z.object({
  dimension: DimensionId,
  signal: z.string(),
  sourceChoiceId: z.string(),
  playerId,
  at: isoDate,
});

export const NextConversationItem = z.object({
  id: z.string(),
  ownerId: playerId,
  text: z.string().max(200),
  source: z.enum(['comparison', 'mirror', 'reflection', 'manual']),
  sourceRef: z.string().optional(),
  done: z.boolean(),
  createdAt: isoDate,
});

export const RemoteLink = z.object({
  kind: z.enum(['sealed', 'online']),
  myRevealKey: z.string().optional(),
  partnerSealed: z
    .object({ questionIds: z.array(z.string()), ciphertext: z.string(), iv: z.string(), importedAt: isoDate })
    .optional(),
  sessionId: z.string().optional(),
  role: z.enum(['owner', 'member']).optional(),
  inviteExpiresAt: isoDate.optional(),
  pendingUploads: z.array(z.string()).optional(),
  // Phase 3C Live (docs/10 §10.3) — this device's link to the room; never sent to the partner.
  liveSlot: z.union([z.literal(0), z.literal(1)]).optional(),
  liveKey: z.string().optional(),
  liveToken: z.string().optional(),
  localPlayerId: playerId.optional(),
});

export const GameSession = z.object({
  id: journeyId,
  mode: Mode,
  playerIds: z.tuple([playerId, playerId]),
  status: z.enum(['active', 'completed', 'archived']),
  scenario: ScenarioConfig.optional(),
  chapterProgress: z.record(ChapterProgress),
  storyAnswers: z.record(StoryAnswer),
  mirrorItems: z.record(SharedAnswer),
  observed: z.array(ObservedSignal),
  nextConversation: z.array(NextConversationItem),
  introSeen: z.boolean(),
  remote: RemoteLink.optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
  lastPlayedAt: isoDate,
});

// ---------- Report, Settings, Drafts, Memories (§8–§9) ----------

export const ReportSnapshot = z.object({
  id: z.string(),
  journeyId,
  ownerId: playerId,
  generatedAt: isoDate,
  selectedItemIds: z.array(z.string()),
  format: z.enum(['txt', 'json', 'png']),
});

export const Settings = z.object({
  fontScale: z.union([z.literal(1), z.literal(1.15), z.literal(1.3)]),
  textSpeed: z.enum(['slow', 'normal', 'fast', 'instant']),
  reducedMotion: z.enum(['system', 'on', 'off']),
  sound: z.object({ enabled: z.boolean(), volume: z.number().min(0).max(1) }),
  lastJourneyId: journeyId.optional(),
});

export const Draft = z
  .object({ key: z.string(), playerId, text: z.string().max(500), updatedAt: isoDate })
  .refine((d) => d.key.startsWith(`${d.playerId}:`), { message: 'draft key must start with playerId' });

const choiceSet = z.object({ selected: z.array(z.string()), freeText: z.string().max(280).optional() });

export const MemoryScene = z.object({
  id: z.string(),
  ownerId: playerId,
  journeyId: journeyId.optional(),
  category: z.enum(['disagreement', 'happy', 'misunderstood', 'supported', 'unresolved', 'meaningful']),
  title: z.string().max(60),
  whatHappened: z.string().max(500),
  myFeelings: choiceSet,
  myNeeds: choiceSet,
  partnerFeelingsGuess: choiceSet,
  background: z.string(),
  shareIntent: z.boolean(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

// ---------- Root ----------

export const SaveRoot = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    settings: Settings,
    players: z.record(Player),
    profiles: z.record(Profile),
    journeys: z.record(GameSession),
    reports: z.record(ReportSnapshot),
    memories: z.record(MemoryScene),
    drafts: z.record(Draft),
  })
  .superRefine((root, ctx) => {
    const active = Object.values(root.journeys).filter((j) => j.status === 'active');
    // MVP rule (docs/07 §1, A-23): at most one active journey.
    if (active.length > 1) {
      ctx.addIssue({ code: 'custom', message: 'only one active journey is allowed', path: ['journeys'] });
    }
    for (const [id, j] of Object.entries(root.journeys)) {
      if (j.id !== id)
        ctx.addIssue({ code: 'custom', message: 'journey key mismatch', path: ['journeys', id] });
      for (const pid of j.playerIds) {
        if (!root.players[pid]) {
          ctx.addIssue({
            code: 'custom',
            message: `unknown player ${pid}`,
            path: ['journeys', id, 'playerIds'],
          });
        }
      }
    }
    for (const [id, p] of Object.entries(root.players)) {
      if (p.id !== id)
        ctx.addIssue({ code: 'custom', message: 'player key mismatch', path: ['players', id] });
    }
  });

export type SaveRoot = z.infer<typeof SaveRoot>;
export type Settings = z.infer<typeof Settings>;
export type Player = z.infer<typeof Player>;
export type GameSession = z.infer<typeof GameSession>;
export type PersonalityAnswer = z.infer<typeof PersonalityAnswer>;
export type SharedAnswer = z.infer<typeof SharedAnswer>;

export const DEFAULT_SETTINGS: Settings = {
  fontScale: 1,
  textSpeed: 'normal',
  reducedMotion: 'system',
  // On by default (owner decision 2026-11-23). Browsers still keep audio silent until the
  // player's first tap or key press, so nothing plays the instant the page opens.
  sound: { enabled: true, volume: 0.6 },
};

export function createEmptySave(): SaveRoot {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS, sound: { ...DEFAULT_SETTINGS.sound } },
    players: {},
    profiles: {},
    journeys: {},
    reports: {},
    memories: {},
    drafts: {},
  };
}
