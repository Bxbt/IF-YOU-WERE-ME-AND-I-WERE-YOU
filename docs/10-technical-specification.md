# 10 — Technical Specification

> เจ้าของข้อมูล: Stack, Architecture, โครงสร้างโฟลเดอร์, ขอบเขตทางเทคนิคของแต่ละ Phase
> **กฎ:** ห้ามสร้างฟังก์ชันจำลอง (mock/fake) แล้วแสดงใน UI ว่าทำงานจริง ฟีเจอร์ที่ยังไม่ทำต้องแสดงสถานะ "เร็ว ๆ นี้" และปิดใช้งาน

---

## 1. Stack

| ส่วน | เลือกใช้ | สถานะ |
|---|---|---|
| Framework | React 18 | กำหนดโดยเจ้าของ |
| Language | TypeScript 5 (`strict: true`) | กำหนดโดยเจ้าของ |
| Styling | Tailwind CSS 3 + CSS variables สำหรับ token | กำหนดโดยเจ้าของ |
| Animation | Framer Motion | กำหนดโดยเจ้าของ |
| Icons | lucide-react | กำหนดโดยเจ้าของ |
| Build | Vite 5 | A-07 |
| State | Zustand (+ middleware persist แบบเขียนเอง เพื่อคุม debounce/validation/migration) | A-07 |
| Routing | Hash router (React Router `createHashRouter`) — ทำงานบน static host ได้โดยไม่ต้องตั้ง rewrite | A-07 |
| Validation | Zod (schema ของ Save, Import, Content) | A-07 |
| ID | nanoid | A-07 |
| Unit/Component test | Vitest + @testing-library/react + jsdom | A-07 |
| E2E | Playwright (Chromium, WebKit, Firefox · viewport มือถือ/แท็บเล็ต/เดสก์ท็อป) | A-07 |
| A11y test | @axe-core/playwright | A-07 |
| Lint/Format | ESLint (typescript-eslint, react-hooks, jsx-a11y) + Prettier | A-07 |
| Phase 3B | Supabase JS client v2 | A-10 |

เวอร์ชันระบุแบบ exact ใน `package.json` และ commit `package-lock.json`

---

## 2. Architecture

```
┌────────────────────────── UI Layer (React) ──────────────────────────┐
│ screens/ (S1–S18)   components/ (shared)   scene/ (canvas renderer)  │
└──────────────┬───────────────────────────────────────┬───────────────┘
               │ hooks / selectors                     │
┌──────────────▼──────────────┐        ┌───────────────▼───────────────┐
│ Store (Zustand)              │        │ Engines (pure TS, no React)   │
│ - saveSlice (SaveRoot)       │◄──────►│ - dialogueEngine              │
│ - uiSlice (ephemeral)        │        │ - personalityEngine           │
│ - sessionSlice (handoff/PIN) │        │ - comparisonEngine            │
└──────────────┬──────────────┘        │ - revealEngine (state machine)│
               │                        │ - reportEngine                │
┌──────────────▼──────────────┐        │ - observedEngine              │
│ Persistence Adapter          │        └───────────────┬───────────────┘
│ - localStorageAdapter        │                        │
│ - migrations                 │        ┌───────────────▼───────────────┐
│ - exportImport               │        │ Content (static TS/JSON)      │
└──────────────┬──────────────┘        │ chapters, questions, signals, │
               │ (Phase 3)              │ templates, safety keywords    │
┌──────────────▼──────────────┐        └───────────────────────────────┘
│ Remote Adapter (interface)   │
│ - sealedExchange (3A)        │
│ - supabaseAdapter (3B)       │
└──────────────────────────────┘
```

**หลักการ**
- Engines เป็น pure function รับ state + content คืนผลลัพธ์ — ทดสอบได้โดยไม่ต้อง render
- UI ไม่เข้าถึง localStorage โดยตรง ผ่าน Persistence Adapter เท่านั้น
- Content แยกจากโค้ด เปลี่ยนบท/คำถามได้โดยไม่แก้ Engine
- ไม่มีโค้ด Remote ใน MVP/Phase 2 เลย (ไม่สร้าง interface ล่วงหน้า — audit M-14) เพิ่มเมื่อเริ่ม Phase 3

