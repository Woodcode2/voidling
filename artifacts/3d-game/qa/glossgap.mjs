// WHICH COLOURS ARE CARRYING A WORLD, AND WHICH OF THEM ARE DEAD MATTE?
//
// qa/glosscov.mjs says Maple Falls is 5.3% glossy where Game Day is 38.4%.
// Maple is the world a child sees FIRST and the one in the store screenshots,
// so that gap is the most expensive one in the game. But "add more gloss" is
// not a fix, it is a guess — this prints WHERE THE MASS ACTUALLY IS, so the
// registry is aimed at the colours that cover the world rather than at whatever
// came to mind.
//
// Vertex colour is stored Uint16-normalised and LINEAR (part() calls
// Color.setHex, and three's ColorManagement converts sRGB -> linear on the way
// in). It is converted back through the sRGB transfer here so the number
// printed is the hex an art module actually wrote.
//
//   node qa/glossgap.mjs [port] [world] [topN]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4173';
const WORLD = process.argv[3] || 'maple';
const TOP = Number(process.argv[4] || 26);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { }
});
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
}));
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1400);
await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.waitForTimeout(2500);

const res = await p.evaluate(() => {
  // linear -> sRGB, three's own transfer
  const enc = (c) => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  const bucket = new Map();
  let total = 0;
  window.__scene.traverse((o) => {
    const g = o.geometry;
    if (!g || !g.getAttribute) return;
    const col = g.getAttribute('color'), gl = g.getAttribute('aGloss');
    if (!col || !gl) return;
    const c = col.array, a = gl.array, n = gl.array.length;
    // Sample rather than walk all nine million: every part() floods one colour
    // across its whole geometry, so a stride cannot miss a colour that matters
    // and the counts stay proportional. Stride is prime to avoid resonating
    // with any regular vertex-per-part count.
    const STRIDE = 7;
    for (let i = 0; i < n; i += STRIDE) {
      const r = Math.round(enc(c[i * 3] / 65535) * 255);
      const gg = Math.round(enc(c[i * 3 + 1] / 65535) * 255);
      const bb = Math.round(enc(c[i * 3 + 2] / 65535) * 255);
      const hex = (r << 16) | (gg << 8) | bb;
      const e = bucket.get(hex) || { n: 0, gloss: 0 };
      e.n++; e.gloss = Math.max(e.gloss, a[i] / 255);
      bucket.set(hex, e);
      total++;
    }
  });
  return {
    total,
    rows: [...bucket.entries()].map(([hex, e]) => ({ hex, n: e.n, gloss: e.gloss }))
      .sort((x, y) => y.n - x.n),
  };
});
await b.close();

const pad = (s, n) => String(s).padStart(n);
console.log(`\n══ ${WORLD.toUpperCase()} — where the surface area is (${res.total.toLocaleString()} sampled vertices)\n`);
console.log('   rank   colour     share    gloss   verdict');
let matteMass = 0;
res.rows.slice(0, TOP).forEach((r, i) => {
  const share = r.n / res.total * 100;
  if (r.gloss === 0) matteMass += share;
  const verdict = r.gloss > 0 ? `registered @ ${r.gloss.toFixed(2)}` : 'MATTE';
  console.log(`   ${pad(i + 1, 4)}   #${r.hex.toString(16).padStart(6, '0')}   ${pad(share.toFixed(2), 5)}%`
    + `    ${r.gloss.toFixed(2)}   ${verdict}`);
});
const allMatte = res.rows.filter((r) => r.gloss === 0).reduce((a, r) => a + r.n, 0) / res.total * 100;
console.log(`\n   distinct colours: ${res.rows.length}`);
console.log(`   matte share of the whole world: ${allMatte.toFixed(1)}%`);
console.log(`   matte share inside the top ${TOP}: ${matteMass.toFixed(1)}%`);
console.log('\n   A colour high in this list with gloss 0.00 is a large, flat, unlit');
console.log('   surface. Those are the ones worth registering; a shiny bolt is not.');
