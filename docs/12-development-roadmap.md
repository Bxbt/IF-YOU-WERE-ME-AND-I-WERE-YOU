# 12 — Development Roadmap

> เจ้าของข้อมูล: ลำดับงาน Milestones และ Exit criteria
> ระยะเวลาเป็นการประเมินคร่าว ๆ สำหรับนักพัฒนา 1 คน + AI Coding Agent ไม่ใช่ข้อผูกมัด

---

## 0. ก่อนเริ่มเขียนโค้ด (Gate 0)

| งาน | สถานะ |
|---|---|
| เอกสาร 00–12 | ✅ Draft v0.1 |
| เจ้าของตอบคำถามที่บล็อก MVP | ไม่มีคำถามที่บล็อก MVP — ใช้ Assumptions ได้ ([00](00-project-overview.md) §6) |
| เจ้าของตรวจบท [02](02-story-script.md) | ⏳ แนะนำให้ทำก่อน M3 (แก้ Content ไม่กระทบโค้ด) |
| Pre-development audit | ✅ แก้ Critical/High ครบ ([reviews/pre-development-audit-2026-11-22.md](../reviews/pre-development-audit-2026-11-22.md)) |
| Git repository | ✅ `main` → `github.com/Bxbt/IF-YOU-WERE-ME-AND-I-WERE-YOU` |

---

## 1. MVP (Phase 1) — Play Alone

| Milestone | งาน | Exit Criteria | ประเมิน |
|---|---|---|---|
| **M1 Foundation** | Vite + React + TS + Tailwind + Framer + Lucide · tokens.css · ฟอนต์ self-host · Router (hash, routes มี journeyId) · Zustand store · Persistence (probe → parse → Zod → ตรวจ schemaVersion; รายการ migration ว่าง) · Zod schema ตาม [07](07-data-architecture.md) · Export/Import `full` · S18 · CI (typecheck, lint, unit, build) | `npm run build` ผ่าน · TC-ERR-01/02/03, TC-EXP-01–04, TC-DEL-04/07 ผ่าน · CI เขียว | 3–4 วัน |
| **M2 UI Shell** | Shared components ([06](06-ui-ux-specification.md) §2) · S1, S1a, S2, S10, S11, S14 · Error boundary · 404 | ทุกปุ่มบน S1/S2/S10 ทำงาน · TC-A11Y-01 สำหรับหน้าจอเหล่านี้ · TC-RWD-01 | 3–4 วัน |
| **M3 Characters & Profile** | Pixel character renderer (layers, palette swap) · AvatarPicker · S3 + Profile Hub · Content Q01–Q36 · S4 (Quick/Full, Edit mode) · Personality engine | TC-PROF-01–06 · TC-SKIP-01–05 | 4–5 วัน |
| **M4 Dialogue Engine & Scene** ✅ | Content model · Dialogue interpreter · Conditions/Tokens/Flags · SceneCanvas · Effects (rain, stars, emergency light, haze) · Backgrounds P0 · S5, S5a, S6 · Autosave/Resume · Content lint | Ch1 เล่นจบได้ · TC-PLAY-04/06 · TC-RES-01–04 | 6–8 วัน |
| **M5 Chapters 2–5** ✅ | Content ch2–ch5 · Part C Timeline · Interpretation Check · Safety notes · Solo Mirror (S7) · Ch5 statements · S15 Ending | TC-PLAY-01–10 · TC-REV-09 | 6–8 วัน |
| **M6 Insight** ✅ | Comparison engine + S8 · Report engine + S9 · Next Conversation · Export TXT/PNG | TC-SKIP-09–14 · TC-EXP-06–10 | 5–6 วัน |
| **M7 Polish & QA** ✅ (อัตโนมัติ — ที่เหลือต้องให้คนตรวจ: [reviews/mvp-qa-2026-11-22.md](../reviews/mvp-qa-2026-11-22.md)) | Responsive ทุกหน้าจอ · Reduced motion · Keyboard · Safety keyword card · Asset P1 (ถ้าทัน) · Lighthouse · Manual QA · Content review | MVP Acceptance Criteria ([11](11-testing-and-acceptance-criteria.md) §15) ครบ | 4–5 วัน |

**รวม MVP ≈ 31–40 วันทำงาน**

### ลำดับความเสี่ยง MVP

| ความเสี่ยง | ผลกระทบ | การลดความเสี่ยง |
|---|---|---|
| Pixel art ที่สร้างจากโค้ดดูไม่สวยพอ | สูง ต่อความรู้สึก "indie game" | ทำ Background 1 ฉาก + ตัวละคร 1 ตัวเป็น prototype ใน M3/M4 ให้เจ้าของดูก่อน · Asset registry เปลี่ยนเป็น PNG ได้ |
| ฟอนต์ไทยกับ UI pixel ไม่เข้ากัน | กลาง | ทดสอบใน M2 · เตรียมฟอนต์สำรอง (Q-06) |
| บทยาวเกินบนมือถือ | กลาง | ทดสอบ Ch1 บนมือถือจริงใน M4 · ปรับความยาวบรรทัด ≤ 80 ตัวอักษร |
| ความซับซ้อนของ Flag/Condition | กลาง | Content lint ตั้งแต่ M4 |

