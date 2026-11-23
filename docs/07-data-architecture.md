# 07 — Data Architecture

> เจ้าของข้อมูล: Data Schema, Storage, Export/Import, Migration
> Schema Version ปัจจุบัน: **`1.0.0`** (SemVer: MAJOR = ไม่เข้ากันย้อนหลัง, MINOR = เพิ่มฟิลด์ที่มีค่าเริ่มต้น, PATCH = แก้ไขที่ไม่กระทบโครงสร้าง)

---

## 1. ภาพรวม

```
SaveRoot (localStorage)
├── schemaVersion
├── settings: Settings
├── players: Record<PlayerId, Player>                       (global)
├── profiles: Record<ProfileKey, PlayerProfile | PerceivedPartnerProfile>   (global)
├── journeys: Record<JourneyId, GameSession>                (ทุกอย่างข้างใต้ = ต่อ Journey)
│   ├── scenario
│   ├── chapterProgress: Record<ChapterId, ChapterProgress>
│   ├── storyAnswers (Reflection / Interpretation / Statements)
│   ├── mirrorItems: Record<MirrorKey, SharedAnswer>
│   ├── observed: ObservedSignal[]   (Phase 2 — MVP ว่างเสมอ)
│   └── nextConversation: NextConversationItem[]
├── reports: Record<ReportId, ReflectionReport>   (snapshot เฉพาะเมื่อส่งออก)
├── memories: Record<MemoryId, MemoryScene>       (Phase 2)
└── drafts: Record<DraftKey, Draft>
```

ขอบเขต Global vs Journey ของข้อมูลแต่ละชนิดกำหนดใน [04](04-personality-system.md) §2.1 · MVP มี Journey สถานะ `active` ได้ทีละ 1 อัน (อันเก่าเป็น `completed`/`archived`)

Content (บท คำถาม) **ไม่อยู่ใน Save** — อยู่ในไฟล์ Content ที่ build มากับแอป (§5) Save อ้างอิงด้วย id เท่านั้น

---

## 2. Common Types

```ts
type ISODate = string;            // "2026-11-22T10:15:00.000Z"
type PlayerId = string;           // "pl_" + nanoid(12)
type JourneyId = string;          // "jr_" + nanoid(12)
type QuestionId = `Q${string}` | `M${string}` | string; // Q01–Q36, M01–M07, r1_1, w3_1, cs1, ...
type OptionId = string;           // "q13_hug"
type DimensionId = 'D01'|'D02'|'D03'|'D04'|'D05'|'D06'|'D07'|'D08'|'D09'|'D10'|'D11'|'D12';
type ChapterId = 'ch1'|'ch2'|'ch3'|'ch4'|'ch5'
  | 'os1'|'os2'|'os3'|'os4'|'os5'|'os6';   // M16: เส้นเรื่องที่ 2 "อีกด้านของเรื่อง" (MINOR — save เก่าใช้ได้)
type Role = 'insider' | 'waiter';
type Layer = 'self' | 'perceived';
type Mode = 'solo' | 'together' | 'remote_sealed' | 'remote_online';
type Meta = null | 'depends' | 'not_sure' | 'prefer_not' | 'skipped';
```

---

## 3. Player

```ts
interface Player {
  id: PlayerId;
  kind: 'real' | 'imagined';        // imagined = คู่ในจินตนาการ (Play Alone)
  createdBy: PlayerId | null;       // imagined: id ของผู้เล่นที่สร้าง
  nickname: string;                 // 1–20 ตัวอักษร (trim)
  sentenceEnding: '' | 'ครับ' | 'ค่ะ' | 'นะ';  // A-04
  addressStyle: 'เธอ' | 'ตัวเอง' | 'name';     // คำเรียกคู่ในบทพูด
  pronouns?: string;                // ≤ 20 ไม่ใช้ในตรรกะใด
  bio?: string;                     // ≤ 140
  appearance: Appearance;
  pin?: PinRecord;                  // Phase 2 — ดู §3.1
  createdAt: ISODate;
  updatedAt: ISODate;
}

interface Appearance {
  preset: 'p1'|…|'p6';                // MVP 4 preset (audit H-6) + p5/p6 = ตัวละครบนภาพปก (MINOR, 2026-11-23)
  skin: 0|1|2|3|4|5;                   // palette swap
  hairStyle: 0|1|2|3|4;                // 4 = ฟูชี้ (ภาพปก)
  hairColor: 0|…|9;                    // palette swap · 8 = ชมพูอมส้ม, 9 = กรมเข้ม (ภาพปก)
  outfit: 0|1|2;                       // MVP 3 แบบ
  outfitColor: 0|…|8;                  // palette swap · 8 = ชมพูอมส้ม (ภาพปก)
  accessory: 'none'|'glasses';         // hat = P1
  legs?: 'long'|'short';               // ไม่มี = 'long' (ข้อมูลเก่าใช้ได้ต่อ) · 'short' = ขาสั้น + ถุงเท้า
}
```

