// WHY DOES THE BAND THIN OUT WHEN THE VOID IS HUGE?
//   node qa/_pumpstarve.mjs <port> <world>
// qa/music.mjs reports MAPLE at 34 voices/s at r=4 and 4 voices/s at r=11,
// while the offline harness (qa/_notedens.mjs) says the arrangement at that
// stage schedules 27.5/s. The scheduler is a 110 ms setInterval that stamps
// notes 0.35 s ahead (audio3d.ts:220, :1829) — if the main thread stalls
// longer than the lookahead the score runs dry. This measures the pump's
// actual fire gaps and the frame interval next to each other.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4243';
const W = process.argv[3] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try { localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '0');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { /* */ }
  // instrument setInterval before any module runs
  window.__gaps = [];
  const SI = window.setInterval;
  window.setInterval = function (fn, ms, ...r) {
    if (ms !== 110) return SI.call(window, fn, ms, ...r);
    let last = performance.now();
    return SI.call(window, () => {
      const n = performance.now(); window.__gaps.push(n - last); last = n; fn();
    }, ms, ...r);
  };
});
await p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await p.click(`#worldRow .wCard[data-world="${W}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });
await p.evaluate(() => { window.__pinQuality?.(0); });

const probe = async (r) => {
  await p.evaluate((rr) => { window.__setVoidR(rr); window.__gaps.length = 0; window.__fr = []; }, r);
  await p.waitForTimeout(800);
  const out = await p.evaluate(async () => {
    let k = 0;
    const P = Object.getPrototypeOf(AudioContext.prototype);
    const o0 = P.createOscillator, b0 = P.createBufferSource;
    P.createOscillator = function () { k++; return o0.call(this); };
    P.createBufferSource = function () { k++; return b0.call(this); };
    window.__gaps.length = 0;
    const fr = []; let last = performance.now();
    let run = true;
    const tick = () => { const n = performance.now(); fr.push(n - last); last = n; if (run) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    await new Promise((z) => setTimeout(z, 4000));
    run = false;
    P.createOscillator = o0; P.createBufferSource = b0;
    const g = window.__gaps.slice().sort((a, c) => a - c);
    fr.sort((a, c) => a - c);
    return { voices: k / 4, pumpN: g.length, pumpMed: g[g.length >> 1] || 0, pumpMax: g[g.length - 1] || 0,
      frMed: fr[fr.length >> 1] || 0, frMax: fr[fr.length - 1] || 0,
      overLookahead: g.filter((x) => x > 350).length, quality: window.__quality?.() };
  });
  console.log(`r=${String(r).padStart(4)}  ${out.voices.toFixed(1).padStart(5)} voices/s   pump fires ${String(out.pumpN).padStart(3)} in 4s, median ${out.pumpMed.toFixed(0)}ms max ${out.pumpMax.toFixed(0)}ms, ${out.overLookahead} over the 350ms lookahead   frame median ${out.frMed.toFixed(0)}ms max ${out.frMax.toFixed(0)}ms`);
};
console.log(`${W} — quality pinned to rung 0`);
for (const r of [1.2, 4, 8, 11]) await probe(r);
await b.close();
