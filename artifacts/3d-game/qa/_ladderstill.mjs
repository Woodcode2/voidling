// diagnostic for qa/reveal.mjs #2: WHICH pixels change after the freeze, and what is at them
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
const SEED = JSON.stringify({ v: 1, seen: 1, w: { maple: { 1: { st: 'open', best: 0, pct: 0, first: '', n: 0 } } } });
await p.addInitScript((lv) => { try { localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidMute', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  localStorage.setItem('voidLevels', lv); } catch {}
  window.__anl = []; const t = () => Math.round(performance.now());
  for (const ev of ['animationstart', 'animationend', 'transitionrun', 'transitionend'])
    document.addEventListener(ev, (e) => window.__anl.push(`${t()} ${ev} ${e.animationName || e.propertyName} @${e.target.id || e.target.className || e.target.tagName}`), true);
}, SEED);
await p.goto(`http://127.0.0.1:${PORT}/?w=maple&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__menuState, null, { timeout: 420000 });
await p.waitForSelector('#mlPips .pip', { timeout: 180000 });
const box = await p.evaluate(() => { const r = document.getElementById('mlPips').getBoundingClientRect(); const pad = 12;
  return { x: Math.max(0, Math.round(r.x - pad)), y: Math.max(0, Math.round(r.y - pad)), width: Math.round(r.width + pad * 2), height: Math.round(r.height + pad * 2) }; });
await new Promise((r) => setTimeout(r, 6000));
// the reveal probe's LIVE churn, before the freeze: four shots of the moving world
for (let i = 0; i < 4; i++) { await p.screenshot({ clip: box }); await new Promise((r) => setTimeout(r, 150)); }
const tFreeze = await p.evaluate(() => {
  const keep = document.getElementById('mlPips');
  for (const c of Array.from(document.body.children)) { if (c === keep || c.contains(keep)) continue; c.style.display = 'none'; }
  for (const cv of Array.from(document.querySelectorAll('canvas'))) cv.style.display = 'none';
  return Math.round(performance.now());
});
await new Promise((r) => setTimeout(r, 400));
const shots = [];
for (let i = 0; i < 4; i++) { const ts = await p.evaluate(() => Math.round(performance.now())); shots.push({ ts, png: PNG.sync.read(await p.screenshot({ clip: box })) }); await new Promise((r) => setTimeout(r, 150)); }
for (let i = 1; i < 4; i++) {
  const a = shots[i - 1].png, c = shots[i].png, pts = [];
  for (let k = 0; k < a.data.length; k += 4) if (a.data[k] !== c.data[k] || a.data[k + 1] !== c.data[k + 1] || a.data[k + 2] !== c.data[k + 2]) {
    const px = (k / 4) % a.width, py = Math.floor(k / 4 / a.width);
    pts.push({ x: box.x + px, y: box.y + py, from: [a.data[k], a.data[k + 1], a.data[k + 2]], to: [c.data[k], c.data[k + 1], c.data[k + 2]] });
  }
  const at = await p.evaluate((ps) => ps.slice(0, 8).map((q) => { const e = document.elementFromPoint(q.x, q.y); return `${q.x},${q.y} ${q.from}->${q.to} on ${e ? (e.id || e.className || e.tagName) : '?'}`; }), pts);
  console.log(`shots ${i - 1}->${i} (t ${shots[i - 1].ts}->${shots[i].ts}): ${pts.length} px`); for (const l of at) console.log('   ', l);
}
const anl = await p.evaluate(() => window.__anl);
console.log(`freeze at ${tFreeze}; events:`); for (const l of anl.slice(-25)) console.log('   ', l);
await b.close();
