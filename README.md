# IF YOU WERE ME, AND I WERE YOU

*Two hearts. Two perspectives. One story.*

เกม Narrative แบบ Pixel Art 16-bit สำหรับสองคนที่อยากเข้าใจกันมากขึ้น ไม่มีคะแนน ไม่มีใครผิด

**สถานะ:** M2 UI Shell — หน้าแรก, Safety Intro, เลือกโหมด, ตั้งค่า, เกี่ยวกับเกม และ component กลางพร้อมใช้ ยังเล่นเนื้อเรื่องไม่ได้ (โหมดเล่นเปิดใน M3–M4)

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
npm run lint
npm run build
```