### 3.1 PinRecord (Phase 2)

```ts
interface PinRecord {
  algo: 'PBKDF2-SHA256';
  iterations: 210000;
  salt: string;          // base64, 16 bytes จาก crypto.getRandomValues
  hash: string;          // base64, 32 bytes
  failedAttempts: number;
  lockedUntil?: ISODate;
}
```
**ข้อจำกัด:** PIN เป็นเพียงประตูกันการแอบดูบนหน้าจอ ข้อมูลคำตอบไม่ได้ถูกเข้ารหัสด้วย PIN ดู [08](08-privacy-and-safety.md) §4

---

## 4. Profiles & Answers

```ts
type ProfileKey = `${PlayerId}:self` | `${PlayerId}:perceived:${PlayerId}`;

interface PlayerProfile {               // Self-reported
  key: `${PlayerId}:self`;
  ownerId: PlayerId;
  answers: Record<QuestionId, PersonalityAnswer>;   // Q01–Q36
  hiddenObservedCards: string[];        // "D09:act"
  confirmedObserved: Record<string, boolean>;       // "D09:act" → true/false
  updatedAt: ISODate;
}

interface PerceivedPartnerProfile {     // Perceived
  key: `${PlayerId}:perceived:${PlayerId}`;
  ownerId: PlayerId;                    // คนที่คิด
  aboutId: PlayerId;                    // คนที่ถูกคิดถึง (real หรือ imagined)
  answers: Record<QuestionId, PersonalityAnswer>;
  updatedAt: ISODate;
}

interface PersonalityAnswer {
  questionId: QuestionId;
  layer: Layer;
  selected: OptionId[];                 // ≤ maxSelect
  meta: Meta;
  freeText?: string;                    // ≤ 280 plain text
  status: 'answered' | 'skipped';
  revision: number;                     // เริ่ม 1 เพิ่มทุกครั้งที่แก้
  answeredAt: ISODate;
  updatedAt: ISODate;
}
```

Invariants (ตรวจตอนบันทึกและตอน Import):
- `meta !== null` ⇒ `selected.length === 0`
- `meta === 'skipped'` ⇒ `status === 'skipped'` และไม่มี `freeText`
- `selected` ทุกตัวต้องเป็น option ของ `questionId` ตาม Content version ปัจจุบัน (ถ้าไม่ใช่ → ตัดทิ้งพร้อม log ใน Import report)

---

## 5. Scenario & Content Model

### 5.1 Scenario (ค่าที่ผู้เล่นตั้ง — อยู่ใน Save)

```ts
interface ScenarioConfig {
  insiderPlayerId: PlayerId;            // waiter = อีกคน
  priorWarning: boolean;                // ค่าเริ่มต้น true (A-03)
  randomized: boolean;
  setAt: ISODate;
}

// M16 — เส้นเรื่องที่ 2: ใครเป็นคนเล่า (บทบาท insider ใน os1–os6; อีกคน = waiter)
interface OtherSideConfig {
  tellerPlayerId: PlayerId;
  randomized: boolean;
  setAt: ISODate;
}
```

Flag ของ `os*` อ่าน/เขียนเฉพาะบท `os*` (และ Ch1–Ch5 อ่านเฉพาะ Ch1–Ch5) · เปลี่ยนคนเล่า → รีเซ็ตความคืบหน้า os1–os6 แบบเดียวกับ Scenario · Live merge: `otherSide` ใช้ค่าที่ `setAt` ใหม่กว่า

### 5.2 Content (อยู่ในโค้ด `src/content/` — ไม่อยู่ใน Save)

