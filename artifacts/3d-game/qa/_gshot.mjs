// PHONE-SIZED FRAMES OF THE REAL GAME at three void sizes, pinned to quality 0.
//   node qa/_gshot.mjs [worlds] [port]
// 1290x2796 is the iPhone 15 Pro Max panel; we render 430x932 @ DPR 3.
import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('qa-out', { recursive: true });
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const PORT = process.argv[3] || '4231';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  p.setDefaultTimeout(300000);
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 600000 });
  await p.evaluate(() => window.__pinQuality(0));
  await p.waitForTimeout(3000);
  // find the densest cluster so the shot has a town in it, same rule as keyart
  const spot = await p.evaluate(() => {
    const cells = new Map();
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible) continue;
      const gx = Math.round(e.mesh.position.x / 30), gz = Math.round(e.mesh.position.z / 30);
      const k = gx + ',' + gz;
      const c = cells.get(k) || { n: 0, w: 0, x: 0, z: 0 };
      c.n++; c.w += e.radius; c.x += e.mesh.position.x; c.z += e.mesh.position.z; cells.set(k, c);
    }
    const l = [...cells.values()].filter(c => c.n > 10).sort((a, b) => b.w - a.w)[0];
    return l ? { x: +(l.x / l.n).toFixed(1), z: +(l.z / l.n).toFixed(1), n: l.n } : null;
  });
  for (const r of [1.2, 5, 12]) {
    await p.evaluate(({ x, z, r }) => { window.__setVoidR(r); window.__warpVoid(x, z); }, { ...spot, r });
    await p.waitForTimeout(2600);
    const f = `qa-out/gceil-${wid}-r${r}.png`;
    await p.screenshot({ path: f, timeout: 300000 });
    const info = await p.evaluate(() => ({ calls: window.__renderer.info.render.calls,
      tris: window.__renderer.info.render.triangles, q: window.__quality() }));
    console.log(`${f}  r=${r}  draw calls ${info.calls}  tris ${info.tris}  q${info.q.level}`);
  }
  await p.close();
}
await b.close();