---

## 2. Phase 2 — Play Together

| Milestone | งาน | Exit Criteria | ประเมิน |
|---|---|---|---|
| **M8 Two Players** | Together mode ใน S2/S3 · Controller logic (Ch2 สลับ) · S12 Handoff · `navigate(…, { replace: true })` · Viewer-scoped selectors | TC-PLAY-11 · TC-PRIV-01/02/03/08 | 4–5 วัน |
| **M9 PIN** | S13 · PBKDF2 · Lockout · Forgot PIN · ข้อความข้อจำกัด | TC-PRIV-04–07 | 2–3 วัน |
| **M10 Reveal** ✅ | Reveal engine (R1–R7) · UI Waiting/Consent/Reveal ใน S7, Ch3, Ch4, Ch5 · Comparison (Together rules) | TC-REV-01–08, 10 · TC-PRIV-09 | 4–5 วัน |
| **M10b Profile reveal** ✅ | เปิดคำตอบ Profile Q01–Q36 ต่อ Journey ([04](04-personality-system.md) §6.3.0) จาก S8 — engine รองรับแล้ว (`kind: 'profile'`) ยังไม่มี UI · ต้องรวมคำตอบ Perceived ด้วย | Test ใหม่ (เพิ่มใน 11 ก่อนเริ่ม) | 2–3 วัน |
| **M11 Memory Scenes** ✅ | S16 · MemoryScene schema · Template conversion · Reveal สำหรับความทรงจำ | Test ใหม่ TC-MEM-* (เพิ่มใน 11 ก่อนเริ่ม) | 3–4 วัน |
| **M11b Deferred from MVP** | ~~Journey List (S1b) + Import แบบรวม~~ (ทำแล้ว 2026-11-23) · Observed patterns · ~~เสียง~~ (ทำแล้ว 2026-11-23) · ~~Link imagined → real~~ (ทำแล้ว 2026-11-23) | TC-RES-05, TC-EXP-05, TC-PROF-07/08 | 4–5 วัน |

**รวม Phase 2 ≈ 13–17 วัน**

---

## 3. Phase 3 — Remote

| Milestone | งาน | Exit Criteria | ประเมิน |
|---|---|---|---|
| **M12 Sealed Exchange (3A)** | Invitation/Sealed export-import · AES-GCM · Reveal key UI · S17 แท็บไฟล์ | TC-EXP-11/12 · Manual test 2 เครื่อง | 4–5 วัน |
| **Gate 3B** | Q-03 (ส่วนตัว/สาธารณะ) และ Q-05 ได้คำตอบ · ถ้าสาธารณะ: Privacy Policy ผ่านการตรวจ | — | — |
| **M13 Supabase Foundation (3B)** | Project · SQL migrations · RLS · RPC · Anonymous auth · Supabase local ใน CI | TC-RMT-01–07, 09 | 5–6 วัน |
| **M14 Remote Client (3B)** | RemoteAdapter · S17 · Realtime (consents/members/events) · Offline queue · Revoke/Delete/Leave · Expiry job | TC-RMT-08, 10, 11 · TC-DEL-06 | 5–6 วัน |

**รวม Phase 3 ≈ 14–17 วัน**

---

## 4. Backlog (ยังไม่อยู่ใน Phase ใด)

| รายการ | หมายเหตุ |
|---|---|
| Local encryption ด้วย Passphrase | [08](08-privacy-and-safety.md) §4.5 |
| ภาษาอังกฤษ | Q-14 · โครงสร้าง content รองรับแล้ว |
| PWA / ติดตั้งบนมือถือ / เล่นออฟไลน์ | ต้องตัดสินใจเรื่อง cache ข้อมูล |
| Pixel art แบบวาดมือ (PNG) แทน SVG | Q-13 · ผ่าน asset registry |
| เพลงประกอบต้นฉบับ | Q-08 |
| Account recovery สำหรับ Remote | ต้องเก็บข้อมูลติดต่อ → กระทบ PR4 |
| บทเพิ่มเติม / สถานการณ์อื่นนอกจากลิฟต์ | ใช้ Content model เดิม |

---

## 5. Definition of Ready (ต่อ Milestone)

ก่อนเริ่ม Milestone ใด ต้องมี:
1. Test cases ของ Milestone นั้นอยู่ใน [11](11-testing-and-acceptance-criteria.md)
2. Content ที่ต้องใช้อยู่ใน [02](02-story-script.md) / [03](03-question-bank.md) ครบ
3. ไม่มีคำถามใน [00](00-project-overview.md) §6 ที่บล็อก Milestone นั้น

## 6. Definition of Done (ต่อ Milestone)

1. Exit criteria ผ่าน
2. CI เขียว
3. ไม่มี TODO ที่ทำให้ UI แสดงฟีเจอร์ที่ไม่ทำงาน
4. เอกสารที่เกี่ยวข้องอัปเดตถ้าการทำจริงต่างจาก Spec (แก้เอกสารก่อน แล้วค่อย merge โค้ด)
