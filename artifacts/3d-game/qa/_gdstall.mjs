// WHY DOES GAME DAY'S BAND THIN OUT AT FULL SIZE?
//
//   node qa/_gdstall.mjs [world]
//
// qa/music.mjs measures 25-30 voices/sec on GAME DAY at r=4 and 10-12 at r=11,
// twice, while the same score rendered offline at stage 2 and stage 3 is
// identical. So the loss is not in the music — it is in the pump. Every score
// is a 110 ms setInterval that stamps notes up to 350 ms ahead and then does
//     if (nextT < now) nextT = now + 0.05;
// which SILENTLY DISCARDS every note the stall ran over. This measures the two
// together: how long the main thread goes away for, and how many voices survive.
import { chromium } from 'playwright';

const w = process.argv[2] || 'gameday';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox',
    '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '0');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private */ } });
await p.goto(`http://127.0.0.1:4177/?w=${w}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await p.click(`#worldRow .wCard[data-world="${w}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });

console.log(`${w}   r      voices/s   setInterval gap ms: median  p90  max   > 350ms`);
for (const r of [1.2, 4, 8, 11, 16]) {
  await p.evaluate((rr) => window.__setVoidR(rr), r);
  await p.waitForTimeout(2000);
  const out = await p.evaluate(async () => {
    let k = 0;
    const P = AudioContext.prototype;
    const o0 = P.createOscillator, b0 = P.createBufferSource;
    P.createOscillator = function () { k++; return o0.call(this); };
    P.createBufferSource = function () { k++; return b0.call(this); };
    // the same 110 ms heartbeat every scheduler runs on, measured from inside
    const gaps = []; let last = performance.now();
    const id = setInterval(() => { const n = performance.now(); gaps.push(n - last); last = n; }, 110);
    await new Promise((z) => setTimeout(z, 6000));
    clearInterval(id);
    P.createOscillator = o0; P.createBufferSource = b0;
    gaps.sort((a, b) => a - b);
    const q = (f) => gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * f))] || 0;
    return { rate: k / 6, med: q(0.5), p90: q(0.9), max: gaps[gaps.length - 1] || 0,
      over: gaps.filter((g) => g > 350).length, n: gaps.length };
  });
  console.log(`      ${String(r).padStart(4)}  ${out.rate.toFixed(1).padStart(9)}   ` +
    `${out.med.toFixed(0).padStart(6)} ${out.p90.toFixed(0).padStart(4)} ${out.max.toFixed(0).padStart(5)}   ` +
    `${out.over}/${out.n}`);
}
await p.close(); await b.close();
