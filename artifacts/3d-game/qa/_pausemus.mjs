// DOES PAUSE STOP THE BAND?
//   node qa/_pausemus.mjs <port> <world>
// Counts voices constructed per WALL second (audio scheduling runs on the
// AudioContext clock, which is real time even when the software renderer is
// slow, so this is the one place a wall clock is the correct instrument).
// Before pause, while the pause overlay is up, and after resume.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4243';
const WORLD = process.argv[3] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '0');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { /* */ } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });

const count = async (label) => {
  const n = await p.evaluate(async () => {
    let k = 0;
    const P = Object.getPrototypeOf(AudioContext.prototype);
    const o0 = P.createOscillator, b0 = P.createBufferSource;
    P.createOscillator = function () { k++; return o0.call(this); };
    P.createBufferSource = function () { k++; return b0.call(this); };
    await new Promise((z) => setTimeout(z, 3000));
    P.createOscillator = o0; P.createBufferSource = b0;
    return k;
  });
  console.log(`${label.padEnd(28)} ${(n / 3).toFixed(1)} voices/sec`);
  return n / 3;
};
const a = await count('playing');
await p.click('#btnQuit');
await p.waitForTimeout(500);
const shown = await p.evaluate(() => document.getElementById('pause')?.classList.contains('show'));
const paused = await count(`paused (overlay shown=${shown})`);
await p.click('#pauseResume'); await p.waitForTimeout(500);
const after = await count('resumed');
console.log(paused > a * 0.5
  ? `\nPAUSE DOES NOT SILENCE THE SCORE: ${(100 * paused / a).toFixed(0)}% of the playing rate keeps running`
  : `\nok: pause drops the score to ${(100 * paused / a).toFixed(0)}% of the playing rate`);
console.log(`resume returns to ${(100 * after / a).toFixed(0)}%`);
await b.close();
