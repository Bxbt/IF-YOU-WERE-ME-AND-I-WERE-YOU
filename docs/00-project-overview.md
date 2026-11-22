# 00 — Project Overview

**IF YOU WERE ME, AND I WERE YOU**
*Two hearts. Two perspectives. One story.*

| รายการ | ค่า |
|---|---|
| สถานะเอกสาร | v0.2 — แก้ตาม Pre-development audit แล้ว (Critical/High ครบ) · คำถามใน §6 ที่เหลือไม่บล็อก MVP |
| วันที่จัดทำ | 2026-11-22 |
| Schema Version ที่อ้างอิง | `1.0.0` (ดู [07-data-architecture.md](07-data-architecture.md)) |
| ภาษาเริ่มต้นของเกม | ไทย (ชื่อเกมเป็นภาษาอังกฤษ) |

---

## 1. ผลการตรวจสอบโปรเจกต์ (Project Audit)

### 1.1 ไฟล์ที่มีอยู่ก่อนเริ่มงาน

ตรวจสอบเมื่อ 2026-11-22: โฟลเดอร์โปรเจกต์ **ว่างเปล่า** ไม่มีไฟล์ ไม่มีโค้ด ไม่มี Asset ไม่มี git repository

แหล่งข้อมูลเดียวที่มีคือ **Master Prompt** ที่เจ้าของโปรเจกต์วางไว้ในแชต (ไม่ได้อยู่ในไฟล์) ซึ่งประกอบด้วย 16 หัวข้อ + ส่วนแนะนำภาพอ้างอิง + ฟีเจอร์ "What You See vs. What I Feel" + ข้อความตอนจบ

ภาพอ้างอิงใน Master Prompt เป็นเพียงลิงก์ชั่วคราวของ `images.openai.com` และเป็นผลงานลิขสิทธิ์ของผู้อื่น (To The Moon, Deltarune, Asset Pack บน itch.io ฯลฯ) **ไม่สามารถใช้เป็น Asset ได้** และไม่ได้ถูกดาวน์โหลดมา

### 1.2 สิ่งที่ Master Prompt กำหนดไว้แล้ว

- Vision, ปรัชญา, Tagline, Palette 7 สี, Art direction 16-bit
- 3 โหมด (Alone / Together / Remote) และหลักการ Private-by-default
- แยก Self-reported กับ Perceived profile
- 12 Personality Dimensions (ชื่อ) และตัวอย่างคำถาม 3 ข้อ
- โครง 5 Chapters (ยังไม่มีบท)
- Perspective Mirror, Personality Comparison (3 หมวด), Reflection Report
- กฎ Emotional Safety และรายการสิ่งที่ห้ามสร้าง (Score/Ranking/Diagnosis)
- Stack: React, TypeScript, Tailwind, Framer Motion, Lucide

### 1.3 สิ่งที่ขาด (ได้รับการเติมในเอกสารชุดนี้)

| สิ่งที่ขาด | เติมไว้ที่ |
|---|---|
| บทพูดและฉากจริงทั้ง 5 บท | [02-story-script.md](02-story-script.md) |
| คลังคำถามครบ 12 มิติ | [03-question-bank.md](03-question-bank.md) |
| กฎการประมวลผลบุคลิกภาพและการเปรียบเทียบ | [04-personality-system.md](04-personality-system.md) |
| User flow ทุกโหมด + Edge cases | [05-game-flow.md](05-game-flow.md) |
| Layout/State ของทุกหน้าจอ | [06-ui-ux-specification.md](06-ui-ux-specification.md) |
| Data schema + Export/Import | [07-data-architecture.md](07-data-architecture.md) |
| ข้อจำกัด PIN/localStorage, Access control | [08-privacy-and-safety.md](08-privacy-and-safety.md) |
| รายการ Asset ทั้งหมด | [09-asset-specification.md](09-asset-specification.md) |
| Architecture, โครงสร้างโฟลเดอร์, Phase | [10-technical-specification.md](10-technical-specification.md) |
| Test cases | [11-testing-and-acceptance-criteria.md](11-testing-and-acceptance-criteria.md) |
| ลำดับการพัฒนา | [12-development-roadmap.md](12-development-roadmap.md) |

### 1.4 สิ่งที่ขัดแย้งกันใน Master Prompt และวิธีที่เอกสารนี้จัดการ