---

## 3. Folder Structure

```
/
├── docs/                         # เอกสารชุดนี้
├── public/fonts, audio, icons
├── src/
│   ├── main.tsx, App.tsx, router.tsx
│   ├── screens/                  # TitleScreen.tsx, ModeSelect.tsx, ... (1 ไฟล์/หน้าจอ ตาม Screen ID)
│   ├── components/               # PixelButton, DialogueBox, ChoiceList, MetaOptions, ...
│   ├── scene/                    # SceneCanvas, SpriteLayer, Effects (rain, stars, haze)
│   ├── engines/
│   │   ├── dialogue/             # interpreter ของ SceneContent, conditions, tokens
│   │   ├── personality/          # summary, validation
│   │   ├── comparison/           # categorize()
│   │   ├── reveal/               # state machine
│   │   ├── observed/
│   │   └── report/               # build + export (txt/json/png)
│   ├── store/                    # slices, selectors
│   ├── persistence/              # adapter, schema (zod), migrations, exportImport
│   ├── content/
│   │   ├── th/
│   │   │   ├── chapters/ch1.ts … ch5.ts
│   │   │   ├── questions.ts      # Q01–Q36, M01–M07, reflection, sets
│   │   │   ├── signals.ts
│   │   │   ├── templates.ts      # ประโยค Report/Comparison
│   │   │   ├── ui.ts             # ข้อความ UI ทั้งหมด
│   │   │   └── safety.ts         # keywords + resources
│   │   └── index.ts              # contentVersion, loader
│   ├── assets/                   # ดู 09 §8
│   ├── styles/                   # tokens.css, tailwind.css
│   └── lib/                      # crypto (PBKDF2, AES-GCM), ids, dates, sanitize
├── tests/
│   ├── unit/                     # engines, persistence, content lint
│   ├── fixtures/                 # save files ทุก schema version
│   └── e2e/                      # Playwright specs
├── index.html
└── package.json, vite.config.ts, tailwind.config.ts, tsconfig.json, playwright.config.ts
```

ข้อความ UI ทั้งหมดอยู่ใน `content/th/ui.ts` (ไม่ hardcode ใน component) เพื่อรองรับภาษาอื่นในอนาคต (Q-14)

---

## 4. Dialogue Engine

| ความสามารถ | รายละเอียด |
|---|---|
| Interpreter | ขยายฉากเป็นลำดับขั้น (step): ข้ามบรรทัดที่ `when` ไม่ผ่าน · ต่อ `responseLines` ของตัวเลือกที่เลือกแล้วหลัง CHOICE · `lineIndex` = ตำแหน่งใน step list นี้ · ENV ไม่ใช่ step ที่หยุดรอ — สภาพฉาก ณ `lineIndex` = ผลรวม ENV ทั้งหมดก่อนหน้า (resume จึงได้ฉากถูกต้อง) · ตัวเลือกที่เลือก = รายการล่าสุดใน `choiceLog` ของ choice นั้น |
| Tokens | แทน `{A} {B} {in} {out} {me} {other} {you} {in.end} {out.end}` และ fragment Template จาก Flag · token ที่ไม่รู้จัก → throw ใน dev, แสดงเป็นว่างใน prod + log |
| Conditions | `flag eq`, `scenario.priorWarning`, `all`, `any` |
| Controller | คำนวณว่าใครควบคุมบรรทัด CHOICE จาก `owner` + Scenario + โหมด + Part (Ch2 สลับ) → ส่ง `perspective` ให้ PerspectiveBanner |
| ENV | ส่งคำสั่งไป SceneCanvas (background, rain level, light mode, haze, shake, split) |
| Save | ทุก CHOICE/QUESTION → dispatch ไป store → autosave |
| Fallback | Flag ว่างจากการข้าม → เลือก line ที่มี `when: { flag: X, unset: true }` หรือข้อความ fallback ทั่วไป |
| เล่นซ้ำ | "เริ่มบทใหม่" ล้าง `flags`, `choiceLog`, `skippedScenes` ของบทนั้น (ตัวเลือกเดิมถูกแทนที่ — [05](05-game-flow.md) §6) · "ดูอย่างเดียว" เล่นจาก state ในหน่วยความจำ ไม่เขียนลง Save |

