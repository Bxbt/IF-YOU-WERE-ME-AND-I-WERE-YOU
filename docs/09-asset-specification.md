# 09 — Asset Specification

> เจ้าของข้อมูล: รายการ Asset ทั้งหมด ขนาด รูปแบบไฟล์ Animation และ Art Direction
> **ไม่มี Asset ใดที่มีอยู่ในโปรเจกต์ ณ วันที่จัดทำ** ภาพอ้างอิงใน Master Prompt เป็นงานลิขสิทธิ์ของผู้อื่น ห้ามนำมาใช้ คัดลอก หรือ trace

---

## 1. Art Direction

### 1.1 Style

| หัวข้อ | กฎ |
|---|---|
| สไตล์ | 16-bit pixel art, cozy narrative, แสงนุ่มแบบภาพยนตร์ |
| ความละเอียดตรรกะ | 320×180 ต่อฉาก (16:9) — ทุกอย่างวาดบนกริดนี้ |
| Pixel | 1 pixel ตรรกะ = 1 พิกเซลในไฟล์ · ไม่มี anti-aliasing · ไม่มี sub-pixel · ห้าม scale ไม่เท่ากันระหว่างแกน |
| Palette หลัก | 7 สีของแบรนด์ ([06](06-ui-ux-specification.md) §1.1) + สีขยายได้ไม่เกิน 32 สีใน Master Palette (`palette.json`) · แต่ละฉาก ≤ 24 สี |
| Outline | Selective outline สีเข้มจาก palette (ไม่ใช้ดำสนิท #000) |
| แสง | แต่ละฉากมีแหล่งแสงหลักชัดเจน (โคมไฟ, ไฟฉุกเฉิน, ดวงจันทร์) · ใช้ dithering ได้เฉพาะไล่แสงบนพื้นผิวใหญ่ |
| ตัวละคร | สัดส่วน ~3 หัว (32×48) · ใบหน้าเรียบง่าย ดวงตา 2×2 · อารมณ์สื่อด้วยคิ้ว ปาก ท่าทาง · ไม่ระบุเพศโดยรูปร่าง (ทรงผม/เสื้อผ้าเลือกได้อิสระ) |
| Mood ตาม Arc | Ch1 อุ่น (ส้ม/ครีม) → Ch2 เย็น-มืด (indigo + ส้มไฟฉุกเฉิน) → Ch3 ขาวเย็น → Ch4 นุ่ม (lavender/ครีม) → Ch5 navy + แสงอุ่นเล็ก ๆ |
| ห้าม | ข้อความภาษาใด ๆ ในภาพที่มีความหมายต่อ UX (ป้ายในโลกเกมใช้ SystemCard แทน) · โลโก้แบรนด์จริง · ตัวละคร/ฉาก/UI ที่คล้ายเกมใดเกมหนึ่งโดยเจาะจง · นีออนจัด · สไตล์การ์ตูนเด็ก |

### 1.2 MVP Strategy: Code-generated Assets (Q-13, audit H-5)

- **Background:** วาดด้วย **คำสั่งวาดพื้นฐานบน `<canvas>` ขนาด 320×180** (fillRect ระดับพิกเซล, แถบสีไล่ระดับแบบ dithering, tile 16×16 ที่เก็บเป็น string สั้น ๆ เช่น `"0011/0122/…"` อ้าง palette index) วาดครั้งเดียวต่อฉากแล้ว cache เป็น `ImageBitmap`/offscreen canvas · แสดงผลด้วย CSS `image-rendering: pixelated`
- **ห้าม** render background เป็น SVG `<rect>` ทีละพิกเซล (57,600 node/ฉาก ช้าเกินบนมือถือ) และห้ามเก็บ background เป็น Array พิกเซลเต็มขนาด (บวม bundle)
- **Sprite เล็ก** (ตัวละคร 32×48, Portrait 64×64, ไอคอน) เก็บเป็นข้อมูลพิกเซลแบบ string ต่อแถวได้ แล้ววาดลง canvas พร้อม palette swap
- ต้นแบบ 1 ฉาก (`bg_elevator_emergency`) + ตัวละคร 1 ตัว ใน M3 ให้เจ้าของดูก่อนทำที่เหลือ
- เอฟเฟกต์ (ฝน ดาว ไฟกระพริบ หมอกร้อน) ทำด้วย CSS/Canvas ไม่ใช้ภาพ
- **Asset Interface คงที่:** ทุก Asset อ้างผ่าน key (เช่น `bg_elevator_interior`) จาก `assetRegistry` — เปลี่ยนเป็น PNG ภายหลังได้โดยไม่แก้โค้ดเกม (แก้แค่ registry)
- ตัวละคร compose จาก layer: `body(skin)` → `outfit(color)` → `hair(style,color)` → `accessory` → `expression` (ทับเฉพาะใบหน้า)

### 1.3 Production Strategy (Phase 2+ ทางเลือก)

PNG sprite sheet + JSON atlas (รูปแบบ TexturePacker/Aseprite JSON) · สร้างด้วย Aseprite หรือเครื่องมือเทียบเท่า · ต้นฉบับ `.aseprite` เก็บใน `art-source/` (ไม่ deploy)

---

## 2. Backgrounds

ขนาดทั้งหมด 320×180 (ไฟล์ PNG ส่งออก ×1; แสดงผลด้วย integer scale) · ไม่ต้องโปร่งใส · Layer = แยกไฟล์ต่อชั้นสำหรับ parallax/เอฟเฟกต์

| Key | ใช้ที่ | Layers | Animation | Priority |
|---|---|---|---|---|
| `bg_title` | S1, S5 (พื้นหลังแผนที่) | sky, stars_far, stars_near, ground+path, characters_silhouette | ดาว parallax 2 ชั้น, ทางเรืองแสง pulse 4s, particles | P0 |
| `bg_apartment_evening` | ch1_s01 | room, window(rain), lamp_glow | ฝนนอกหน้าต่าง (CSS), แสงโคมไฟ flicker เบามาก | P0 |
| `bg_apartment_kitchen` | ch1_s03, ch2_b1 | room, steam | ไอน้ำจากกระทะ (ปิดเมื่อ `out_first=go_check`) | P0 |
| `bg_corridor` | ch1_s02 | — | ไฟนีออน flicker ≤ 2Hz | P0 |
| `bg_elevator_interior` | ch1_s02 | interior, floor_display | ตัวเลขชั้นเปลี่ยน (HTML overlay) | P0 |
| `bg_elevator_emergency` | ch1_s02–s04, ch2_a1–a3 | interior (palette swap), emergency_light_overlay, haze_overlay | ไฟส้มหายใจช้า 3s, haze ระดับ low/medium, light off 3s | P0 |
| `bg_lobby_floor6` | ch2_b2–b3, ch2_end, ch3 | lobby, elevator_door (ปิด/แง้ม/เปิด 3 สถานะ), light_strip | ประตูถูกงัด 3 เฟรม, แสงลอด | P0 |
| `bg_stairwell` | ch3_end | — | — | P1 |
| `bg_living_room_morning` | ch4_s01 | room, window_light | แสงเช้าเคลื่อนช้า | P0 |
| `bg_living_room_night` | ch4 ช่วงท้าย, S4 (เบลอ) | palette variant ของ morning | — | P0 |
| `bg_rooftop_night` | ch5 | sky, stars, city_far, garden, fairy_lights | ดาวกระพริบ, ไฟสายวิบวับ, pan ขึ้นตอนจบ | P0 |
| `bg_building_exterior_rain` | ch1_end | building, rain | ฝน, zoom out (CSS transform) | P1 |
| `bg_cozy_room_blur` | S4, S8, S9 พื้นหลัง | = `bg_living_room_night` + CSS blur | — | P0 (ไม่ต้องวาดใหม่) |
| `bg_memory_generic` | S16 | 3 แบบ: café, park_bench, bedroom | — | P2 |

---

## 3. Characters

### 3.1 Sprite Sheet (ต่อ Appearance layer)

| รายการ | ขนาดเฟรม | จำนวนเฟรม | FPS | โปร่งใส | Priority |
|---|---|---|---|---|---|
| idle (หันขวา/ซ้าย) | 32×48 | 2 × 2 ทิศ | 2 | ✓ | P0 |
| walk (ขวา/ซ้าย) | 32×48 | 4 × 2 ทิศ | 8 | ✓ | P0 |
| sit_chair | 32×48 | 1 | — | ✓ | P0 |
| sit_floor_hug_knees (insider, ch2_a2) | 32×48 | 2 (หายใจ) | 2 | ✓ | P0 |
| look_phone | 32×48 | 2 (แสงจอกระพริบ) | 2 | ✓ | P0 |
| pace (out_feel=pace) | ใช้ walk | — | — | — | P0 |
| reach_out (มือยื่น) | 32×48 | 1 | — | ✓ | P1 |
| hug_pair | 48×48 | 2 | 2 | ✓ (composite 2 ตัว) | P0 |
| stand_side_by_side | ใช้ idle ×2 | — | — | — | P0 |
| switch_seats (ch4) | ใช้ walk + sit | — | — | — | P0 |

Layer ที่ต้องทำต่อเฟรม (MVP, audit H-6): body ×1 แบบ (สีผิว 6 = palette swap) · outfit ×3 แบบ (สี 8 = palette swap) · hair ×4 ทรง (สี 8 = palette swap) · accessory ×1 (แว่น) · ทรงผม/เสื้อเพิ่มเติม และหมวก = P1

**MVP ตัดออก:** `reach_out` (P1) · `hug_pair` ทำเป็น 1 เฟรม · `walk` ใช้ 4 เฟรมเฉพาะทิศขวา แล้ว flip แนวนอนสำหรับทิศซ้าย

### 3.2 Portraits (Dialogue)

| รายการ | ขนาด | จำนวน | โปร่งใส | Priority |
|---|---|---|---|---|
| Portrait ต่อ Appearance | 64×64 | **MVP 5 สีหน้า:** neutral, happy, sad, worried, relieved · P1: angry, scared, thinking (ระหว่างนี้ map angry→worried, scared→worried, thinking→neutral) | ✓ | P0 (5) / P1 (3) |

Portrait ใช้ layer เดียวกับ Sprite (สร้างในขนาดใหญ่ขึ้น) · สีหน้า "angry" ต้องไม่ดุร้าย — คิ้วขมวด ปากตรง พอ

### 3.3 Supporting Characters

| Key | ใช้ที่ | ขนาด | Priority |
|---|---|---|---|
| `npc_guard` (ยาม) | ch2_b2, ch3 พื้นหลัง | 32×48 idle 2 เฟรม | P1 (MVP แสดงเป็นเงา/silhouette ได้) |
| `npc_technician` (ช่าง) | ch2_b3 | 32×48 idle + pry 2 เฟรม | P1 |

---

## 4. UI & In-world Graphics

| Key | Format | ขนาด | หมายเหตุ | Priority |
|---|---|---|---|---|
| `ui_panel_frame` | SVG / CSS border-image | 9-slice, มุม 8×8 | กรอบ pixel ของ Panel/Dialogue | P0 |
| `ui_button_states` | CSS | — | default/hover/focus/active/disabled ด้วย CSS ทั้งหมด | P0 |
| `ui_phone_card` | SVG | 120×200 ตรรกะ | กรอบโทรศัพท์สำหรับ SystemCard (ข้อความเป็น HTML) | P0 |
| `ui_intercom_card` | SVG | 120×60 | กรอบอินเตอร์คอม | P1 |
| `ui_floor_display` | SVG | 40×16 | จอบอกชั้นลิฟต์ (ตัวเลข HTML) | P0 |
| `ui_mirror_card_back` | SVG | 160×220 | ลายด้านหลังการ์ด Mirror | P0 |
| `ui_unknown_card` | SVG | 160×220 | การ์ด "ยังไม่รู้" ลายจุด | P0 |
| `ui_emotion_cards` | SVG | 64×80 ต่อใบ | การ์ดความรู้สึก Ch1–Ch2 (ไอคอน pixel + ข้อความ HTML) | P1 |
| `illus_handoff` | SVG | 96×96 | มือส่งโทรศัพท์ | P1 (Phase 2) |
| `illus_empty_*` | SVG | 96×96 | 3 แบบ: ไม่มีข้อมูล, รออีกฝ่าย, ข้อผิดพลาด | P0 |
| `illus_ending_title` | — | — | ข้อความ HTML + พื้นหลังดาว (ไม่ใช่ภาพ) | P0 |
| `icons_ui` | Lucide React | 20/24px | ไอคอน UI ทั้งหมด (ไม่วาดเอง) | P0 |
| `fx_rain` | Canvas/CSS | — | 3 ระดับ light/medium/heavy | P0 |
| `fx_stars` | Canvas/CSS | — | twinkle | P0 |
| `fx_particles` | Canvas | — | ลอยขึ้นช้า (Title) | P1 |
| `fx_lantern_text` | CSS | — | ข้อความลอยขึ้นใน Ch5 | P0 |
| `fx_rewind` | CSS | — | ภาพย้อน ch3_s06 (scanline + desaturate 2 วินาที) | P1 |

---

## 5. Audio (A-09, Q-08)

**เปิดเสียงเป็นค่าเริ่มต้น** (เจ้าของตัดสิน 2026-11-23 — เดิมปิด) เบราว์เซอร์ไม่ยอมให้เล่นเสียงก่อนผู้เล่นแตะหรือกดคีย์ครั้งแรก จึงไม่มีเสียงดังขึ้นทันทีที่เปิดหน้า · ปิดได้ทุกเมื่อจากปุ่มลำโพงหรือ S10 · **ตัดสินแล้ว (Q-08):** สร้างเสียงทั้งหมดด้วย WebAudio ใน `src/audio/engine.ts` ไม่มีไฟล์เสียง ไม่มี License ต้องติดตาม · เปลี่ยนเป็นไฟล์ CC0 หรือเพลงต้นฉบับภายหลังได้โดยแก้ engine อย่างเดียว (key เดิม)

| สิ่งที่ทำแล้ว | วิธีสร้าง |
|---|---|
| ฝน light/medium/heavy | white noise → highpass 900 Hz / lowpass 5 kHz, ระดับตาม `rain` |
| บรรยากาศในห้อง (`ambient_home`) | brown-ish noise lowpass 280 Hz + drone triangle 110/165 Hz หายใจช้า |
| เสียงหึ่งในลิฟต์ | sine 55/110 Hz lowpass — เมื่อฉากลิฟต์และไฟไม่ปกติ |
| กลางคืน (`ambient_night`, หน้าแรก) | pad triangle + โน้ต pentatonic ช้า ๆ |
| เพลงตอนจบ (`ending_theme`) | pad + arpeggio pentatonic ทุก 0.9 วินาที |
| SFX: door_close, elevator_jolt, metal_creak, tools_above, door_pry, alarm_bell, phone_buzz, ui_reveal | oscillator/noise + envelope สั้น ๆ |

ความปลอดภัยของเสียง: DynamicsCompressor + master ceiling 0.45 × volume · elevator_jolt เบากว่าเสียงอื่น · เสียงหยุดเมื่อแท็บไม่แสดง · เบราว์เซอร์ที่ไม่มี WebAudio เล่นเกมได้ปกติ (ตั้งค่าแจ้งว่าไม่มีเสียง)

| Key | Format | ความยาว | Loop | Priority |
|---|---|---|---|---|
| `amb_home` | MP3 128kbps (หรือ WebAudio) | 60–90s | ✓ | P1 |
| `amb_rain_light/medium/heavy` | MP3 / WebAudio noise | 30s | ✓ | P1 |
| `amb_night` | MP3 | 60s | ✓ | P1 |
| `mus_ending` | MP3 | 90–120s | — | P2 |
| `sfx_door_close`, `sfx_elevator_jolt`, `sfx_alarm_bell`, `sfx_metal_creak`, `sfx_tools_above`, `sfx_door_pry`, `sfx_phone_buzz` | MP3 | < 3s | — | P2 |
| `sfx_ui_select`, `sfx_ui_reveal` | WebAudio | < 0.3s | — | P2 |

กฎ: ไม่มีเสียงดังกระทันหัน (peak ≤ -6 dBFS, `sfx_elevator_jolt` ≤ -12 dBFS) · ทุกเสียงปิดได้ · ไม่มีข้อมูลสำคัญที่สื่อด้วยเสียงอย่างเดียว

---

## 6. Fonts

| Key | ไฟล์ | License | Subset | Priority |
|---|---|---|---|---|
| Silkscreen Regular | `silkscreen-400.woff2` | SIL OFL 1.1 | Latin | P0 |
| IBM Plex Sans Thai 400/500/600 | `ibm-plex-sans-thai-{w}.woff2` | SIL OFL 1.1 | Thai + Latin | P0 |

Self-host ใน `public/fonts/` · `font-display: swap` · ระบุ License ใน S11

---

## 7. App Icons & Meta

| Key | ขนาด | Format | Priority |
|---|---|---|---|
| favicon | 32×32, 16×16 | PNG (`public/brand/favicon-*.png`) ✅ | P0 |
| apple-touch-icon | 180×180 | PNG ✅ | P1 |
| PWA icons | 192, 512 | PNG ✅ (มีไฟล์แล้ว · manifest ยังไม่ทำ — PWA อยู่ใน Backlog) | P2 |
| og-image | 1200×628 | JPEG `public/brand/og.jpg` ✅ (ภาพหน้าปก ไม่มีข้อมูลผู้เล่น) | P2 |
| cover | 1734×907 | JPEG `public/brand/cover.jpg` — พื้นหลัง S1 บนจอกว้าง (อัตราส่วน ≥ 4:3) | P1 |
| cover-portrait | 1144×2048 | JPEG `public/brand/cover-portrait.jpg` (v3 ตัวละครแบบล็อกแล้ว ขยาย 2× แบบ nearest-neighbour) — พื้นหลัง S1 บนจอแนวตั้ง (ส่วนบนว่างไว้ให้ชื่อเกม ตัวละครอยู่ ~12% ล่าง ที่ ~14–25% / 73–84% ของความกว้าง) · ฉาก canvas `bg_title` ไม่ได้ใช้ที่ S1 แล้ว | P1 |
| mode cards | 512×512 | PNG โปร่งใส `public/brand/mode-solo.png`, `mode-together.png`, `mode-remote.png` (together/remote เป็น v2 ตัวละครตรงกับปก · solo ใช้ภาพแรกตามที่เจ้าของเลือก) — S2 การ์ดโหมด · วางบนกล่อง navy #171C2F เสมอ (เส้นเข้มบางส่วนโปร่งใส) · ตกแต่ง (`alt=""`) | P1 |
| waiting | 512×512 | PNG โปร่งใส `public/brand/waiting.png` — สองคนนั่งหันหลังให้กัน: S17 ขณะรอไฟล์ปิดผนึกของคู่ (Phase Waiting, docs/06 S7) และ EmptyState ของ S8 (ยังไม่มีข้อให้เทียบ) · กล่อง navy · ตกแต่ง | P1 |
| handoff | 512×512 | PNG โปร่งใส `public/brand/handoff.png` — S12 Handoff (สองมือส่งโทรศัพท์ แขนเสื้อชมพูซ้าย ฟ้าขวา) แทนไอคอน Lucide · ตกแต่ง (`alt=""`) ไม่มีกรอบ ไม่มีแอนิเมชัน | P1 |
| ending | 2048×1144 | JPEG `public/brand/ending.jpg` (v3 ขยาย 2× แบบ nearest-neighbour) — ภาพฉาก S15 (สองคนนั่งบนม้านั่งบนดาดฟ้า หันหน้าเข้าหาผู้ชม ใต้กลุ่มดาวที่เชื่อมดาวชมพูกับดาวฟ้า) แทนฉาก canvas `bg_rooftop_night` ในหน้าจบ · แสดงกว้างไม่เกิน max-w-5xl เพื่อไม่ให้เบลอ | P1 |
| logo | 512×512 | PNG `public/brand/logo-512.png` — S11 และ README | P1 |

ภาพทั้งชุด (โลโก้ ไอคอน หน้าปก) จัดทำโดยเจ้าของโปรเจกต์ (2026-11-23) เป็นไฟล์ PNG/JPEG ไม่ได้วาดด้วยโค้ด — ใช้นอกฉากเกม ฉากและตัวละครในเกมยังวาดด้วย canvas ตาม §1.2

ไอคอน: ดาวสองดวงเชื่อมด้วยเส้นทางเรืองแสง pixel บนพื้น navy

---

## 8. Naming & Folder Convention

```
src/scene/
├── palette.ts             # master palette + helpers (dither, PRNG)
├── env.ts                 # SceneEnv (สิ่งที่ ENV ตั้ง) + cachedLayer/blitLayer (วาดครั้งเดียวแล้ว cache)
├── effects.ts             # rain (ตามพื้นที่หน้าต่าง/ทั้งจอ), haze, flicker ≤ 2Hz, dim
├── backgrounds.ts         # registry: key → draw, fallback colour, ariaLabel, priority
├── draw/                  # 1 ไฟล์ต่อกลุ่มฉาก (title, apartment, corridor, elevator, exterior, lobby, livingRoom, rooftop) + character.ts
├── SceneCanvas.tsx        # ฉากใน S6 (split, shake, fallback)
public/
├── fonts/
art-source/                # (Phase 2+) ไฟล์ต้นฉบับ Aseprite — ไม่ deploy
```

- M4: Background P0 ครบ + `bg_building_exterior_rain` (P1) วาดแล้ว เพราะ `ch1_end` ใช้ · ดูทั้งหมดได้ที่ `#/art-preview`
- ชื่อไฟล์ `snake_case` ตาม key ในตาราง
- ทุก Background ต้องมีรายการใน `src/scene/backgrounds.ts` พร้อม `ariaLabel` (สำหรับ Background) และ License (ถ้ามาจากภายนอก)
- Asset ภายนอกต้องบันทึกใน `CREDITS.md` พร้อม URL และ License

---

## 9. Priority Summary

| Priority | ความหมาย | จำนวนโดยประมาณ |
|---|---|---|
| P0 | จำเป็นต่อการเล่น MVP จบได้ | 11 backgrounds, character layers ครบ, portraits 5 สีหน้า, UI หลัก, ฟอนต์, rain/stars |
| P1 | ทำให้ MVP สมบูรณ์ขึ้น | NPC, เสียงบรรยากาศ, การ์ดอารมณ์, stairwell, exterior |
| P2 | Phase 2+ | เพลงจบ, SFX, PWA icons, Memory backgrounds |
