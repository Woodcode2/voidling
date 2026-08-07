// HOW MUCH OF THE APP IS SILENT?
//   node qa/_silence.mjs <port> <world>
// Voices constructed per wall second on the menu, in the world picker, and on
// the results screen — the three places a child spends time that are not the
// 180 s of match the score was written for.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4243';
const W = process.argv[3] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '0');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { /* */ } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
const count = async (label, sec = 3) => {
  const n = await p.evaluate(async (s) => {
    let k = 0;
    const P = Object.getPrototypeOf(AudioContext.prototype);
    const o0 = P.createOscillator, b0 = P.createBufferSource;
    P.createOscillator = function () { k++; return o0.call(this); };
    P.createBufferSource = function () { k++; return b0.call(this); };
    await new Promise((z) => setTimeout(z, s * 1000));
    P.createOscillator = o0; P.createBufferSource = b0;
    return k;
  }, sec);
  console.log(`${label.padEnd(34)} ${(n / sec).toFixed(1)} voices/sec`);
};
// a gesture first, so the context is unlocked and "silent" means silent by
// design rather than silent because autoplay policy has not been satisfied
await p.mouse.click(215, 900);
await count('MENU (after a tap, before PLAY)');
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await count('WORLD PICKER');
await p.click(`#worldRow .wCard[data-world="${W}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });
await p.evaluate(() => { window.__renderer.render = () => {}; });
await count('MATCH (stage 0, no input)');
await p.evaluate(() => { window.__rushClock?.(2); });
await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000 });
await p.waitForTimeout(4000);
await count('RESULTS SCREEN (4s after the win sting)');
await b.close();
