# IF YOU WERE ME, AND I WERE YOU

*Two hearts. Two perspectives. One story.*

เกม Narrative แบบ Pixel Art 16-bit สำหรับสองคนที่อยากเข้าใจกันมากขึ้น ไม่มีคะแนน ไม่มีใครผิด

**สถานะ:** M6 — เล่นได้ครบ 5 บทจนจบ + หน้าเปรียบเทียบ (S8) และสมุดบันทึก/รายงาน (S9) พร้อมส่งออก .txt / .json / การ์ดภาพ .png · ถัดไป M7 (Polish & QA)

## เอกสาร

เอกสารออกแบบทั้งหมดอยู่ใน [`docs/`](docs/) เริ่มที่ [docs/00-project-overview.md](docs/00-project-overview.md) · ผลการตรวจก่อนพัฒนา: [reviews/](reviews/)

## พัฒนา

ต้องใช้ Node.js 22

```bash
npm ci
npm run dev        # http://localhost:5173
npm test           # unit + component tests
npm run test:e2e   # Playwright E2E + axe (ครั้งแรก: npx playwright install chromium webkit)
npm run typecheck
npm run content:lint # ตรวจไฟล์บท (docs/10 §4)
npm run lint
npm run build
```