```ts
interface ChapterContent {
  id: ChapterId;
  titleEn: string; titleTh: string;
  estimatedMinutes: [number, number];
  firstScene: string;
  scenes: SceneContent[];
  reflection: QuestionContent[];        // r1_1 ... (เล่นที่บรรทัด REFLECTION)
  emotionCards?: { groups: { role: Role; period?: string; cards: OptionContent[] }[] };   // การ์ดความรู้สึก (บรรทัด EMOTION_CARDS) · period เช่น "T+5"
  fragments?: Record<string, { flag: string; values: Record<string, string>; fallback: string }>;  // token {ชื่อ} → ข้อความตามค่า Flag (ภาคผนวก A ของ 02)
  interpretations?: InterpretationSet[];                                  // Ch3 Interpretation Check
  mirrorQuestions?: QuestionContent[];   // คำถาม Mirror เฉพาะบท (w3_1, w3_2 — context 'role') · M01–M07 มาจาก questions.ts
  statements?: { id: string; stem: string; starters: { id: string; text: string }[] }[];   // Ch5 cs1–cs5
  rewrites?: { token: string; flag: string; choiceId: string; originalChoiceId: string; storyItem: string }[];  // {rewrite_out} = ตัวเลือก / ข้อความที่พิมพ์เอง / คำเดิม ("ไม่เปลี่ยน")
  ending?: { en: string; th?: string; title?: boolean }[];   // S15 (Ch5)
  transition: { lines: LineContent[]; nextChapter?: ChapterId; ending?: boolean };   // ending = ไป S15 หลังจบบท (Ch5)
}

interface InterpretationSet {           // แถวของ Interpretation Check ตามคำพูดที่เกิดขึ้นจริงในเรื่อง
  id: string;                           // "ic_out_blame" → StoryAnswer itemId
  role: Role;                           // เจ้าของคำพูด
  when: Condition;                      // เช่น { flag: 'out_first_words', eq: 'blame' }
  quote: string;                        // คำพูดที่แสดงเป็นหัวข้อ
  quoteByCondition?: { when: Condition; text: string }[];
  feelings: { id: string; text: string; when?: Condition }[];
}

interface SceneContent {
  id: string;                           // "ch1_s01"
  background: string;                   // asset key "bg_apartment_evening" (ENV เปลี่ยนได้ระหว่างฉาก)
  ariaLabel: string;
  controller: 'insider' | 'waiter' | 'A' | 'B' | 'both' | 'narrator';
  lines: LineContent[];
  next: string | NextRule[] | null;     // null = ฉากสุดท้ายของบท
  handoffBefore?: boolean;              // Together: หน้าส่งเครื่อง (ไม่ลับ) ให้ผู้ควบคุมฉากก่อนเริ่ม (Ch2 Part A/B)
}

interface NextRule { when?: Condition; to: string }   // กฎแรกที่ผ่านชนะ · ไม่มี when = ค่าเริ่มต้น

type LineContent =
  | { type: 'NARR'; text: string; when?: Condition }
  | { type: 'SYS'; title?: string; text: string; when?: Condition }   // title = "โทรศัพท์ของ {in}", "จอลิฟต์"
  | { type: 'DLG' | 'MONO'; speaker: 'in'|'out'|'A'|'B'|string; expression?: Expression; text: string; when?: Condition }
  | { type: 'ENV'; set: EnvSet; when?: Condition }
  | { type: 'CHOICE'; id: string; owner: 'insider'|'waiter'|'A'|'B'|'each'; options: ChoiceOption[];
      custom?: { setFlags: Record<string, string>; storyItem: string; maxLength: number } }   // ตัวเลือก "พิมพ์เอง" (Ch3 s06) — ข้อความเก็บเป็น StoryAnswer itemId = storyItem (plain text)
  | { type: 'QUESTION'; questionId: QuestionId; layer: Layer | 'both'; private: boolean }
  | { type: 'EMOTION_CARDS' }           // การ์ดความรู้สึกของบท → StoryAnswer kind 'emotion_card', itemId 'ec_<chapter>'
  | { type: 'TIMELINE'; rows: { label: string; in: string; out: string }[] }   // Ch2 Part C · ข้อความใช้ token fragment
  | { type: 'INTERPRETATION' }          // Ch3 Interpretation Check → StoryAnswer kind 'interpretation' ต่อชุดที่ when ผ่าน
  | { type: 'MIRROR'; questionId: string; bridge?: LineContent[] }   // S7 (Solo: self → perceived → การ์ดผล) → SharedAnswer
  | { type: 'STATEMENTS' }              // Ch5 cs1–cs5 → SharedAnswer kind 'statement'
  | { type: 'REFLECTION' }              // ชุดคำถามท้ายบท → StoryAnswer kind 'reflection' · ข้ามทั้งชุดได้
  | { type: 'SAFETY_NOTE'; text: string; when?: Condition };   // ไม่หยุดเกม: แสดงเป็นกล่องเล็กเหนือบทพูดจนกว่าจะปิด/จบฉาก

// ENV เป็นชนิดที่กำหนดไว้ ไม่ใช่ Record อิสระ — key ที่ไม่รู้จักจึง compile ไม่ผ่าน
interface EnvSet {
  bg?: string; split?: [string, string] | null;
  rain?: 'none' | 'light' | 'medium' | 'heavy';
  light?: 'normal' | 'flicker' | 'emergency' | 'off';
  haze?: 0 | 1 | 2; lamp?: 'warm' | 'off'; steam?: boolean;
  door?: 'closed' | 'ajar' | 'open';
  shake?: 'small';                      // ครั้งเดียวตอนเล่นผ่าน ไม่เล่นซ้ำตอน resume · ปิดเมื่อ reduced motion
  sfx?: string; music?: string;         // MVP ไม่มีผล (เสียง Phase 2 — audit M-9) เก็บไว้ใน content ได้
}

interface ChoiceOption {
  id: string; text: string;
  when?: Condition;                     // แสดงตัวเลือกนี้เฉพาะเมื่อผ่าน (Ch3 c02 e*)
  textByCondition?: { when: Condition; text: string }[];
  setFlags?: Record<string, string>;
  tag?: `${DimensionId}:${string}`;
  responseLines?: LineContent[];
}

type Condition = { flag: string; eq: string } | { flag: string; unset: true } | { flag: string; set: true } | { scenario: 'priorWarning'; eq: boolean } | { all: Condition[] } | { any: Condition[] };
// { flag, unset: true } = Flag ยังไม่มีค่า (ข้ามฉาก) → ใช้เลือกบรรทัด fallback (แทน eq: '__missing' ใน 10 §4)
type Expression = 'neutral'|'happy'|'sad'|'worried'|'angry'|'scared'|'relieved'|'thinking';

interface QuestionContent {
  id: QuestionId;
  dimension?: DimensionId;
  self: string; perceived?: string;
  options: { id: OptionId; text: string; exclusive?: boolean }[];   // exclusive = เลือกแล้วล้างข้ออื่น ([04] §3.2)
  context?: 'self' | 'role';            // 'role' = ตอบในบทบาทสมมติ (W3) ไม่นับใน Profile/Comparison
  maxSelect: number;
  freeText: boolean;
  interpretation?: string;              // สำหรับระบบ ไม่แสดงตรง
  reflectionPrompt?: string;
  quick?: boolean;
  toNextConversation?: boolean;         // Reflection: ข้อความที่เลือก/พิมพ์ถูกเพิ่มใน "Our Next Conversation" (r4_3, r5_2)
}
```

