// HOW MUCH OF EACH WORLD IS ACTUALLY ALLOWED TO SHINE?
//
// The per-vertex specular channel (island.ts: aGloss, GLOSS_BODY,
// GLOSS_RADIANCE) works — it was A/B'd when it shipped, and the second version
// fixed the first one running backwards. But it only fires on colours somebody
// REGISTERED. glossOf() returns 0 for anything not in the table, and 0 means
// exactly the matte the owner is complaining about.
//
// So the question is not "does the feature work", it is "what fraction of what
// the player looks at is in the table". Counting registry entries answers the
// wrong question: one entry can be the colour of every window in a city and
// another can be a single bolt. Count VERTICES instead, on the real scene, per
// world, and split them by how glossy they were told to be.
//
//   verts        vertices in merged props carrying an aGloss attribute
//   glossy       the ones with aGloss > 0, i.e. anything but dead matte
//   strong       aGloss >= 0.5 — reads as metal or glass, not just waxed
//   distinct     how many distinct gloss levels are in use (the palette's width)
//
//   node qa/glosscov.mjs [port] [worlds]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4173';
const WORLDS = (process.argv[3] || 'maple,pirate,gameday,lantern').split(',');

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

console.log('  world        verts       glossy        strong      distinct levels');
const rows = [];
for (const w of WORLDS) {
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
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
  }));
  await p.evaluate(() => document.getElementById('btnPlay')?.click());
  await p.waitForTimeout(1400);
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), w);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.waitForTimeout(2500);

  const m = await p.evaluate(() => {
    let verts = 0, glossy = 0, strong = 0;
    const levels = new Map();
    window.__scene.traverse((o) => {
      const g = o.geometry;
      if (!g || !g.getAttribute) return;
      const a = g.getAttribute('aGloss');
      if (!a) return;
      const arr = a.array;
      verts += arr.length;
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i];                     // Uint8 normalised, 0..255
        if (v > 0) glossy++;
        if (v >= 128) strong++;
        if (v > 0) levels.set(v, (levels.get(v) || 0) + 1);
      }
    });
    return { verts, glossy, strong, levels: [...levels.entries()].sort((a, b) => b[1] - a[1]) };
  });
  await p.close();
  rows.push({ w, ...m });
  const pct = (n) => (m.verts ? (n / m.verts * 100).toFixed(1) : '0.0').padStart(5);
  console.log(`  ${w.padEnd(9)} ${String(m.verts).padStart(9)}   ${pct(m.glossy)}%`
    + `      ${pct(m.strong)}%          ${m.levels.length}`);
}
await b.close();

console.log('\n══ THE GLOSS LEVELS IN USE, BY VERTEX COUNT');
for (const r of rows) {
  const top = r.levels.slice(0, 6)
    .map(([v, n]) => `${(v / 255).toFixed(2)}:${(n / Math.max(1, r.verts) * 100).toFixed(1)}%`).join('  ');
  console.log(`  ${r.w.padEnd(9)} ${top || '(nothing registered)'}`);
}
console.log('\n══ READ IT LIKE THIS');
console.log('  glossy    a world where this is a few percent is a world of cardboard with');
console.log('            four shiny windows in it. The feature is not the problem; the');
console.log('            registry is. Every unregistered colour is dead matte by default.');
console.log('  strong    metal and glass. A world with none has no hard highlight anywhere,');
console.log('            which is the single loudest "cheap" tell on a phone screen.');
const thin = rows.filter((r) => r.glossy / Math.max(1, r.verts) < 0.12);
console.log(thin.length
  ? `\nTHIN at: ${thin.map((r) => r.w).join(', ')}`
  : '\nPASS — every world carries a meaningful glossy fraction.');
process.exit(thin.length ? 1 : 0);