| # | ความขัดแย้ง | การจัดการชั่วคราว | สถานะ |
|---|---|---|---|
| C-1 | ส่วนแนะนำภาพระบุชื่อตัวละครเฉพาะ แต่ Master Prompt ให้ผู้เล่นตั้งชื่อเอง | ผู้เล่นตั้งชื่อเอง ไม่ hardcode ชื่อใด (A-01) | ตัดสินแล้ว (Q-01) |
| C-2 | Chapter 1 และ Chapter 2 เล่าเหตุการณ์ลิฟต์ซ้ำกัน | Ch1 = เล่าเหตุการณ์จากบทบาทของตัวเอง, Ch2 = เล่นสลับรองเท้า (มุมมองของอีกฝ่าย) ทีละช่วงเวลา | กำหนดแล้ว |
| C-3 | มีข้อความตอนจบ 2 ชุด | แสดงทั้งสองชุดต่อกัน (A-13) | รอ Q-07 |
| C-4 | Master Prompt บอกให้มี JSON fallback เมื่อไม่มี Backend แต่ไฟล์ JSON ธรรมดาไม่สามารถปิดคำตอบไว้ได้จริง | ออกแบบ "Sealed Exchange" ที่เข้ารหัสคำตอบด้วยกุญแจที่เปิดเผยภายหลัง (Phase 3A) | 3A ทำแล้ว (M12) · 3B รอ Q-05 + Supabase |
| C-5 | "Remembers previous safety warnings" ดูเหมือนรายละเอียดจากเหตุการณ์จริง | ทำเป็นตัวแปรฉากที่ผู้เล่นเปิด/ปิดได้ เนื้อเรื่องทั้งหมดเป็นเรื่องสมมติ (A-03) | รอ Q-02 |
| C-6 | Master Prompt ใช้คำว่า "Generate" (Report, Dialogue, Memory Scene) โดยไม่ระบุว่าใช้ AI หรือไม่ | MVP ใช้ Template ทั้งหมด ไม่มี LLM | กำหนดโดยเจ้าของแล้ว |
| C-7 | Memory Scenes อยู่ใน Master Prompt แต่ไม่ได้อยู่ใน Phase ใด | วางไว้ Phase 2 (A-06) | รอ Q-04 |

---

## 2. สรุปโปรเจกต์

เกม Narrative แบบ Pixel Art 16-bit สำหรับคู่รัก ใช้สถานการณ์สมมติ (คนหนึ่งติดลิฟต์ อีกคนรออยู่ข้างนอก) เพื่อให้ผู้เล่นได้ลองมองเหตุการณ์เดียวกันจากสองมุม แล้วเปรียบเทียบสิ่งที่ตัวเองรู้สึก กับสิ่งที่อีกฝ่ายคิดว่าเรารู้สึก

**สิ่งที่เกมนี้ไม่ใช่:** แบบทดสอบความเข้ากันได้, การวินิจฉัยทางจิตวิทยา, การบำบัด, เครื่องมือตัดสินว่าใครผิด

---

## 3. ดัชนีเอกสาร (Single Source of Truth)

| ไฟล์ | เป็นเจ้าของข้อมูลเรื่อง |
|---|---|
| 00-project-overview.md | Audit, Glossary, Assumptions, คำถามที่ต้องตัดสินใจ |
| 01-game-design-document.md | Vision, Mechanics, Modes, Player Journey, Design Principles |
| 02-story-script.md | บท ฉาก Dialogue Choices ทั้งหมด (Scene IDs) |
| 03-question-bank.md | คำถาม Q01–Q36, Mirror M01–M07, Option IDs |
| 04-personality-system.md | กฎการเก็บ ประมวลผล เปรียบเทียบ และแสดงผล |
| 05-game-flow.md | Flow ทุกโหมด, การข้าม, การเล่นต่อ, Edge cases |
| 06-ui-ux-specification.md | หน้าจอ, Components, States, Responsive |
| 07-data-architecture.md | Schema, Storage keys, Export/Import, Migration |
| 08-privacy-and-safety.md | กฎการเข้าถึง, Reveal, ข้อจำกัดความปลอดภัย, เนื้อหาอ่อนไหว |
| 09-asset-specification.md | Asset list, ขนาด, Art direction |
| 10-technical-specification.md | Stack, Architecture, Folder structure, Phase scope |
| 11-testing-and-acceptance-criteria.md | Test cases และ Acceptance criteria |
| 12-development-roadmap.md | Milestones และ Exit criteria |

