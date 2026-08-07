import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await p.click('#worldRow .wCard[data-world="maple"]');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });
await p.evaluate(async () => {
  window.__pinQuality(0);
  // small void, dense street: props fill the frame instead of the hero
  // DOWNTOWN, AND BIG PROPS. contactShadow() only attaches a disc to props
  // that do NOT cast a real shadow, so bins and postboxes are already darkened
  // at the base by an existing feature and are the worst possible place to
  // look for baked AO. Buildings get no disc — this is where it can show.
  window.__setVoidR(3.0);
  window.__warpVoid(-63, 70);   // Maple's downtown block
  // freeze everything that walks, so a diff measures shading and not a crowd
  window.__scene.traverse((o) => {
    if (o.userData && (o.userData.mover || o.userData.ped)) o.visible = false;
    if (o.isSprite || o.isPoints) o.visible = false;
  });
  for (let i = 0; i < 90; i++) await new Promise((r) => requestAnimationFrame(r));
});
await p.screenshot({ path: 'qa-out/ao-props.png', clip: { x: 0, y: 60, width: 430, height: 620 } });
console.log('wrote qa-out/ao-props.png');
await b.close();