**Content Lint (unit test, `npm run content:lint`):** ทุก `next` ชี้ไป scene ที่มีอยู่ · ไม่มี scene ที่ไปไม่ถึง · ทุก Flag ที่ใช้ใน `when` มีผู้ตั้ง · ทุก tag อยู่ใน signals registry · ทุก option id ไม่ซ้ำ · ไม่มีคำต้องห้าม ([04](04-personality-system.md) §4.2) · ทุก Background key อยู่ใน asset registry · ทุก token แทนค่าได้ครบในทุกชุด Flag/Scenario (ไม่มี `{` ค้าง) · choice id ไม่ซ้ำทั้งบท

---

## 5. Persistence

ตาม [07](07-data-architecture.md) §10–12:
- `load()`: probe → read → parse → zod → migrate → store
- `save()`: debounce 300ms + flush on `visibilitychange`/`pagehide`
- `storage` event: ตรวจ Save ถูกแก้จากแท็บอื่น → ล็อก UI + ขอให้โหลดใหม่
- Draft: debounce 2s

---

## 6. Rendering & Performance

| เป้าหมาย | ค่า |
|---|---|
| Initial JS (gzip) | ≤ 250 KB (ไม่รวมฟอนต์) |
| ฟอนต์รวม | ≤ 400 KB (subset) |
| LCP (มือถือระดับกลาง, 4G) | ≤ 2.5s |
| Animation | 60fps บนเดสก์ท็อป, ≥ 30fps บนมือถือระดับกลาง · Effects หยุดเมื่อแท็บไม่แสดง |
| Code splitting | แยก chunk ต่อบท (`content/th/chapters/*`) และ S8/S9 |
| Pixel assets | Background วาดด้วยคำสั่งบน canvas 320×180, Sprite จาก string พิกเซล ([09](09-asset-specification.md) §1.2) · วาดครั้งเดียวต่อ key/Appearance แล้ว cache (`Map<key, ImageBitmap>`) · ห้าม SVG rect ทีละพิกเซล |

---

## 7. Browser Support

Safari iOS 16+, Chrome Android 110+, Chrome/Edge/Firefox/Safari desktop 2 เวอร์ชันล่าสุด · ต้องมี WebCrypto (`crypto.subtle`) สำหรับ PIN/Sealed (แสดงข้อความถ้าไม่มี — ฟีเจอร์นั้นปิด เกมหลักยังเล่นได้)

---

**เต็มจอ:** Fullscreen API ที่รองรับ (รวม prefix `webkit`) · iPhone ใช้ Web App Manifest + `apple-mobile-web-app-capable` เปิดจากหน้าจอโฮม ([06](06-ui-ux-specification.md) "เต็มจอ") · ไม่ใช้ service worker

## 8. MVP (Phase 1) — Scope

| รวม | ไม่รวม |
|---|---|
| S1, S1a, S2 (โหมดอื่นเป็น "เร็ว ๆ นี้"), S3, S4, S5, S5a, S6, S7 (Solo), S8, S9, S10, S11, S14, S15, S18 | Play Together, PIN, Handoff, Reveal state machine (UI) |
| Journey ที่ใช้งานได้ทีละ 1 อัน (อันที่จบแล้วเก็บเป็น archived) | S1b Journey List, Import แบบรวม/แก้ id ชน (Phase 2 — audit M-5) |
| Ch1–Ch5 ครบตาม [02](02-story-script.md) | Memory Scenes |
| Q01–Q36 (Quick/Full) + M01–M07 + Reflection | LLM / AI generation ใด ๆ |
| Comparison (Solo rules) + Report + Export TXT/JSON/PNG + Import JSON (`scope=full` เท่านั้น) | Observed patterns (Phase 2 — audit M-7) |
| localStorage + Zod + ตรวจ schemaVersion (รายการ migration ว่าง) + S18 | Backend, Remote, Analytics |
| Pixel assets แบบวาดด้วยโค้ดบน canvas (P0 ตาม [09](09-asset-specification.md)) | Local encryption |
| — | ~~เสียง~~ → ทำแล้ว (2026-11-23) ด้วย WebAudio, `FEATURES.sound = true` ค่าเริ่มต้นเปิด (2026-11-23) ([09](09-asset-specification.md) §5) |
| Reduced motion, font scale, text speed, keyboard, a11y ตาม [06](06-ui-ux-specification.md) §4 | — |