Content มี `contentVersion` (เช่น `"1.0.0"`) แยกจาก `schemaVersion` · Option id ห้ามเปลี่ยนหลังปล่อย (เพิ่มได้ ลบให้ mark `deprecated`)

---

## 6. Game Session (Journey)

```ts
interface GameSession {
  id: JourneyId;
  mode: Mode;
  playerIds: [PlayerId, PlayerId];      // [A, B] — solo: B = imagined
  status: 'active' | 'completed' | 'archived';
  scenario?: ScenarioConfig;
  otherSide?: OtherSideConfig;          // M16
  chapterProgress: Record<ChapterId, ChapterProgress>;
  storyAnswers: Record<StoryAnswerKey, StoryAnswer>;
  mirrorItems: Record<MirrorKey, SharedAnswer>;
  observed: ObservedSignal[];
  nextConversation: NextConversationItem[];
  introSeen: boolean;
  remote?: RemoteLink;                  // Phase 3
  createdAt: ISODate;
  updatedAt: ISODate;
  lastPlayedAt: ISODate;
}

interface ChapterProgress {
  chapterId: ChapterId;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  currentSceneId?: string;
  lineIndex?: number;
  flags: Record<string, string>;        // ภาคผนวก B ของ 02
  choiceLog: { choiceId: string; optionId: string; byPlayerId: PlayerId; asRole: Role | 'self'; at: ISODate }[];
  skippedScenes: string[];
  revealMode?: 'per_question' | 'end_of_chapter';   // ch4
  pendingPrivateSteps?: { itemId: string; playerIds: PlayerId[] }[];
  livePos?: Record<PlayerId, { sceneId: string; lineIndex: number; end?: boolean }>;  // 3C: ตำแหน่งอ่านของแต่ละเครื่อง (ต่างคนต่างอ่าน) · merge: เจ้าของตำแหน่งชนะ เฉพาะรอบเล่นเดียวกัน (`startedAt`) · ไม่นับใน syncSeq
  // pendingPrivateSteps รายการพิเศษในเล่นสด: `ready` (ใครยังไม่เข้าบท) · `decline:<startedAt>` (ใครกด "ขอเวลาก่อน")  // Phase 2: ใครยังต้องตอบส่วนลับ (resume กลาง Handoff)
  startedAt?: ISODate;
  completedAt?: ISODate;
  playCount: number;
}

type StoryAnswerKey = `${PlayerId}:${string}`;     // "pl_x:r1_1", "pl_x:ic_out_blame"

interface StoryAnswer {
  key: StoryAnswerKey;
  playerId: PlayerId;
  itemId: string;                       // r1_1 | ic_<speaker>_<flag> | rewrite_* | ec_<chapter> (rewrite_* = ข้อความที่พิมพ์เอง เก็บใน freeText, kind 'reflection')
  kind: 'reflection' | 'interpretation' | 'emotion_card';   // Statements ย้ายไป SharedAnswer (§7)
  layer: Layer;
  selected: OptionId[];
  interpretation?: Record<string, 'yes' | 'no' | 'unsure'>;   // Interpretation Check
  meta: Meta;
  freeText?: string;
  updatedAt: ISODate;
}

interface ObservedSignal {             // Phase 2 — MVP ไม่สร้าง
  dimension: DimensionId;
  signal: string;
  sourceChoiceId: string;               // unique ต่อ (playerId, sourceChoiceId)
  playerId: PlayerId;
  at: ISODate;                          // เก็บเฉพาะเมื่อเล่นบทบาทของตัวเอง (ไม่มี layer perceived)
}

interface NextConversationItem {
  id: string;
  ownerId: PlayerId;
  text: string;                         // ≤ 200
  source: 'comparison' | 'mirror' | 'reflection' | 'manual';
  sourceRef?: string;                   // questionId
  done: boolean;
  createdAt: ISODate;
}
```

