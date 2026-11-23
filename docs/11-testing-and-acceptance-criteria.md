# 11 — Testing & Acceptance Criteria

> เจ้าของข้อมูล: Test cases, Expected results, Acceptance criteria
> คอลัมน์ **Phase** = เฟสที่ test ต้องผ่าน · **Type**: U = Unit, C = Component, E = E2E (Playwright), I = Integration (Supabase local), M = Manual

---

## 1. Test Environments

| Viewport | ขนาด | Browser |
|---|---|---|
| Mobile | 375×812 (iPhone), 360×800 (Android) | WebKit, Chromium |
| Mobile landscape | 812×375 | WebKit |
| Tablet | 768×1024 | WebKit, Chromium |
| Desktop | 1280×800, 1920×1080 | Chromium, Firefox, WebKit |

Fixture: `tests/fixtures/save-empty.json`, `save-solo-midch2.json`, `save-solo-complete.json`, `save-together-partial.json` (Phase 2), `save-corrupt.json` · fixture ของ schema เก่าเพิ่มเมื่อมี migration แรก · **fixture ทุกไฟล์ใช้ชื่อสมมติ (เช่น "ผู้เล่น A") ห้ามใช้ชื่อหรือข้อมูลของคนจริง**

---

## 2. Complete Gameplay

| ID | Phase | Type | ขั้นตอน | Expected Result |
|---|---|---|---|---|
| TC-PLAY-01 | MVP | E | Title → เริ่มใหม่ → Intro → เล่นคนเดียว → สร้างตัวเองและคู่ → ข้าม Personality → S5a (ฉันติดลิฟต์) → Ch1–Ch5 เลือกตัวเลือกแรกทุกครั้ง → Ending | ถึง S15 ไม่มี error ใน console · ทุกบทสถานะ `completed` · Journey `completed` |
| TC-PLAY-02 | MVP | E | เหมือน 01 แต่เลือก "{other} ติดลิฟต์" | Ch1 ผู้เล่นควบคุม waiter · ฉากของ insider มี Imagined Banner |
| TC-PLAY-03 | MVP | E | เล่น Ch2 Solo | Part ที่เป็นบทบาทคู่แสดง Imagined Banner ทุกฉาก · Part ของตัวเองไม่มี |
| TC-PLAY-04 | MVP | U | Dialogue engine: `priorWarning=false` | บรรทัดที่มี `when priorWarning=true` ไม่แสดง · Ch3 c01 ตัวเลือก c ใช้ "ทำไมไม่ระวังเลย" |
| TC-PLAY-05 | MVP | U | ทุกชุด Flag ของ Ch2 Part C | ข้อความ Timeline ไม่มี token ค้าง (`{`) |
| TC-PLAY-06 | MVP | U | Content lint | ผ่านทุกกฎใน [10](10-technical-specification.md) §4 |
| TC-PLAY-07 | MVP | E | Ch3 เลือก `out_first_words=blame` | Safety note แสดงและปิดได้ · Interpretation Check แสดงรายการของ blame |
| TC-PLAY-08 | MVP | E | Ch3 เลือก `ask_hug` → ตอบ "ขอแป๊บนึงก่อน" | ไม่มีฉากกอด · NARR "ยืนอยู่ข้าง ๆ โดยไม่แตะตัว" |
| TC-PLAY-09 | MVP | E | Ch3 s06 พิมพ์ประโยคเอง `<b>hi</b>` | แสดงเป็นข้อความตามจริง ไม่ render HTML |
| TC-PLAY-10 | MVP | E | Ending | แสดงข้อความภาษาอังกฤษ 2 ชุด + คำแปลไทย · ปุ่ม Post-game 3 ปุ่มทำงาน |
| TC-PLAY-11 | P2 | E | Together: Ch2 | Part A ควบคุมโดยผู้เล่นที่เป็น waiter ใน Ch1 · มี Handoff ก่อน Part B |

## 3. Incomplete Answers & Skip