**กฎ:** หากข้อมูลในสองไฟล์ขัดกัน ให้ยึดไฟล์ที่ "เป็นเจ้าของข้อมูลเรื่องนั้น" ตามตารางนี้ และแก้อีกไฟล์ให้ตรงกัน Master Prompt เดิมถือเป็นแหล่งที่มา ไม่ใช่ Spec — เอกสารชุดนี้แทนที่ Master Prompt

---

## 4. Glossary

| คำ | ความหมาย |
|---|---|
| Player A / Player B | ผู้เล่นสองคน A คือผู้สร้าง Journey เสมอ |
| Imagined Partner | ใน Play Alone: โปรไฟล์ของคู่ที่ผู้เล่นสร้างจาก "สิ่งที่ตัวเองคิด" เท่านั้น ไม่ใช่คนจริง |
| Role: `insider` | ตัวละครที่ติดอยู่ในลิฟต์ (ในเรื่องสมมติ) |
| Role: `waiter` | ตัวละครที่รออยู่ข้างนอก |
| Self-reported | สิ่งที่ผู้เล่นบอกเกี่ยวกับตัวเอง |
| Perceived | สิ่งที่ผู้เล่นคิดว่าอีกฝ่ายเป็น (สมมติฐาน ไม่ใช่ข้อเท็จจริง) |
| Observed Pattern | รูปแบบตัวเลือกที่เกมสังเกตได้จากการเล่น (แสดงอย่างระมัดระวัง) |
| Meta Answer | ตัวเลือกพิเศษ: ขึ้นอยู่กับสถานการณ์ / ไม่แน่ใจ / ไม่สะดวกตอบ / ข้าม |
| Mirror | การตอบคำถามเดียวกันแยกกัน แล้วเปิดพร้อมกัน |
| Reveal | การเปิดคำตอบให้อีกฝ่ายเห็น ต้องได้รับความยินยอมจากทั้งสองฝ่าย |
| Handoff Screen | หน้าจอบังตาเมื่อส่งเครื่องให้อีกคน |
| Journey | การเล่นหนึ่งรอบ (ผูกกับผู้เล่น 1 หรือ 2 คน) |

---

## 5. Assumptions Register

สมมติฐานที่เอกสารใช้ไปก่อนเพื่อให้ Spec ไม่มีช่องว่าง **ทุกข้อเปลี่ยนได้** เมื่อเจ้าของตัดสินใจ