---

## 7. Shared Answer (Mirror Item)

```ts
type MirrorKey = string;                // "M01", "w3_1", "cs1", "Q13"

interface SharedAnswer {
  key: MirrorKey;
  questionId: QuestionId;
  kind: 'mirror' | 'statement' | 'profile';
  // mirror    = M01–M07, w3_* (คำตอบเก็บใน entries)
  // statement = cs1–cs5 (ข้อความเก็บใน entries[].statement, เปิดตาม shareIntent — [04] §6.3.1)
  // profile   = Q01–Q36 ใน Together/Remote: เก็บแค่ consent, คำตอบอ่านจาก Profile ตอนแสดง ([04] §6.3.0)
  context: 'self' | 'role';             // w3_* = 'role'
  state: 'open' | 'partial' | 'awaiting_consent' | 'revealed' | 'skipped';
  entries: Record<PlayerId, {
    self?: PersonalityAnswer;
    perceived?: PersonalityAnswer;
    statement?: { text: string; starterId?: string; meta: Meta };
    shareIntent?: boolean;              // statement เท่านั้น ค่าเริ่มต้น false
    submittedAt?: ISODate;
    consent: boolean;
    consentAt?: ISODate;
  }>;
  revealedAt?: ISODate;
  revealedRevision?: Record<PlayerId, number>;   // R7
}
```

- Solo: `state` ไม่ถูกใช้ (คงที่ `open`) · `entries` มีเฉพาะผู้เล่นจริง
- Remote 3B: คำตอบของอีกฝ่ายถูกเขียนลง `entries[otherId]` **เฉพาะหลัง Server ส่งกลับเมื่อ revealed** (ก่อนหน้านั้น local มีแค่ `submittedAt`, `consent`)

### 7.1 Remote Link (Phase 3)

```ts
interface RemoteLink {
  kind: 'sealed' | 'online';
  // sealed (3A)
  myRevealKey?: string;                 // base32 26 ตัว (128-bit) เก็บเฉพาะเครื่องตัวเอง
  partnerSealed?: { questionIds: QuestionId[]; ciphertext: string; iv: string; importedAt: ISODate };
  // online (3B)
  sessionId?: string;                   // uuid จาก Server
  role?: 'owner' | 'member';
  inviteExpiresAt?: ISODate;
  pendingUploads?: string[];            // MirrorKey ที่ยังไม่ส่ง
}
```

---

## 8. Reflection Report