| ID | Phase | Type | ขั้นตอน | Expected Result |
|---|---|---|---|---|
| TC-SKIP-01 | MVP | C | S4 ไม่เลือกอะไรเลย | ปุ่ม "ถัดไป" disabled |
| TC-SKIP-02 | MVP | C | S4 พิมพ์ข้อความอิสระอย่างเดียว | "ถัดไป" ใช้ได้ · บันทึก `selected=[]`, `meta=null`, มี `freeText` |
| TC-SKIP-03 | MVP | C | เลือกตัวเลือก 2 ข้อ แล้วกด "ไม่แน่ใจ" | ตัวเลือกถูกล้าง · `meta=not_sure` |
| TC-SKIP-04 | MVP | C | Q13 (`maxSelect=2`) เลือกข้อที่ 3 | ข้อความ "เลือกได้สูงสุด 2 ข้อ" แสดงตั้งแต่ต้นใต้คำถาม · เลือกครบแล้วข้อที่เหลือ disabled |
| TC-SKIP-05 | MVP | E | กด "ข้าม" ทุกข้อของ Quick set | สรุป "ข้าม 12 ข้อ" · ปุ่มกลับไปตอบข้อที่ข้ามทำงาน |
| TC-SKIP-06 | MVP | E | S14 → ข้ามฉาก ch2_a1 | ไปฉาก ch2_a2 · Part B ch2_b2 ใช้ fallback (ไม่สุ่มค่า `in_msg`) |
| TC-SKIP-07 | MVP | E | ข้าม Ch1 ทั้งบท แล้วเลือก Ch3 | ต้องผ่าน S5a ก่อน · Ch3 เล่นได้ด้วย fallback |
| TC-SKIP-08 | MVP | E | ข้ามคำถามท้ายบททั้งชุด | ไปฉาก Transition ทันที ไม่มีข้อความตำหนิ |
| TC-SKIP-09 | MVP | E | ไม่ตอบ Personality + ข้าม Ch4 → S8 | Empty state + CTA 2 ปุ่มทำงาน |
| TC-SKIP-10 | MVP | E | Journey ว่าง → S9 | แสดงโครง 4 ส่วนพร้อม CTA · ส่งออก TXT ได้ |
| TC-SKIP-11 | MVP | U | `categorize()` ครบทุกกรณีใน [04](04-personality-system.md) §7.2 | ผลตรงตามตาราง (missing/skipped/prefer_not/depends/free-text-only/overlap/no overlap) |
| TC-SKIP-12 | MVP | U/C | Q15 เลือก 2 ข้อ แล้วเลือก `q15_none` (exclusive) · จากนั้นเลือกข้ออื่น | ข้อเดิมถูกล้างเหลือ `q15_none` · เลือกข้ออื่นแล้ว `q15_none` ถูกล้าง |
| TC-SKIP-13 | MVP | U | Comparison/Report ที่มีคำตอบ W3 (`context: role`) | W3 ไม่ปรากฏใน Comparison/Report/Profile |
| TC-SKIP-14 | MVP | U | สอง Journey ที่ตอบ M01 ต่างกัน | Comparison ของแต่ละ Journey ใช้ M01 ของ Journey นั้น · Profile Q01–Q36 เป็นค่าเดียวกัน |

## 4. Resume Progress & Persistence

| ID | Phase | Type | ขั้นตอน | Expected Result |
|---|---|---|---|---|
| TC-RES-01 | MVP | E | เล่นถึง ch2_a2 → reload | Title "เล่นต่อ" → กลับไป ch2_a2 บรรทัดเดิม · Flag เดิมครบ |
| TC-RES-02 | MVP | E | ตอบ S4 ถึงข้อ 7 → ปิดแท็บ → เปิดใหม่ | กลับไปข้อที่ยังไม่ตอบข้อแรก · คำตอบ 1–6 อยู่ครบ |
| TC-RES-03 | MVP | E | พิมพ์ข้อความอิสระ 3 วินาที → reload | ร่างข้อความกู้คืน |
| TC-RES-04 | MVP | E | ไม่มี Save | "เล่นต่อ" disabled + tooltip |
| TC-RES-05 | P2 | E | มี 3 Journey | "เล่นต่อ" → S1b แสดง 3 การ์ด ไม่มีเนื้อหาคำตอบ |
| TC-RES-09 | MVP | E | มี Journey `active` อยู่แล้ว → "เริ่มการเดินทางใหม่" | Dialog: เก็บอันเดิมเป็น archived (ส่งออกก่อนได้) หรือยกเลิก · ไม่มีข้อมูลหายโดยไม่ถาม |
| TC-RES-10 | P2 | E | Together: A ตอบ Reflection → ปิดแท็บก่อน B ตอบ → เปิดใหม่ | เริ่มที่ Handoff ไป B (`pendingPrivateSteps`) · A ไม่ถูกถามซ้ำ |
| TC-RES-06 | MVP | E | เปิด 2 แท็บ แก้ในแท็บ 1 | แท็บ 2 แสดง Dialog "เกมถูกเปิดในแท็บอื่น" และไม่เขียนทับ |
| TC-RES-07 | MVP | E | เล่นซ้ำ Ch1 เลือก "เริ่มบทใหม่" | Flag ch1 ถูกแทนที่ · ObservedSignal จาก ch1 แทนที่ (ไม่ซ้ำ) |
| TC-RES-08 | MVP | E | เปลี่ยน Scenario จาก S5 | ยืนยัน → Flag Ch1–Ch3 รีเซ็ต · Reflection/Mirror ยังอยู่ |