| ID | สมมติฐาน | ผลกระทบถ้าเปลี่ยน | คำถามที่เกี่ยวข้อง |
|---|---|---|---|
| A-01 | ไม่ hardcode ชื่อตัวละคร ผู้เล่นตั้งชื่อเอง ค่า placeholder คือ "ผู้เล่น A" / "ผู้เล่น B" | ต่ำ (แก้ default ใน content) | Q-01 |
| A-02 | ฉากเป็นเรื่องสมมติทั้งหมด: เย็นวันฝนตก อพาร์ตเมนต์ ลงไปรับพัสดุ ลิฟต์ค้างระหว่างชั้น 6–7 ประมาณ 30 นาที | กลาง (แก้บท) | Q-02 |
| A-03 | ตัวแปร "เคยเตือนเรื่องลิฟต์มาก่อน" (`priorWarning`) ค่าเริ่มต้น = เปิด ผู้เล่นปิดได้ | ต่ำ | Q-02 |
| A-04 | ใช้ชื่อแทนสรรพนามเพศ และให้ผู้เล่นเลือก "คำลงท้าย" ของตัวเอง (ครับ/ค่ะ/นะ/ไม่ใช้) | ต่ำ | — |
| A-05 | ใน Play Together ตัวเลือกเนื้อเรื่องของ Ch1–Ch3 เป็นแบบเปิดเผย (เล่นดูด้วยกัน) ส่วนที่เป็นความลับคือ Reflection, Mirror และ Ch5 | กลาง (Flow) | Q-09 |
| A-06 | Memory Scenes อยู่ใน Phase 2 ไม่อยู่ใน MVP | ต่ำ | Q-04 |
| A-07 | ใช้ Vite + Zustand + Hash Router + Vitest + Playwright | กลาง | — |
| A-08 | ฟอนต์: หัวเรื่องอังกฤษใช้ pixel font (Silkscreen, OFL) เนื้อหาไทยใช้ "IBM Plex Sans Thai" (OFL) แบบ self-host | ต่ำ | Q-06 |
| A-09 | ~~เสียงปิดเป็นค่าเริ่มต้น~~ → **เปิดเป็นค่าเริ่มต้น** (เจ้าของตัดสิน 2026-11-23) เสียงสังเคราะห์ด้วย WebAudio · เบราว์เซอร์ยังเงียบจนผู้เล่นแตะหรือกดคีย์ครั้งแรก | ต่ำ | Q-08 |
| A-10 | Phase 3 แนะนำ Supabase (Postgres + Row Level Security) มากกว่า Firebase | กลาง | Q-05 |
| A-11 | มี Phase 3A "Sealed Exchange" (ไม่มี Backend) ก่อน Phase 3B (Supabase) | กลาง | Q-05 |
| A-12 | เบอร์สายด่วนในหน้า Safety (1323, 1300, 191) ต้องตรวจสอบความถูกต้องก่อนปล่อย | ต่ำ | Q-11 |
| A-13 | ตอนจบแสดงข้อความทั้งสองชุดต่อกัน | ต่ำ | Q-07 |
| A-14 | Personality Setup มี 2 แบบ: ฉบับสั้น 12 ข้อ (มิติละ 1) และฉบับเต็ม 36 ข้อ | ต่ำ | — |
| A-15 | Observed Pattern (Phase 2) แสดงเมื่อมีสัญญาณในมิติเดียวกันอย่างน้อย 3 ครั้ง | ต่ำ | — |
| A-16 | Reflection Card ส่งออกเป็น PNG โดยวาดลง `<canvas>` เอง (ไม่พึ่ง screenshot library) | ต่ำ | — |
| A-17 | Hosting เป็น static site (เช่น Vercel/Netlify/GitHub Pages) | ต่ำ | Q-10 |
| A-18 | กลุ่มเป้าหมายอายุ 18 ปีขึ้นไป | ต่ำ | Q-03 |
| A-19 | ไม่มี Analytics / Tracking ใด ๆ ใน MVP | ต่ำ | Q-12 |
| A-20 | PIN เป็น "ทางเลือก" ไม่บังคับ ใน Phase 2 | ต่ำ | Q-09 |
| A-21 | ตรวจคำอ่อนไหวในข้อความอิสระ **ภายในเครื่อง** เพื่อแสดงการ์ดแหล่งช่วยเหลือ ไม่บันทึก ไม่ส่งข้อมูล ([08](08-privacy-and-safety.md) §9.3) | ต่ำ | Q-11 |
| A-23 | MVP มี Journey `active` ได้ทีละ 1 อัน · Import รองรับเฉพาะแทนที่ทั้งหมด · ไม่มีเสียง · ไม่มี Observed (audit M-5, M-7, M-9) | ต่ำ | — |
| A-24 | Remote: เนื้อเรื่อง Ch1–Ch3 เล่นแบบ Solo บนเครื่องตัวเอง แชร์เฉพาะ Mirror/Profile ที่เลือก/Statements (audit H-1) | กลาง | Q-05 |
| A-22 | ในไฟล์ Content คำเรียกคู่ ("เธอ") เขียนเป็น token `{you}` และแปลงตาม `addressStyle` ของผู้พูด — ในเอกสารบทแสดงเป็น "เธอ" เพื่อให้อ่านง่าย | ต่ำ | — |

---

## 6. คำถามที่ต้องการให้เจ้าของโปรเจกต์ตัดสินใจ