**MVP Definition of Done:** ผ่าน Test cases ที่ทำเครื่องหมาย `MVP` ใน [11](11-testing-and-acceptance-criteria.md) ทั้งหมด

---

## 9. Phase 2 — Two-player Pass-and-play

| งาน | รายละเอียด |
|---|---|
| Together mode | S2 เปิดใช้, S3 สร้าง 2 คน, Controller logic สำหรับ Ch2 สลับ |
| Handoff | S12 + `navigate(…, { replace: true })` สำหรับหน้าลับ + กันการย้อนกลับ |
| PIN | S13 + PBKDF2 + lockout + Forgot PIN flow |
| Reveal engine | State machine R1–R7 + UI Consent/Waiting/Reveal ใน S7, Ch3 S05, Ch5 |
| Private answers | Selector ที่กรองข้อมูลตาม `activePlayerId` — **ทุก selector ที่คืนคำตอบต้องรับ `viewerId`** และมี unit test ว่าไม่คืนข้อมูลที่ยังไม่ Reveal |
| Comparison (Together rules) | ใช้เฉพาะ Revealed |
| Memory Scenes | S16 (A-06) |
| Journey List + Import แบบรวม | S1b, `scope=journey`, แก้ id ชน |
| Observed patterns | เพิ่ม tag ให้มิติที่มี < 3 ก่อน แล้วทำ engine + การ์ด |
| เสียง | ✅ ทำแล้วด้วย WebAudio (Q-08) |
| Link imagined → real | [05](05-game-flow.md) §4.3 |

---

## 10. Phase 3 — Remote

### 10.1 Phase 3A — Sealed Exchange (ไม่ต้องมี Backend)

- `scope=invitation` และ `scope=sealed` ใน Export/Import
- AES-GCM-128 ผ่าน WebCrypto · Key แสดงเป็น Base32
- S17 แท็บไฟล์ + ข้อความข้อจำกัด ([08](08-privacy-and-safety.md) §6.1)

### 10.2 Phase 3B — Supabase