## 5. Profile Editing

| ID | Phase | Type | ขั้นตอน | Expected Result |
|---|---|---|---|---|
| TC-PROF-01 | MVP | E | สร้างผู้เล่นโดยชื่อว่าง | ไม่ผ่าน + ข้อความใต้ช่อง |
| TC-PROF-02 | MVP | E | แก้ชื่อหลังเล่น Ch1 | บทพูดทุกที่ใช้ชื่อใหม่ |
| TC-PROF-03 | MVP | E | เปลี่ยนคำลงท้ายเป็น "ค่ะ" | `{in.end}` ในบทแสดง "ค่ะ" |
| TC-PROF-04 | MVP | E | แก้คำตอบ Q13 หลังจบเกม → S8 | Comparison อัปเดตทันที · `revision` เพิ่ม |
| TC-PROF-05 | MVP | E | ลบคำตอบข้อเดียว → Undo | คำตอบกลับมา |
| TC-PROF-06 | MVP | E | เปลี่ยนรูปลักษณ์ | Sprite และ Portrait ในฉากอัปเดต |
| TC-PROF-07 | P2 | U | การ์ด Observed → "ซ่อน" → "แสดงการ์ดที่ซ่อนไว้" → "เลิกซ่อน" (Profile Hub) · ตัวเลือกที่เล่นในบทบาทของอีกฝ่ายไม่นับ | การ์ดกลับมา · นับเฉพาะบทบาทตัวเอง |
| TC-PROF-08 | P2 | U | Observed: สัญญาณ D09 2 ครั้ง | ไม่แสดงการ์ด · 3 ครั้งพร้อม signal ซ้ำ ≥2 → แสดง |

## 6. Private Answers (Phase 2)

| ID | Phase | Type | ขั้นตอน | Expected Result |
|---|---|---|---|---|
| TC-PRIV-01 | P2 | E | A ตอบ M01 → Handoff → B | หน้าจอ B ไม่มีข้อความคำตอบของ A ใน DOM (ตรวจด้วย `page.content()`) |
| TC-PRIV-02 | P2 | E | หลัง B ตอบ กด Back ของเบราว์เซอร์ | ไม่กลับไปหน้าคำตอบของ A/B |
| TC-PRIV-03 | P2 | U | ทุก selector ที่คืนคำตอบ ด้วย `viewerId=B` | ไม่คืนคำตอบของ A ที่ยังไม่ revealed |
| TC-PRIV-04 | P2 | E | A ตั้ง PIN → เปิด Report ของ A จากโปรไฟล์ B | ต้องใส่ PIN ของ A |
| TC-PRIV-05 | P2 | E | ใส่ PIN ผิด 5 ครั้ง | ล็อก 30 วินาที · ข้อความบอกเวลา |
| TC-PRIV-06 | P2 | E | ลืม PIN | ยืนยันแล้วคำตอบที่ยังไม่ Reveal ของผู้เล่นนั้นถูกลบ · PIN ถูกลบ |
| TC-PRIV-07 | P2 | M | หน้าตั้ง PIN | ข้อความ [08](08-privacy-and-safety.md) §4.3 แสดงคำต่อคำ |
| TC-PRIV-08 | P2 | E | Reflection ของ A | ไม่มีทางแสดงให้ B เห็นในหน้าจอใด |
| TC-PRIV-09 | P2 | E | `meta=prefer_not` แล้ว Reveal | อีกฝ่ายเห็น "{X} เลือกไม่ตอบข้อนี้" |
| TC-PRIV-10 | P2 | E | B ส่งออก `full`/`journey` โดยไม่รู้ PIN ของ A | ไฟล์มีเฉพาะข้อมูลของ B + ข้อมูลที่ Revealed |
| TC-PRIV-11 | P2 | E | A พิมพ์ข้อความอิสระค้างไว้ → Handoff → B เปิดคำถามเดียวกัน | ไม่มีร่างของ A แสดง |
| TC-PRIV-12 | P2 | U | Report export ค่าเริ่มต้น | ไม่มีรายการ `partner_revealed` ถูกเลือก |