Report คำนวณสดจากข้อมูล ([04](04-personality-system.md) §8) — เก็บ Snapshot เฉพาะตอนส่งออก เพื่อให้ผู้เล่นรู้ว่าส่งอะไรออกไปแล้ว

```ts
interface ReflectionReport {
  id: string;                           // "rp_" + nanoid
  journeyId: JourneyId;
  ownerId: PlayerId;
  generatedAt: ISODate;
  selectedItemIds: string[];            // รายการที่ผู้เล่นเลือกส่งออก
  format: 'txt' | 'json' | 'png' | 'pdf';   // txt/json เหลือไว้ให้ประวัติเก่าอ่านได้ · ส่งออกใหม่ใช้ png/pdf
  sections: {
    myPersonality: ReportItem[];
    myUnderstanding: ReportItem[];
    ourDifferences: ReportItem[];
    nextConversation: ReportItem[];
    confirmedPatterns: ReportItem[];
  };
}

interface ReportItem {
  id: string;
  text: string;
  source: 'self' | 'perceived' | 'partner_revealed' | 'observed_confirmed' | 'statement' | 'conversation';   // conversation = คำถามใน Our Next Conversation
  dimension?: DimensionId;
  questionId?: QuestionId;
}
```

Snapshot เก็บเฉพาะ metadata (`id`, `generatedAt`, `format`, `selectedItemIds`) ไม่เก็บเนื้อความซ้ำ (ข้อความเต็มอยู่ในไฟล์ที่ผู้เล่นดาวน์โหลดแล้ว)

---

## 9. Settings, Drafts, Memory Scenes

```ts
interface Settings {
  fontScale: 1 | 1.15 | 1.3;
  textSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  reducedMotion: 'system' | 'on' | 'off';
  sound: { enabled: boolean; volume: number };   // 0–1, ค่าเริ่มต้น enabled=true (เจ้าของตัดสิน 2026-11-23)
  lastJourneyId?: JourneyId;
}

interface Draft { key: `${PlayerId}:${string}`; playerId: PlayerId; text: string; updatedAt: ISODate }
// key ต้องขึ้นต้นด้วย playerId · ลบเมื่อบันทึกคำตอบ · ลบ drafts ของผู้เล่นเมื่อ Handoff ออกจากผู้เล่นนั้น หรือเมื่อลบผู้เล่น

interface MemoryScene {                 // Phase 2
  id: string; ownerId: PlayerId; journeyId?: JourneyId;
  category: 'disagreement'|'happy'|'misunderstood'|'supported'|'unresolved'|'meaningful';
  title: string;                        // ≤ 60
  whatHappened: string;                 // ≤ 500 — ข้อมูลที่ผู้ใช้ให้ แสดงตามจริงเท่านั้น
  myFeelings: { selected: string[]; freeText?: string };
  myNeeds: { selected: string[]; freeText?: string };
  partnerFeelingsGuess: { selected: string[]; freeText?: string };
  background: string;
  shareIntent: boolean;
  createdAt: ISODate; updatedAt: ISODate;
}
```

---

## 10. Storage

| Key | เนื้อหา | หมายเหตุ |
|---|---|---|
| `iywm:save` | `SaveRoot` ทั้งก้อน (JSON) | เขียนผ่าน debounce 300ms + เขียนทันทีเมื่อ `visibilitychange=hidden` |
| `iywm:save:backup` | สำเนาล่าสุดก่อน Migration หรือก่อน Import | เก็บ 1 ชุด · **ลบทันทีเมื่อ Import/Migration สำเร็จ** และ **ลบทุกครั้งที่มีการลบข้อมูลใด ๆ** (ลบคำตอบ, Journey, ผู้เล่น, ลืม PIN, ลบทั้งหมด) เพื่อไม่ให้ข้อมูลที่ลบแล้วค้างอยู่ |
| `iywm:probe` | ใช้ทดสอบว่าเขียนได้ | ลบทันที |

- ขนาดคาดการณ์ต่อ Journey < 100 KB (เป้า SaveRoot < 1 MB; ขีดจำกัด localStorage ทั่วไป ~5 MB)
- เขียนล้มเหลว (`QuotaExceededError`) → Toast + แนะนำส่งออก/ลบ Journey เก่า · state ในหน่วยความจำยังอยู่
- อ่าน: `JSON.parse` → ตรวจด้วย Zod schema → Migration (§12) → ใช้งาน · ไม่ผ่าน → S18
- หลายแท็บ: ฟัง event `storage` → ถ้า Save ถูกเปลี่ยนจากแท็บอื่น แสดง Dialog "เกมถูกเปิดในแท็บอื่น — โหลดใหม่" (ป้องกันเขียนทับกัน)

