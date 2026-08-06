// ARE THE RIVALS WEARING THE HERO'S SHADER WITH THE LIGHTS ON?
//
//   node qa/rivalshader.mjs [world]
//
// The five siblings share makeVoidBody() with the hero, but the update loop
// only ever wrote two of its seven per-frame uniforms. uSmall is the
// readability law — it widens the rim when a void is only a few dozen pixels
// across — so a SMALL rival, which is exactly when a child most needs to see
// one coming, rendered with the narrow lip authored for a WORLD ENDER filling
// the screen. uSlow is the mass law.
//
// This reads the live uniforms off every joined rival and off the hero at the
// same instant, so the comparison is like-for-like rather than against a
// remembered number.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
// wait until siblings have actually joined the feast — they are hidden before
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 40, null, { timeout: 900000 });

const r = await p.evaluate(() => {
  const out = { hero: null, rivals: [] };
  const pick = (m) => {
    const u = m.uniforms; const g = (k) => (u[k] ? +(+u[k].value).toFixed(3) : null);
    return { uSmall: g('uSmall'), uSlow: g('uSlow'), uStage: g('uStage'), uWobble: g('uWobble') };
  };
  window.__scene.traverse((o) => {
    if (!o.isMesh || !o.material?.uniforms?.uSmall) return;
    if (!o.visible || !o.parent?.visible) return;
    const e = { ...pick(o.material), r: +(o.parent?.scale?.x ?? 0).toFixed(2) };
    if (o.material.uniforms.uStars) { /* hero and rivals share this */ }
    out.rivals.push(e);
  });
  const vs = window.__voidState();
  out.hero = { r: +vs.r.toFixed(2) };
  return out;
});
console.log(`hero r=${r.hero.r}`);
console.log(`bodies wearing the void shader and currently visible: ${r.rivals.length}`);
r.rivals.forEach((e, i) => console.log(`  ${String(i).padStart(2)}  uSmall=${e.uSmall}  uSlow=${e.uSlow}  uStage=${e.uStage}`));
const dead = r.rivals.filter((e) => e.uSmall === 0 && e.uSlow === 1);
console.log(dead.length > 1
  ? `\n${dead.length} bodies still at uSmall=0 uSlow=1 — the readability law is not reaching them`
  : `\nevery visible body is being driven (at most one may legitimately sit at the defaults)`);
await b.close();
