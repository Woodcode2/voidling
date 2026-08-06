// How BAD is the unclamp on Lantern? Count audio nodes scheduled per second
// before and after musStage 4. If the scheduler dies, the score goes silent.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.addInitScript(() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  window.__nodes = 0;
  const o = AC.prototype.createOscillator; AC.prototype.createOscillator = function(...a){ window.__nodes++; return o.apply(this,a); };
  const s = AC.prototype.createBufferSource; AC.prototype.createBufferSource = function(...a){ window.__nodes++; return s.apply(this,a); };
});
await p.goto('http://127.0.0.1:4177/?w=lantern', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click('#worldRow .wCard[data-world="lantern"]');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.evaluate(() => { window.__renderer.render = () => {}; });
for (const st of [3, 4, 3]) {
  await p.evaluate(s => { window.__audio.setMusicStage(s); window.__nodes = 0; }, st);
  await p.waitForTimeout(4000);
  const n = await p.evaluate(() => window.__nodes);
  console.log(`  lantern musStage=${st}  audio nodes scheduled in 4s: ${n}`);
}
await p.close(); await b.close();