---

## 11. Export / Import

### 11.1 Export Envelope

```json
{
  "format": "iywm-export",
  "schemaVersion": "1.0.0",
  "contentVersion": "1.0.0",
  "appVersion": "0.1.0",
  "exportedAt": "2026-11-22T10:15:00.000Z",
  "scope": "full",
  "data": { "...": "SaveRoot หรือส่วนย่อยตาม scope" },
  "checksum": "sha256-base64 ของ JSON.stringify(data)"
}
```

| `scope` | เนื้อหา | ใช้เมื่อ |
|---|---|---|
| `full` | SaveRoot ทั้งหมด (ไม่รวม `pin` hash — ต้องตั้งใหม่หลัง Import) | สำรองข้อมูล / ย้ายเครื่อง |
| `journey` (Phase 2) | Journey 1 อัน + Player + Profile ที่เกี่ยวข้อง | ย้าย Journey |
| `report` | ReportItem ที่ผู้เล่นเลือกเท่านั้น (ไม่มี id ภายใน) | แชร์ให้คู่/เก็บไว้อ่าน |

**กฎความเป็นส่วนตัวของ Export (audit H-2):**
- MVP มีผู้เล่นจริงคนเดียว จึงส่งออก `full` ได้โดยไม่มีเงื่อนไข
- Together (Phase 2): `full` และ `journey` ที่มีข้อมูลของผู้เล่นอื่นซึ่งยังไม่ Reveal ต้องผ่าน PIN ของ **ทุก** ผู้เล่นที่ตั้ง PIN ไว้ · ถ้าไม่ผ่าน ให้ส่งออกได้เฉพาะข้อมูลของผู้เล่นที่ใช้งานอยู่ + ข้อมูลที่ Revealed แล้ว
- `report`: รายการ `source = partner_revealed` **ไม่ถูกเลือกเป็นค่าเริ่มต้น** และเมื่อเลือกต้องมีป้าย "คำตอบของ {other}" ในไฟล์
| `invitation` (3A) | Journey id, ชื่อและ Avatar ของผู้เชิญ, Scenario, Content version — **ไม่มีคำตอบ** | เชิญเล่นแบบ Sealed |
| `sealed` (3A) | `{ journeyId, questionIds, ciphertext, iv }` (journeyId ใช้จับคู่ ไม่ใช่คำตอบ) | ส่งคำตอบที่ปิดผนึก |

ชื่อไฟล์: `iywm-{scope}-{yyyyMMdd-HHmm}.json` (ไม่ใส่ชื่อผู้เล่นในชื่อไฟล์)

### 11.2 Import Rules

1. ขนาดไฟล์ ≤ 5 MB · เป็น JSON ที่ parse ได้ · `format === "iywm-export"`
2. ตรวจ `checksum` · ไม่ตรง → ปฏิเสธ "ไฟล์อาจเสียหาย" — checksum (SHA-256 ไม่มีกุญแจลับ) **ตรวจได้แค่ความเสียหายโดยไม่ตั้งใจ ไม่ได้กันการแก้ไขไฟล์** ใครก็คำนวณใหม่ได้ ห้ามอ้างว่าเป็นการป้องกันการปลอมแปลง
3. `schemaVersion` MAJOR > ของแอป → ปฏิเสธ "ไฟล์นี้มาจากเวอร์ชันใหม่กว่า กรุณาอัปเดต" · MAJOR ต่ำกว่า → Migration
4. ตรวจ Zod schema ทั้งก้อน · ข้อความทั้งหมดเป็น plain text (ไม่ render HTML)
5. แสดง **Import Preview**: จำนวนผู้เล่น/Journey, ความขัดแย้งของ id, ข้อมูลที่จะถูกตัด (option ที่ไม่รู้จัก)
6. ความขัดแย้งของ id → ให้เลือก: แทนที่ / เก็บเป็นสำเนา (สร้าง id ใหม่) / ยกเลิก
7. สำรอง `iywm:save:backup` ก่อนเขียน · ล้มเหลวกลางทาง → คืนค่าจาก backup
8. `scope=full` แทนที่ทั้งหมด ต้องยืนยันแบบ destructive
9. ไฟล์ภายนอกไม่น่าเชื่อถือ: `SharedAnswer.state = revealed` ที่มาจากไฟล์ซึ่งมีผู้เล่นมากกว่า 1 คน ถูกรีเซ็ตเป็น `awaiting_consent` และ consent ถูกล้าง (กันการแก้ไฟล์เพื่อเปิดคำตอบเอง) — ยกเว้นผู้เล่นทุกคนผ่าน PIN ตอน Import
10. **MVP รองรับเฉพาะ `scope=full`** (แทนที่ทั้งหมด) · การรวมข้อมูล/แก้ id ชน (ข้อ 6) เป็น Phase 2

