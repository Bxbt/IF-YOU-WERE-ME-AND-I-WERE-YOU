# IF YOU WERE ME, AND I WERE YOU

*Two hearts. Two perspectives. One story.*

เกม Narrative แบบ Pixel Art 16-bit สำหรับสองคนที่อยากเข้าใจกันมากขึ้น ไม่มีคะแนน ไม่มีใครผิด

**สถานะ:** M5 — เล่นได้ครบ 5 บทจนถึงตอนจบ (S15): Timeline ของสองคน, เบื้องหลังคำพูด, Mirror แบบคนเดียว, ประโยคท้ายเรื่อง · เปรียบเทียบและรายงาน (M6) ยังปิดพร้อมเหตุผล · ดูฉากทั้งหมดได้ที่ `#/art-preview`

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
