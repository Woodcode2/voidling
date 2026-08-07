// HOW MANY PROPS DOES EACH WORLD ACTUALLY PLACE, and how big are they?
//
//   node qa/propcount.mjs [port]
//
// The before/after for deleting the GLB pack. Every glb() call site carries a
// procedural fallback, but placeFallback() refuses to register an INVISIBLE
// edible — `fb.children.length === 0 && !fb.isMesh` returns without adding it.
// So a call site whose fallback is missing or empty does not degrade to a
// box: the prop silently ceases to exist, and the only way to see that is to
// count them.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4188';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of ['maple', 'pirate', 'gameday', 'lantern']) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForTimeout(9000);   // let async GLB placement settle
  const r = await p.evaluate(() => {
    const es = window.__edibles.filter((e) => !e.eaten);
    const buckets = { 'r<1': 0, '1-2.5': 0, '2.5-5': 0, '5+': 0 };
    let big = 0;
    for (const e of es) {
      const r = e.radius;
      if (r < 1) buckets['r<1']++; else if (r < 2.5) buckets['1-2.5']++;
      else if (r < 5) buckets['2.5-5']++; else { buckets['5+']++; }
      if (r > big) big = r;
    }
    return { n: es.length, buckets, big: +big.toFixed(2),
      tris: window.__renderer.info.render.triangles, calls: window.__renderer.info.render.calls };
  });
  console.log(`${wid.padEnd(9)} ${String(r.n).padStart(5)} edibles   biggest r${String(r.big).padStart(5)}   `
    + Object.entries(r.buckets).map(([k, v]) => `${k}:${v}`).join(' '));
  await p.close();
}
await b.close();
