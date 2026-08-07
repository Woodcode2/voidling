// BEFORE/AFTER for the baked-AO-in-part() prototype.
//   node qa/_gaoshot.mjs <label> <port> [worlds]
// Same world, same seed, same warp point (printed so the two runs can be
// checked against each other), same pinned quality rung, 1290x2796.
import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('qa-out', { recursive: true });
const LABEL = process.argv[2] || 'before';
const PORT = process.argv[3] || '4231';
const WORLDS = (process.argv[4] || 'maple,lantern').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  p.setDefaultTimeout(400000);
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
  await p.addStyleTag({ content: 'body > *:not(canvas){visibility:hidden!important}' });
  await p.waitForTimeout(2500);
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
    return l ? { x: +(l.x / l.n).toFixed(1), z: +(l.z / l.n).toFixed(1), n: l.n } : { x: 0, z: 0, n: 0 };
  });
  await p.evaluate(({ x, z }) => { window.__setVoidR(2.2); window.__warpVoid(x, z); window.__setMood('victory'); }, spot);
  await p.waitForTimeout(3000);
  const f = `qa-out/ao-${wid}-${LABEL}.png`;
  await p.screenshot({ path: f, timeout: 400000 });
  const calls = await p.evaluate(() => window.__renderer.info.render.calls);
  console.log(`${f}  warp (${spot.x}, ${spot.z}) n=${spot.n}  draw calls ${calls}`);
  await p.close();
}
await b.close();
