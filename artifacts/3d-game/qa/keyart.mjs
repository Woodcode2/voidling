// Stage the game's OWN money shot: a colossal void in the middle of Maple Falls.
// Everything in frame is the real game — the real houses, the real autumn
// maples, the real crowd, the real void with its galaxy interior and face.
import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('qa-out', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
// square-ish and big: crop to taste afterwards
const p = await b.newPage({ viewport: { width: 440, height: 782 }, deviceScaleFactor: 4 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto('http://127.0.0.1:4177/?w=maple', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click('#worldRow .wCard[data-world="maple"]');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });
await p.addStyleTag({ content: 'body > *:not(canvas){visibility:hidden!important}' });

// find the densest cluster of big props — that is "the middle of town"
const spots = await p.evaluate(() => {
  const cells = new Map();
  for (const e of window.__edibles) {
    if (e.eaten || !e.mesh?.visible) continue;
    const gx = Math.round(e.mesh.position.x / 30), gz = Math.round(e.mesh.position.z / 30);
    const k = gx + ',' + gz;
    const c = cells.get(k) || { n: 0, w: 0, x: 0, z: 0 };
    c.n++; c.w += e.radius; c.x += e.mesh.position.x; c.z += e.mesh.position.z;
    cells.set(k, c);
  }
  return [...cells.values()].filter(c => c.n > 12)
    .map(c => ({ x: +(c.x / c.n).toFixed(1), z: +(c.z / c.n).toFixed(1), n: c.n, w: +c.w.toFixed(0) }))
    .sort((a, b) => b.w - a.w).slice(0, 2);
});
console.log('densest town cells:', JSON.stringify(spots));

let i = 0;
for (const s of spots) {
  i++;
  await p.evaluate(({ x, z, r }) => {
    window.__setVoidR(r);
    window.__warpVoid(x, z);
    window.__setMood('victory');
  }, { x: s.x, z: s.z, r: 12 });
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `qa-out/keyart-${i}.png` });
  console.log(`wrote qa-out/keyart-${i}.png  at (${s.x}, ${s.z})  props=${s.n}`);
}
await b.close();
