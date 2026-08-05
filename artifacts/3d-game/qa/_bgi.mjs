// DOES THE LIGHT-RIG FIX CLOBBER THE PAINTED SKY ON MATCH 2?
//
// island.ts:518 sets scene.backgroundIntensity = 1.0 for the procedural
// fallback sky, and island.ts:527 sets it to 0.55 when the CDN nebula lands
// ("deep rich nebula, not washed lavender"). prototype3d.ts:294 —
// applyLightRig(), the one-place fix — writes RIG.bgI = 1.0 unconditionally,
// and resetMatch() calls it (prototype3d.ts:3122).
//
// So on any device where the nebula loads, match 1 shows it at 0.55 and every
// match after that shows it at 1.0. lightdrift.mjs cannot see this because the
// CDN is unreachable in the sandbox, so the background never leaves the
// fallback and 1.0 -> 1.0 looks clean.
//
// This fakes the CDN: the sky URL is fulfilled locally, so the loader's
// callback fires exactly as it does in production.
import { chromium } from 'playwright';
const PORT = process.argv[3] || '4177';
// 8x8 magenta PNG — content does not matter, only that the load SUCCEEDS
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4//8/w38GIAXDD9JlAAAAAElFTkSuQmCC',
  'base64');

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of (process.argv[2] || 'maple').split(',')) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.route('**/assets/hf/hf_20260717_021720_*.png',
    r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });

  const read = () => ({
    bgI: window.__scene.backgroundIntensity,
    bg: window.__scene.background?.isTexture
      ? (window.__scene.background.image?.width + 'x' + window.__scene.background.image?.height) : 'none',
  });
  const first = await p.evaluate(read);
  await p.evaluate(() => { window.__renderer.render = () => {}; });
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000 });
  await p.click('#btnAgain');
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2, null, { timeout: 600000 });
  const second = await p.evaluate(read);
  console.log(`\n══ ${wid.toUpperCase()} ══`);
  console.log(`  match 1  backgroundIntensity ${first.bgI}   sky ${first.bg}`);
  console.log(`  match 2  backgroundIntensity ${second.bgI}   sky ${second.bg}`);
  console.log(first.bgI === second.bgI
    ? '  sky intensity holds'
    : `  >>> SKY CLOBBERED: ${first.bgI} -> ${second.bgI}  (+${((second.bgI / first.bgI - 1) * 100).toFixed(0)}%)`);
  await p.close();
}
await b.close();