### 11.3 PDF Summary (แทน .txt/.json ตั้งแต่ 2026-11-23)

หน้าเอกสารสำหรับพิมพ์ (`@media print`) แสดงเฉพาะรายการที่เลือก: ชื่อเรื่อง + วันที่ · หัวข้อตามส่วนของ Report · ทุกรายการมีป้ายแหล่งที่มา `[คุณบอก]` `[คุณคิด]` `[{other} บอก]` `[เกมสังเกต]` · ท้ายหน้า: วันที่ + "สร้างจาก IF YOU WERE ME, AND I WERE YOU" · ผู้เล่นกด "บันทึกเป็น PDF" → `window.print()` → เลือก "บันทึกเป็น PDF" ในหน้าพิมพ์ของเครื่อง · ตอนพิมพ์ซ่อนทุกอย่างของแอปยกเว้นเอกสารนี้

### 11.4 PNG Reflection Card

1080×1350 · พื้น `--c-navy` + กรอบ pixel · ชื่อเกม · ชื่อเล่นผู้ส่ง · รายการที่เลือก (สูงสุด 5 ข้อ ตัดข้อความที่ยาวเกิน 140 ตัวด้วย "…") · วาดด้วย Canvas 2D API + ฟอนต์ที่โหลดแล้ว (`document.fonts.ready`)

---

## 12. Migration

```ts
type Migration = { from: string; to: string; up: (data: unknown) => unknown };
const migrations: Migration[] = [];     // 1.0.0 = baseline ยังไม่มี
```

- รันตามลำดับจาก `schemaVersion` ของข้อมูลจนถึงเวอร์ชันแอป
- ก่อนรัน: เขียน `iywm:save:backup`
- แต่ละ Migration ต้องมี Unit test ที่ใช้ Fixture ของเวอร์ชันก่อนหน้า
- ล้มเหลว → S18 พร้อมไฟล์ backup ให้ดาวน์โหลด

---

## 13. Remote Data Model (Phase 3B — Supabase/Postgres)

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users,
  content_version text not null,
  scenario jsonb not null,            -- insider (owner|member), prior_warning
  created_at timestamptz default now(),
  last_activity_at timestamptz default now(),
  closed_at timestamptz
);

create table invites (
  code_hash text primary key,         -- sha256 ของโค้ด (ไม่เก็บโค้ดดิบ)
  session_id uuid references sessions on delete cascade,
  expires_at timestamptz not null,    -- +7 วัน
  used_at timestamptz,
  revoked_at timestamptz
);

create table session_members (
  session_id uuid references sessions on delete cascade,
  user_id uuid references auth.users,
  role text check (role in ('owner','member')),
  display_name text not null,         -- ชื่อเล่นเท่านั้น
  appearance jsonb not null,
  sentence_ending text not null default '',
  address_style text not null default 'เธอ',
  -- เครื่องปลายทางสร้าง Player{kind:'real', remoteUserId:user_id} จากแถวนี้ (audit M-12)
  joined_at timestamptz default now(),
  primary key (session_id, user_id)
);

create table answers (
  session_id uuid references sessions on delete cascade,
  user_id uuid references auth.users,
  item_key text not null,             -- M01, w3_1, cs1 ...
  payload jsonb not null,             -- { self?, perceived?, statement? }
  revision int not null default 1,
  submitted_at timestamptz default now(),
  primary key (session_id, user_id, item_key)
);

create table consents (
  session_id uuid references sessions on delete cascade,
  user_id uuid references auth.users,
  item_key text not null,
  revision int not null,              -- ยินยอมต่อ revision (R7)
  consented_at timestamptz default now(),
  primary key (session_id, user_id, item_key)
);

```
ไม่มีตาราง `story_events`: ใน Remote แต่ละคนเล่นเนื้อเรื่องบนเครื่องตัวเอง ([05](05-game-flow.md) §5, audit H-1)

Access control (RLS) อยู่ใน [08](08-privacy-and-safety.md) §6.2 · Reflection, Interpretation และ Observed **ไม่ถูกส่งขึ้น Server** (เก็บเฉพาะในเครื่อง)