| งาน | รายละเอียด |
|---|---|
| Infra | Supabase project (region ใกล้ไทย เช่น Singapore) · migrations SQL ใน `supabase/migrations/` · RLS ตาม [08](08-privacy-and-safety.md) §6.2 |
| Auth | Anonymous sign-in |
| RPC | `create_session`, `create_invite`, `revoke_invite`, `join_session(code)`, `submit_answer`, `set_consent`, `get_revealed`, `leave_session`, `delete_session` |
| Sync | Realtime subscription เฉพาะตาราง `consents`, `session_members` (ไม่ subscribe `answers`) · เนื้อเรื่องไม่ sync ([05](05-game-flow.md) §5.0) |
| Offline | คิว `pendingUploads` + retry exponential backoff (1s → 60s) |
| Cleanup | Scheduled function ลบเซสชันไม่มีกิจกรรม 90 วัน |
| Config | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` ผ่าน env — ไม่ commit · ถ้าไม่มี env → S2 แสดง "ออนไลน์: ยังไม่ได้ตั้งค่า" และปิดใช้งาน (ไม่ fake) |
| Tests | Integration test กับ Supabase local (CLI) รวม RLS negative tests |

**ห้าม:** แสดง UI ว่า "เชื่อมต่อแล้ว/ซิงก์แล้ว" ถ้าไม่ได้รับการยืนยันจาก Server จริง

### 10.3 Phase 3C — Live (Docker บน Portainer หลัง Cloudflare)

| งาน | รายละเอียด |
|---|---|
| Deploy | `docker-compose.yml` เป็น Stack ใน Portainer: `app` (`Dockerfile`: Node 22 เสิร์ฟ `dist/` + `/api/live` ที่พอร์ต 8080, instance เดียว) + `db` (PostgreSQL 16, volume) + `tunnel` (cloudflared, ใช้ `CLOUDFLARE_TUNNEL_TOKEN`) · HTTPS มาจาก Cloudflare · ไม่มี `DATABASE_URL` → เก็บในหน่วยความจำ (dev/test เท่านั้น) · SSE ส่ง ping ทุก 25 วินาที (Cloudflare ตัด connection ที่เงียบเกิน 100 วินาที) |
| Server | `server/index.mjs` — Node `http` ล้วน + `pg` · ไม่มี framework |
| API | `GET /api/live/health` · `POST /api/live/rooms/:room/slots/:n` (claim ช่อง → คืน write token ครั้งเดียว) · `PUT /api/live/rooms/:room/slots/:n` (Bearer token, body `{iv, data}` ≤ 512 KB) · `GET /api/live/rooms/:room` (ทั้งสองช่อง + `rev`) · `GET /api/live/rooms/:room/events?slot=n` (SSE: `rev`, `presence`) · `DELETE /api/live/rooms/:room/slots/:n` |
| Data | ตาราง `live_slots(room, slot, token_hash, iv, data, rev, updated_at)` · ลบห้องที่ `updated_at` เก่ากว่า 30 วัน ทุกชั่วโมง |
| Limits | `room` = base64url 22 ตัว · 2 ช่องต่อห้อง · body ≤ 512 KB · 120 requests/นาที/IP |
| Client | `src/live/` — `crypto.ts` (AES-GCM-256 · โค้ดห้อง → roomId+กุญแจ ด้วย PBKDF2 ดู docs/08 §6.3), `api.ts`, `merge.ts` (pure), `sync.ts` (subscribe store → push ช่องตัวเอง debounce 400 ms · SSE → pull → merge) |
| Merge | เจ้าของชนะ: ผู้เล่น/โปรไฟล์/storyAnswers/entries ของ mirrorItems/observed/nextConversation ของคนไหน ใช้ฉบับจากเครื่องคนนั้น · `chapterProgress` ใช้ `syncSeq` มากกว่า (เท่ากัน → ใช้ของช่อง 0) · `pendingPrivateSteps` = intersection · `skippedScenes`/`choiceLog` = union · Reveal: คำนวณ state ใหม่ — ถือว่ายินยอมเฉพาะเมื่อ `consentAt` ไม่เก่ากว่าการแก้คำตอบล่าสุดของทั้งสองฝ่าย |
| Mode | `GameSession.mode = 'remote_online'` · `remote = { kind: 'online', sessionId: room, liveSlot, liveKey, liveToken, localPlayerId }` (อยู่ในเครื่องเท่านั้น ไม่ส่ง) |
| Feature flag | S2 เรียก `/api/live/health` · ไม่ตอบ → "เล่นสด" ปิดใช้งานพร้อมเหตุผล |

**ห้าม:** แสดง "ส่งแล้ว" จนกว่าเซิร์ฟเวอร์ตอบ 200 · ส่งข้อมูลไม่เข้ารหัส · ใส่กุญแจใน query string/path

---

## 11. Build, Deploy, CI

| ส่วน | รายละเอียด |
|---|---|
| Scripts | `dev`, `build`, `preview`, `test`, `test:e2e`, `lint`, `typecheck`, `content:lint` |
| CI (GitHub Actions) | ทุก PR: typecheck → lint → unit → content lint → build → e2e (Chromium + WebKit mobile) → axe |
| Deploy | Static host (A-17, Q-10) · ตั้ง CSP header ตาม [08](08-privacy-and-safety.md) §10 |
| Versioning | `appVersion` (SemVer) แสดงใน S1/S10 · `schemaVersion`, `contentVersion` แยก |
| Repository | `https://github.com/Bxbt/IF-YOU-WERE-ME-AND-I-WERE-YOU` (branch `main`) |