## 7. Mutual Reveal (Phase 2/3)

| ID | Phase | Type | ขั้นตอน | Expected Result |
|---|---|---|---|---|
| TC-REV-01 | P2 | U | State machine: A submit | `partial` |
| TC-REV-02 | P2 | U | A, B submit | `awaiting_consent` |
| TC-REV-03 | P2 | U | A consent เท่านั้น | ยัง `awaiting_consent` · B ไม่เห็นคำตอบ |
| TC-REV-04 | P2 | U | A consent → ถอน → B consent | ยังไม่ revealed |
| TC-REV-05 | P2 | U | ทั้งคู่ consent | `revealed` · `revealedRevision` บันทึก |
| TC-REV-06 | P2 | U | A แก้คำตอบหลัง revealed | กลับเป็น `awaiting_consent` · ค่าเก่าไม่แสดง |
| TC-REV-07 | P2 | E | Ch4 เลือก "เปิดทีเดียวตอนจบบท" ยกเลิก M03 | M03 ไม่ถูกเปิด ข้ออื่นเปิด |
| TC-REV-08 | P2 | E | Ch5: A แชร์ cs1, cs2 · B แชร์ cs2 | แสดง cs1, cs2 ของ A และ cs2 ของ B (ข้อที่แต่ละคนเลือกแชร์) |
| TC-REV-09 | MVP | E | Solo Mirror | ไม่มีหน้า Consent · การ์ด "{other} บอก: ยังไม่รู้" แสดง |
| TC-REV-10 | P2 | M | หน้าจอ Reveal | ไม่มีสีเขียว/แดง ไม่มีไอคอนถูก/ผิด ไม่มีตัวเลข |

## 8. Export / Import

| ID | Phase | Type | ขั้นตอน | Expected Result |
|---|---|---|---|---|
| TC-EXP-01 | MVP | E | Export full → ลบข้อมูลทั้งหมด → Import | ข้อมูลทุกอย่างกลับมาเหมือนเดิม (deep equal ยกเว้น `pin`) |
| TC-EXP-02 | MVP | U | Checksum ไม่ตรงกับข้อมูล | Import ปฏิเสธด้วยข้อความ "ไฟล์อาจเสียหาย" (ไม่อ้างว่าตรวจการปลอมแปลงได้) |
| TC-EXP-13 | P2 | U | Import ไฟล์หลายผู้เล่นที่มี `state=revealed` | ถูกรีเซ็ตเป็น `awaiting_consent` และล้าง consent |
| TC-EXP-03 | MVP | U | `schemaVersion` MAJOR สูงกว่า | ปฏิเสธ "มาจากเวอร์ชันใหม่กว่า" |
| TC-EXP-04 | MVP | U | ไฟล์ไม่ใช่ JSON / > 5 MB / format ผิด | ปฏิเสธพร้อมข้อความเฉพาะกรณี ไม่มีข้อมูลเดิมหาย |
| TC-EXP-05 | P2 | E | Import Journey id ซ้ำ → "เก็บเป็นสำเนา" | มี 2 Journey id ต่างกัน |
| TC-EXP-06 | MVP | U | Import ที่มี option id ไม่รู้จัก | ถูกตัดและแสดงใน Import Preview |
| TC-EXP-07 | MVP | E | Report → เลือก 3 รายการ → TXT | ไฟล์มีเฉพาะ 3 รายการ + ป้ายแหล่งที่มา |
| TC-EXP-08 | MVP | E | Report → PNG | ไฟล์ 1080×1350 · ข้อความไทยแสดงถูก (ตรวจ snapshot) |
| TC-EXP-09 | MVP | U | ชื่อไฟล์ส่งออก | ไม่มีชื่อผู้เล่น |
| TC-EXP-10 | MVP | U | Import ล้มเหลวกลางทาง (จำลอง throw) | คืนค่าจาก backup |
| TC-EXP-11 | P3A | U | Sealed: เข้ารหัส → ถอดรหัสด้วย key ถูก | ได้ข้อมูลเดิม · key ผิด → error "รหัสไม่ถูกต้อง" |
| TC-EXP-12 | P3A | U | Invitation file | ไม่มีคำตอบใด ๆ ในไฟล์ |

