// REFUTE — does the finding's fix (2) "unclamp the music" actually work?
// Drives the SHIPPED setMusicStage to 4 (WORLD ENDER's VISUAL_STAGE) on every
// world and counts thrown exceptions out of the scheduler.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of ['maple', 'pirate', 'gameday', 'lantern']) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => {}; });
  // let each tier run for a while, the way a real match steps through them
  for (const st of [0, 1, 2, 3, 4]) {
    const before = errs.length;
    await p.evaluate(s => window.__audio.setMusicStage(s), st);
    await p.waitForTimeout(2500);
    console.log(`  ${wid.padEnd(8)} musStage=${st}  new errors: ${errs.length - before}` +
      (errs.length > before ? `   << ${errs[before]}` : ''));
  }
  await p.close();
}
await b.close();
