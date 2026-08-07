// THE COST OF THE QUALITY LADDER MOVING, and the cost of the half-rate shadow
// pass. Both are real-GPU questions, so render is LEFT IN (swiftshader — the
// absolute ms are not device numbers, the RATIO and the shader-program count
// are).
//   node qa/_fpq.mjs [world] [port]
// applyQuality() (prototype3d.ts:366) walks the WHOLE scene setting
// material.needsUpdate=true whenever the shadow flag flips. That is a full
// shader recompile of every material in the world, and the ladder fires it
// exactly when the device is already too slow (avg fps < 46, line 4745).
import { chromium } from 'playwright';
const WID = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4231';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
p.setDefaultTimeout(900000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WID}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WID}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 900000 });

await p.evaluate(() => {
  window.__pinQuality(0);
  const rawRAF = window.requestAnimationFrame.bind(window);
  const R = window.__renderer, orig = R.render.bind(R);
  window.__F = [];
  R.render = (s, c) => { const a = performance.now(); orig(s, c);
    window.__lastR = performance.now() - a;
    window.__lastCalls = R.info.render.calls; };
  window.requestAnimationFrame = (cb) => rawRAF((ts) => {
    const a = performance.now(); cb(ts);
    window.__F.push({ f: performance.now() - a, r: window.__lastR || 0,
      c: window.__lastCalls || 0, p: R.info.programs.length, t: performance.now() });
    if (window.__F.length > 6000) window.__F.splice(0, 3000);
  });
});
const stat = (a) => { const s = [...a].sort((x, y) => x - y);
  return `p50 ${s[s.length >> 1].toFixed(1)} p95 ${s[Math.floor(s.length * .95)].toFixed(1)} max ${s[s.length - 1].toFixed(1)}`; };

// ── 1. the half-rate shadow pass: alternate frames do a whole extra pass
await p.waitForFunction(() => { window.__F.length = 0; return true; });
await p.waitForFunction(() => window.__F.length > 140, null, { timeout: 900000 });
const sh = await p.evaluate(() => window.__F.slice(20, 140));
const callsSet = [...new Set(sh.map(x => x.c))].sort((a, x) => a - x);
const lo = sh.filter(x => x.c <= callsSet[0] + 2).map(x => x.r);
const hi = sh.filter(x => x.c >= callsSet[callsSet.length - 1] - 2).map(x => x.r);
console.log(`\n═══ ${WID.toUpperCase()}  rung 0 (shadows on, 2048, pr1)  ${await p.evaluate(() => JSON.stringify(window.__quality()))}`);
console.log(`  draw calls per frame, distinct values seen: ${callsSet.join(', ')}`);
console.log(`  HALF-RATE SHADOW PASS — render() on the light frames  ${stat(lo)}  (n=${lo.length}, ${callsSet[0]} calls)`);
console.log(`                          render() on the shadow frames ${stat(hi)}  (n=${hi.length}, ${callsSet[callsSet.length - 1]} calls)`);
console.log(`  → every other frame costs ${(hi.reduce((a, x) => a + x, 0) / hi.length / (lo.reduce((a, x) => a + x, 0) / lo.length)).toFixed(2)}x the one before it, forever.`);

// ── 2. the ladder moving: rung 2 → rung 3 flips shadows off and recompiles
for (const [from, to] of [[2, 3], [3, 2], [2, 3]]) {
  await p.evaluate(f => window.__pinQuality(f), from);
  await p.waitForFunction(() => window.__F.length > 30, null, { timeout: 900000 });
  await p.evaluate(() => { window.__F.length = 0; });
  await p.waitForFunction(() => window.__F.length > 40, null, { timeout: 900000 });
  const base = await p.evaluate(() => window.__F.slice(5, 40).map(x => x.f));
  const p0 = await p.evaluate(() => window.__renderer.info.programs.length);
  await p.evaluate(t => { window.__F.length = 0; window.__pinQuality(t); }, to);
  await p.waitForFunction(() => window.__F.length > 60, null, { timeout: 900000 });
  const after = await p.evaluate(() => window.__F.slice(0, 60));
  const p1 = await p.evaluate(() => window.__renderer.info.programs.length);
  const b0 = base.sort((a, x) => a - x)[base.length >> 1];
  const worst = Math.max(...after.map(x => x.f));
  const spent = after.reduce((a, x) => a + Math.max(0, x.f - b0), 0);
  console.log(`  QUALITY ${from} → ${to}: steady frame ${b0.toFixed(1)}ms → worst next frame ${worst.toFixed(1)}ms (${(worst / b0).toFixed(1)}x). Extra work spread over the next 60 frames: ${spent.toFixed(0)}ms. Shader programs ${p0} → ${p1}.`);
  console.log(`     first eight frames after the switch: ${after.slice(0, 8).map(x => x.f.toFixed(0)).join(', ')} ms`);
}
await p.close(); await b.close();