## 9. Remote (Phase 3B)

| ID | Phase | Type | ขั้นตอน | Expected Result |
|---|---|---|---|---|
| TC-RMT-01 | P3B | I | สร้างเซสชัน + โค้ด | โค้ด 8 ตัว · `invites.code_hash` ไม่ใช่โค้ดดิบ |
| TC-RMT-02 | P3B | I | ใช้โค้ดซ้ำ / หมดอายุ / ถูก revoke | ปฏิเสธพร้อมเหตุผล |
| TC-RMT-03 | P3B | I | ผู้ใช้คนที่ 3 ใช้โค้ดใหม่ | ปฏิเสธ (สูงสุด 2 คน) |
| TC-RMT-04 | P3B | I | ลองโค้ดผิด 11 ครั้ง/ชั่วโมง | ครั้งที่ 11 ถูกจำกัด |
| TC-RMT-05 | P3B | I | B `select * from answers where user_id = A` | 0 แถว (RLS) |
| TC-RMT-06 | P3B | I | `get_revealed` ก่อน consent ครบ | ไม่คืนข้อมูล |
| TC-RMT-07 | P3B | I | consent ที่ revision เก่า | ไม่คืนข้อมูล |
| TC-RMT-08 | P3B | E | ออฟไลน์ → ตอบ → ออนไลน์ | ส่งอัตโนมัติ · UI แสดง "ยังไม่ได้ส่ง" ระหว่างออฟไลน์ |
| TC-RMT-09 | P3B | I | owner ลบเซสชัน | ทุกตารางที่เกี่ยวข้องไม่มีแถวเหลือ |
| TC-RMT-10 | P3B | E | ไม่มี env Supabase | ตัวเลือกออนไลน์ disabled พร้อมข้อความ ไม่มีการ fake |
| TC-RMT-11 | P3B | U | URL ทุกจุด | ไม่มีคำตอบ/ชื่อใน path หรือ query (โค้ดอยู่ใน fragment เท่านั้น) |
| TC-LIVE-01 | P3C | U | merge: ช่องของ A แก้คำตอบของ B | ไม่มีผล — คำตอบของ B มาจากเครื่อง B เท่านั้น |
| TC-LIVE-02 | P3C | U | merge: ทั้งคู่ส่งขั้นส่วนตัวพร้อมกัน | `pendingPrivateSteps` ของขั้นนั้นเหลือ `[]` ทั้งสองเครื่อง |
| TC-LIVE-03 | P3C | U | merge: ตำแหน่งเรื่อง `syncSeq` ต่างกัน | ใช้อันที่มากกว่า · choiceLog รวมกัน |
| TC-LIVE-04 | P3C | U | merge: B แก้คำตอบหลัง A ยินยอม | กลับเป็น `awaiting_consent` จนกว่า A ยินยอมใหม่ |
| TC-LIVE-05 | P3C | I | server: เขียนช่องโดยไม่มี/ผิดโทเค็น · ช่องที่ 3 · body เกิน | 401 / 404 / 413 |
| TC-LIVE-06 | P3C | I | server: ข้อมูลที่เก็บ | มีแต่ ciphertext — ไม่มีชื่อเล่นในฐานข้อมูล/หน่วยความจำ |
| TC-LIVE-07 | P3C | E | 2 browser context: สร้างห้อง → เข้าลิงก์ → เล่น Ch1 ถึงตัวเลือกแรก | ทั้งสองเห็นฉากเดียวกัน · เครื่องที่ไม่ใช่ตาเห็น "รอ … เลือก" · เลือกแล้วอีกเครื่องเดินตาม |
| TC-LIVE-09 | P3C | U+E | จบบท แล้วเครื่อง A กด "ไปบทถัดไป" ก่อน | A เห็น "รอ … เข้าบทนี้" และเล่นต่อไม่ได้ · B กดตามแล้วทั้งคู่เริ่มบรรทัดแรกของบทใหม่ · กดพร้อมกันก็เริ่มได้ (merge ไม่ทำให้ค้าง) |
| TC-LIVE-10 | P3C | U+E | B กรอกโค้ดห้องแทนการเปิดลิงก์ (พิมพ์เล็ก/ไม่มีขีด/O แทน 0 ก็ได้) | ได้ห้องและกุญแจเดียวกับลิงก์ → เข้าร่วมได้ · โค้ดผิด → "ไม่พบห้องนี้" |
| TC-LIVE-11 | P3C | U+E | A เริ่มบทแรกของเส้นเรื่องใดก็ได้ | B เห็นป๊อปอัปชวน (ชื่อเส้นเรื่อง/บท) · เข้าบทด้วยกัน → ไปบทนั้น · ขอเวลาก่อน → A เห็น "ขอเวลาก่อน" ป๊อปอัปไม่เด้งซ้ำ · A ชวนอีกครั้ง → เด้งใหม่ |
| TC-LIVE-12 | P3C | U+E | A อ่านเร็วกว่า B | A ไปถึงจุดตอบก่อนแล้วเห็น "รอ … อ่านมาถึงตรงนี้" ตัวเลือก/คำถามยังไม่เปิด · B ยังอ่านทีละบรรทัดเองได้ · มาถึงทั้งคู่ → เปิดให้ตอบ · merge ตำแหน่ง: เจ้าของชนะ รอบเล่นเก่าไม่ปน |
| TC-LIVE-08 | P3C | E | ไม่มีเซิร์ฟเวอร์ | "เล่นสด" disabled พร้อมเหตุผล |

