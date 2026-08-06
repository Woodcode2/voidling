// STORE AUDIT probe 4 (scratch): AGE-RATING CONTENT CENSUS.
// Apple's questionnaire has a mandatory "Alcohol, Tobacco, or Drug Use or
// References" question. APPSTORE.md plans to answer NONE and take 4+. This
// counts what is actually in the world so that answer can be checked rather
// than assumed.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.log('  ERR', String(e).slice(0, 120)));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });

const WORDS = ['cigar', 'grog', 'rum', 'keg', 'cocktail', 'bar', 'tiki', 'sake', 'caviar', 'beer', 'smoker', 'cooler'];

for (const world of ['pirate', 'gameday', 'lantern', 'maple']) {
  await p.goto(`http://127.0.0.1:4177/?w=${world}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift', 'titlecard'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${world}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 1.0, null, { timeout: 400000 });
  const r = await p.evaluate((WORDS) => {
    const names = [];
    window.__scene.traverse((o) => { if (o.name) names.push(o.name); });
    const hits = {};
    for (const w of WORDS) {
      const n = names.filter((x) => x.toLowerCase().includes(w)).length;
      if (n) hits[w] = n;
    }
    return { world: window.__matchState?.().world ?? '?', meshes: names.length,
      distinct: [...new Set(names)].length, hits,
      sampleNames: [...new Set(names)].slice(0, 12) };
  }, WORDS);
  console.log(`\n== ${world} ==`, JSON.stringify(r, null, 1));
}
await b.close();