| ID | คำถาม | ตัวเลือก | ค่าแนะนำ | บล็อก |
|---|---|---|---|---|
| Q-01 | ต้องการให้ชื่อตัวละครเฉพาะปรากฏในเกมไหม | **ตัดสินแล้ว:** ไม่ใส่ชื่อเฉพาะ ผู้เล่นตั้งเอง | — | — |
| Q-02 | เหตุการณ์ลิฟต์อิงเหตุการณ์จริงหรือไม่ ถ้าใช่ มีรายละเอียดใดที่ "ไม่ควร" ใส่ หรือ "ควร" ใส่ | ระบุ | ใช้เรื่องสมมติตาม A-02 | ไม่บล็อก (บทแก้ได้) |
| Q-03 | เกมนี้สำหรับใช้ส่วนตัวสองคน หรือจะเผยแพร่สาธารณะ | ส่วนตัว / สาธารณะ | — | **บล็อก Phase 3** (กระทบ PDPA, ToS, Privacy Policy) |
| Q-04 | Memory Scenes อยู่ Phase ไหน | MVP / Phase 2 / ตัดออก | Phase 2 | ไม่บล็อก |
| Q-05 | การเล่นระยะไกลใช้แบบใด | **ตัดสินแล้ว (2026-11-23):** เจ้าของต้องการเล่นพร้อมกันแบบสด รออีกฝ่ายกดส่ง และซิงก์ทั้งเรื่อง → **Phase 3C Live** บนเซิร์ฟเวอร์ของเจ้าของ (Docker/Portainer หลัง Cloudflare — VibeStack ต้องใช้ VPN อีกฝ่ายเข้าไม่ได้) (เซิร์ฟเวอร์ relay เข้ารหัสปลายทาง [10](10-technical-specification.md) §10.3) · 3A ยังใช้ได้ · 3B Supabase พักไว้ | — | — |
| Q-06 | อนุมัติฟอนต์ตาม A-08 หรือมีฟอนต์ที่ต้องการ | — | A-08 | ไม่บล็อก |
| Q-07 | ข้อความตอนจบใช้ชุดใด | ชุด 1 / ชุด 2 / ทั้งสอง | ทั้งสอง | ไม่บล็อก |
| Q-08 | ต้องการเพลง/เสียงไหม จะจัดหาเองหรือให้ใช้ CC0/สังเคราะห์ | **ตัดสินแล้ว (2026-11-23):** สังเคราะห์ด้วย WebAudio ([09](09-asset-specification.md) §5) เปลี่ยนเป็นไฟล์ภายหลังได้ | — | — |
| Q-09 | ใน Play Together ต้องการให้ตัวเลือกเนื้อเรื่อง Ch1–Ch3 เป็นความลับด้วยไหม และ PIN บังคับหรือไม่ | **ตัดสินแล้ว (2026-11-22):** เปิดเผย เล่นดูด้วยกัน (A-05) · PIN ไม่บังคับ ตั้งได้ถ้าอยาก (A-20) | — | — |
| Q-10 | Deploy ที่ไหน มีโดเมนไหม | — | Static host ฟรี | ไม่บล็อก MVP |
| Q-11 | ยืนยันรายการสายด่วนและองค์กรช่วยเหลือที่จะแสดง | — | ตาม 08 §9 | บล็อกการปล่อยสาธารณะ |
| Q-12 | ต้องการ Analytics หรือไม่ | ไม่ / แบบไม่ระบุตัวตน | ไม่ | ไม่บล็อก |
| Q-13 | Asset ภาพ: ใช้ SVG/CSS ที่สร้างในโค้ดตลอด หรือจะจ้าง/สร้าง Pixel art จริงภายหลัง | — | SVG ใน MVP, เปลี่ยนได้โดยไม่แก้โค้ดเกม | ไม่บล็อก |
| Q-14 | ต้องการรองรับภาษาอังกฤษในอนาคตไหม (กระทบโครงสร้าง content) | — | เตรียมโครงสร้าง i18n ไว้ แต่แปลเฉพาะไทย | ไม่บล็อก |

---

## 7. ขอบเขตแต่ละ Phase (สรุป)

> **เจ้าของข้อมูลขอบเขต Phase คือ [10-technical-specification.md](10-technical-specification.md) §8–10** ตารางนี้เป็นสรุปเท่านั้น ถ้าไม่ตรงกันให้ยึด 10

| Phase | ขอบเขต | รายละเอียด |
|---|---|---|
| MVP (Phase 1) | Play Alone ครบ 5 บท, Character creation, Personality setup (Self + Imagined partner), Mirror แบบคนเดียว, Comparison, Report, Export/Import JSON (`full`), localStorage, Template content, ไม่มี LLM, ไม่มี Backend, ไม่มีเสียง/Observed | [10](10-technical-specification.md) §8 |
| Phase 2 | Play Together บนเครื่องเดียว, Handoff screen, PIN (ทางเลือก), Private answers, Mutual reveal, Memory Scenes | [10](10-technical-specification.md) §9 |
| Phase 3A | Remote แบบ Sealed Exchange (ไม่มี Backend) | [10](10-technical-specification.md) §10 |
| Phase 3B | Remote ด้วย Supabase: Invitation code, Sync, Access control, Revoke/Delete (พักไว้ — แทนด้วย 3C) | [10](10-technical-specification.md) §10 |
| Phase 3C | Remote Live: เล่นเหมือน Play Together แต่อยู่คนละเครื่อง ซิงก์สดผ่าน relay บนเซิร์ฟเวอร์ของเจ้าของ (Portainer + Cloudflare) (เซิร์ฟเวอร์เห็นแต่ข้อมูลเข้ารหัส) | [10](10-technical-specification.md) §10.3 |