## 10. Responsive Layouts

| ID | Phase | Type | ขั้นตอน | Expected Result |
|---|---|---|---|---|
| TC-RWD-01 | MVP | E | ทุกหน้าจอ MVP ทุก viewport ใน §1 | ไม่มี horizontal scroll (`scrollWidth <= clientWidth`) |
| TC-RWD-02 | MVP | E | S6 บน 375×812 | Scene ด้านบน 16:9 · Dialogue ด้านล่าง · ปุ่มตัวเลือกสูง ≥ 44px |
| TC-RWD-03 | MVP | E | S6 landscape 812×375 | Scene ซ้าย 60% / Dialogue ขวา 40% |
| TC-RWD-04 | MVP | E | S7 sm vs lg | sm การ์ดซ้อนแนวตั้ง · lg สองคอลัมน์ |
| TC-RWD-05 | MVP | M | Pixel art ทุก viewport | ขอบคม ไม่เบลอ · scale เป็นจำนวนเต็มเมื่อกว้าง ≥ 320 |
| TC-RWD-06 | MVP | E | Font scale 130% บน 360px | ไม่มีข้อความถูกตัด ปุ่มไม่ล้น |

## 11. Accessibility

| ID | Phase | Type | ขั้นตอน | Expected Result |
|---|---|---|---|---|
| TC-A11Y-01 | MVP | E | axe ทุกหน้าจอ MVP | 0 violations ระดับ serious/critical |
| TC-A11Y-02 | MVP | U | Contrast ของทุกคู่ token ที่ใช้กับข้อความ | ≥ 4.5:1 (ข้อความปกติ) |
| TC-A11Y-03 | MVP | E | เล่น Ch1 ด้วยคีย์บอร์ดอย่างเดียว | เล่นจบบทได้ · focus มองเห็นทุกขั้น |
| TC-A11Y-04 | MVP | E | `prefers-reduced-motion: reduce` | ไม่มี parallax/shake/particles · typing ทันที |
| TC-A11Y-05 | MVP | E | Dialogue ใหม่ | `aria-live` region อัปเดตด้วยข้อความเต็ม |
| TC-A11Y-06 | MVP | M | VoiceOver (iOS) เล่น Ch1 | อ่านฉาก (aria-label) บทพูด ตัวเลือกได้ |
| TC-A11Y-07 | MVP | E | Zoom 200% desktop | ไม่มี horizontal scroll ไม่มีข้อความทับกัน |
| TC-A11Y-08 | MVP | M | ไฟกระพริบในลิฟต์ | ≤ 2 ครั้ง/วินาที · ปิดได้ |
| TC-A11Y-09 | MVP | C | Modal ทุกอัน | focus trap + Esc ปิด + คืน focus |

## 12. Error Handling

