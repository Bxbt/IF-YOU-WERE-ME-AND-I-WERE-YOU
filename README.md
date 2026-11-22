# IF YOU WERE ME, AND I WERE YOU

![IF YOU WERE ME, AND I WERE YOU](public/brand/og.jpg)

*Two hearts. Two perspectives. One story.*

เกม Narrative แบบ Pixel Art 16-bit สำหรับสองคนที่อยากเข้าใจกันมากขึ้น ไม่มีคะแนน ไม่มีใครผิด

**สถานะ:** MVP (M1–M7) — เล่นคนเดียวได้ครบ 5 บท + เปรียบเทียบ + สมุดบันทึก/ส่งออก · ผลตรวจ QA: [reviews/mvp-qa-2026-11-22.md](reviews/mvp-qa-2026-11-22.md) · ถัดไป Phase 2 (เล่นด้วยกันบนเครื่องเดียว)

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

## Live play server (Phase 3C)

Remote live play needs the small relay in `server/` (docs/10 §10.3). Deploy as a Portainer stack:

1. Portainer → Stacks → Add stack → Repository (this repo) or paste `docker-compose.yml`.
2. Environment variables: `POSTGRES_PASSWORD` (long random string) and `CLOUDFLARE_TUNNEL_TOKEN`
   (Cloudflare Zero Trust → Networks → Tunnels → create → public hostname → service `http://app:8080`).
3. Deploy, then open the public hostname. "เล่นระยะไกล" works only when opened from that address.

Local: `npm run build && node server/index.mjs` (in-memory store, port 8080).
