// WHO IS IN THE CHOPPY BAND, PER WORLD — a census, not a timing.
//
//   node qa/moverbands.mjs [port]
//
// The owner: "on pirate bay and I assume the other levels there's item lag.
// Maple seems dialed now." The stagger policy is identical on every world
// (life.ts, two bands off one gate), so a per-world DIFFERENCE has to come
// from the populations: how many movers sit in each band at a typical play
// camera. The harness cannot measure frame pacing (swiftshader), but counts
// are counts. Reported per world at three void sizes:
//
//   full  — inside the gate, updates every frame
//   half  — gate..2x gate, every other frame (CAN be on screen: the visible-
//           chop band; big here = the world that reads as "item lag")
//   quart — beyond 2x gate (reliably off screen)
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const world of ['maple', 'pirate', 'gameday', 'lantern', 'powder']) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  p.on('pageerror', (e) => console.log('  PAGEERR ' + String(e).slice(0, 100)));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.goto(`http://127.0.0.1:${PORT}/?w=${world}&len=600`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 900000 });
  const rows = [];
  for (const r of [1.5, 6, 14]) {
    await p.evaluate((rr) => window.__setVoidR?.(rr), r).catch(() => {});
    await p.waitForTimeout(1500);
    const s = await p.evaluate(() => {
      const gate = window.__crowdGate;
      const near = window.__life.moverStats(gate);
      const half = window.__life.moverStats(gate * 2);
      return { gate: Math.round(gate), full: near.near, half: half.near - near.near,
        quart: near.total - half.near, total: near.total };
    });
    rows.push(`    r=${String(r).padEnd(4)} gate=${s.gate}  full=${s.full}  HALF=${s.half}  quart=${s.quart}  total=${s.total}`);
  }
  console.log(`  ${world}`);
  rows.forEach((l) => console.log(l));
  await p.close();
}
await b.close();