| ID | Phase | Type | ขั้นตอน | Expected Result |
|---|---|---|---|---|
| TC-ERR-01 | MVP | E | localStorage ถูกปิด (mock throw) | แบนเนอร์ G9 · เล่นได้ · ส่งออกได้ |
| TC-ERR-02 | MVP | E | `QuotaExceededError` ตอนบันทึก | Toast + แนะนำส่งออก/ลบ · state ในหน้าไม่หาย |
| TC-ERR-03 | MVP | E | โหลด `save-corrupt.json` | ไป S18 · ข้อมูลเดิมยังอยู่จนผู้เล่นเลือก · ดาวน์โหลดข้อมูลดิบได้ |
| TC-ERR-04 | MVP | E | Asset background โหลดไม่ได้ | แสดงพื้นสีแทน เล่นต่อได้ |
| TC-ERR-05 | MVP | E | ไม่มี `crypto.subtle` | ฟีเจอร์ที่ต้องใช้ปิดพร้อมข้อความ เกมหลักเล่นได้ |
| TC-ERR-06 | MVP | U | Token ไม่รู้จักใน content (prod build) | แสดงว่าง ไม่ crash |
| TC-ERR-07 | MVP | E | Route ไม่มีอยู่ (`#/xyz`) | หน้า "ไม่พบหน้านี้" + ปุ่มกลับหน้าแรก |
| TC-ERR-08 | MVP | E | Error boundary (จำลอง throw ใน S8) | หน้าข้อผิดพลาดที่อ่านเข้าใจ + ปุ่มกลับ S5 · Save ไม่เสีย |

## 13. Data Deletion

| ID | Phase | Type | ขั้นตอน | Expected Result |
|---|---|---|---|---|
| TC-DEL-01 | MVP | E | ลบ Journey | Journey + StoryAnswers + MirrorItems ของ Journey หาย · Player/Profile อยู่ |
| TC-DEL-02 | MVP | E | ลบผู้เล่น | Player + Profile ทั้งสองชั้น + คำตอบในทุก Journey หาย |
| TC-DEL-03 | MVP | E | ลบทั้งหมด — พิมพ์ผิด | ปุ่มยืนยัน disabled |
| TC-DEL-04 | MVP | E | ลบทั้งหมด — พิมพ์ "ลบทั้งหมด" | localStorage ไม่มี key `iywm:*` · กลับ S1 · "เล่นต่อ" disabled |
| TC-DEL-05 | MVP | M | ข้อความยืนยันการลบ | แจ้งว่าไฟล์ที่ส่งออกไว้ไม่ถูกลบ |
| TC-DEL-06 | P3B | I | member ออกจากเซสชัน | แถวของ member ในทุกตารางถูกลบ |
| TC-DEL-07 | MVP | U | ลบคำตอบ/Journey/ผู้เล่น หลังจากเคย Import (มี backup) | `iywm:save:backup` ไม่มีอยู่หรือไม่มีข้อมูลที่ลบแล้ว · Drafts ของผู้เล่นที่ลบหายด้วย |

## 13b. Memory Scenes (Phase 2, M11)

| ID | Phase | Type | ขั้นตอน | Expected Result |
|---|---|---|---|---|
| TC-MEM-01 | P2 | U | บันทึกความทรงจำ / คนอื่นพยายามแก้ | เก็บตามที่เขียนทุกตัวอักษร · schema ผ่าน · แก้ได้เฉพาะเจ้าของ |
| TC-MEM-02 | P2 | U | ยังไม่แชร์ → แชร์ → คนอื่นพยายามเลิกแชร์ | คู่ไม่เห็นจนเจ้าของแชร์ · เลิกแชร์ได้เฉพาะเจ้าของ |
| TC-MEM-03 | P2 | C/E | สร้างแล้วเล่นฉาก | ข้อความผู้เล่นแสดงตามจริงในกรอบ "เรื่องที่…เล่า" · ส่วนที่เดาความรู้สึกคู่มีป้าย "ไม่ใช่สิ่งที่…บอก" · ไม่มี horizontal scroll · axe ผ่าน |
| TC-MEM-04 | P2 | C | ลบความทรงจำ | หายจาก save และ backup |
| TC-MEM-05 | P2 | C | คู่เปิดลิงก์ความทรงจำที่ยังไม่แชร์ | ถูกพากลับ ไม่เห็นเนื้อหา |

## 13c. เส้นเรื่องที่ 2 "อีกด้านของเรื่อง" (M16)

