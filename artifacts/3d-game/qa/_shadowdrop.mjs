// WHEN DO THE SHADOWS GO OUT, AND DO THEY COME BACK?
//
//   node qa/_shadowdrop.mjs [world] [port] [seconds]
//
// prototype3d.ts:342-347 defines a four-rung quality ladder whose LAST rung
// sets `shadows: false`, and 4631-4636 walks down a rung whenever measured fps
// is under 46 and only walks back up over 57. Rung 3 also drops prSmall to
// 1.0. So one fps threshold costs the game every cast shadow AND a third of
// its resolution.
//
// That matters more than it looks, because a prop only gets a soft contact
// disc when it does NOT cast (assets3d.ts:255 and :295 —
// `if (!fbCast) fb.add(contactShadow(...))`). Everything big enough to cast —
// the trees, the houses, the stadium — has no fallback at all, so at rung 3 it
// loses its only ground contact and reads as floating.
//
// This runs the world at a phone's own resolution and samples the live
// renderer state against MATCH time.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4191';
const SECS = +(process.argv[4] || 70);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
p.setDefaultTimeout(400000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

await p.evaluate(() => {
  window.__sd = [];
  let frames = 0, last = performance.now();
  const raf = () => { frames++; requestAnimationFrame(raf); }; requestAnimationFrame(raf);
  setInterval(() => {
    const now = performance.now(); const fps = frames / ((now - last) / 1000);
    frames = 0; last = now;
    const R = window.__renderer;
    window.__sd.push({ t: +(window.__matchState?.().t ?? 0).toFixed(1), fps: +fps.toFixed(1),
      sh: R.shadowMap.enabled, pr: +R.getPixelRatio().toFixed(2),
      shMap: R.shadowMap.enabled ? 'on' : 'off' });
  }, 2000);
});
await p.waitForTimeout(SECS * 1000);
const rows = await p.evaluate(() => window.__sd);
await b.close();
console.log(`\n══ ${WORLD.toUpperCase()} — 430x932 DPR3, ${SECS}s of wall clock ══`);
console.log('  matchT    fps   shadowMap   pixelRatio');
for (const r of rows) console.log(`  ${String(r.t).padStart(6)}  ${String(r.fps).padStart(5)}   ${r.shMap.padEnd(9)}   ${r.pr}`);
const off = rows.find(r => !r.sh);
console.log(off ? `\n  >>> SHADOWS OFF from match t=${off.t}s onward; pixelRatio ${off.pr}`
                : '\n  shadows stayed on for the whole sample');