| ID | Phase | Type | ขั้นตอน | Expected Result |
|---|---|---|---|---|
| TC-OS-01 | M16 | E | S5 → แท็บ "อีกด้านของเรื่อง" → เริ่ม os1 โดยยังไม่เลือกคนเล่า | ไป S20 ก่อน · เลือกแล้วเข้า os1 · `{in}` = ชื่อคนเล่า |
| TC-OS-02 | M16 | U | Flag ของ os* กับ ch* | ไม่ปนกัน (buildStoryState อ่านเฉพาะเส้นเรื่องเดียวกัน) · Scenario ไม่ถูกใช้ใน os* |
| TC-OS-03 | M16 | U | เปลี่ยนคนเล่า | os1–os6 รีเซ็ต · ch1–ch5 และคำตอบท้ายบทไม่เปลี่ยน |
| TC-OS-04 | M16 | U/C | Content lint ทุกบท os* | ผ่านกฎเดียวกับ ch* (ไม่มีคำต้องห้าม ทุกเส้นทางเล่นจบ token ครบ ฉากมี ariaLabel) · os6 ทั้ง 4 ทางจบได้ |
| TC-OS-05 | M16 | E | เล่น os1 จนจบ (Solo) | ผ่านตัวเลือก การ์ด Reflection · Transition มีปุ่มไป os2 · ข้อมูลเดิมของ ch* ไม่เปลี่ยน |
| TC-OS-06 | M16 | U | Save เก่าที่ไม่มี `otherSide` / ChapterId ใหม่ | โหลดได้ · S5 แท็บแรกเหมือนเดิม |

## 14. Safety & Content

| ID | Phase | Type | ขั้นตอน | Expected Result |
|---|---|---|---|---|
| TC-SAFE-01 | MVP | U | สแกน Content ทั้งหมดกับรายการคำต้องห้าม | 0 match |
| TC-SAFE-02 | MVP | U | สแกน UI ทั้งหมดหา `%`, "คะแนน", "score" ในบริบทผลลัพธ์ | 0 match |
| TC-SAFE-03 | MVP | E | พิมพ์ "อยากตาย" ในข้อความอิสระ | การ์ดแหล่งช่วยเหลือแสดง ปิดได้ · บันทึกคำตอบได้ · ไม่มีอะไรถูกเก็บเพิ่มใน Save |
| TC-SAFE-04 | MVP | M | Review บททั้งหมดด้วย Checklist [02](02-story-script.md) §0.4 | ผ่านทุกข้อ (ผู้ตรวจ 2 คน) |
| TC-SAFE-05 | MVP | E | S11 | แหล่งช่วยเหลือแสดงครบ · ลิงก์ `tel:` |
| TC-SAFE-07 | MVP | U | สแกน repo (docs, fixtures, content) หาชื่อหรือข้อมูลของคนจริง · รายการคำเก็บ **นอก repo** (GitHub Actions secret `PII_DENYLIST` หรือไฟล์ local ที่อยู่ใน `.gitignore`) — ห้ามใส่ชื่อจริงใน repo เพื่อใช้ตรวจ | 0 match (รันใน CI เมื่อมี secret) |
| TC-SAFE-06 | MVP | M | Imagined data ทุกจุดที่แสดง | มีป้าย "สิ่งที่คุณคิด/จินตนาการ" (ตรวจทุกหน้าจอ S4, S6, S7, S8, S9) |

---

## 15. Acceptance Criteria by Phase

### MVP
- [ ] Test ที่ Phase = MVP ผ่านทั้งหมด (U/C/E อัตโนมัติใน CI, M มีบันทึกผลการตรวจ)
- [ ] เล่น Solo จบ 5 บทได้บนมือถือจริง 1 เครื่อง (iOS หรือ Android) และเดสก์ท็อป 1 เครื่อง
- [ ] ไม่มีปุ่มที่ไม่ทำงาน ไม่มีหน้าจอทางตัน (ตรวจด้วย E2E crawl ทุก route)
- [ ] ไม่มีข้อมูลสมมติที่แสดงโดยไม่มีป้ายกำกับ (TC-SAFE-06)
- [ ] Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95
- [ ] Bundle size ตาม [10](10-technical-specification.md) §6

### Phase 2
- [ ] Test ที่ Phase = P2 ผ่านทั้งหมด
- [ ] ผู้ทดสอบ 2 คนเล่น Together จบบนเครื่องเดียว โดยไม่เห็นคำตอบลับของกันก่อน Reveal

### Phase 3A / 3B
- [ ] Test ที่ Phase = P3A / P3B ผ่านทั้งหมด
- [ ] ผู้ทดสอบ 2 คนบน 2 เครื่องเล่น Ch4 จบและ Reveal สำเร็จ
- [ ] RLS negative tests ผ่านใน CI
