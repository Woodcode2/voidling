// Spam the exits: results screen, tutorial, parental gate, and the
// PLAY AGAIN / HOME race. Then a genuinely FIRST-EVER player with empty storage.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4271;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const mk = async (init) => {
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  pg.on('pageerror', e => console.log('  PAGEERROR', e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/403|Forbidden|net::ERR/.test(m.text())) console.log('  CONSOLE-ERR', m.text().slice(0, 140)); });
  await pg.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  if (init) await pg.addInitScript(init);
  return pg;
};
const primed = () => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} };
const shown = (pg) => pg.evaluate(() => ['menu','worlds','loadScr','tut','end','daily','book','settings','pause','gate','shop','trophies','topvoids','policy','skinPrev']
  .filter(i => getComputedStyle(document.getElementById(i)).display !== 'none'));
const st = (pg) => pg.evaluate(() => { try { const m = window.__matchState(); return `t=${m.t.toFixed(1)} clock=${m.clock.toFixed(1)}`; } catch { return 'ERR'; } });

// ── A: FIRST-EVER player, empty storage, spam through the whole funnel ──────
console.log('\n=== A. first-ever player, empty storage, every button double-tapped ===');
{
  const pg = await mk();
  await pg.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
  await pg.waitForTimeout(2000);
  console.log('  boot:', await shown(pg), await st(pg));
  await pg.evaluate(() => { const d = document.getElementById('daily'); if (d.classList.contains('show')) { const c = document.getElementById('dailyClaim'); c.click(); c.click(); c.click(); } });
  await pg.waitForTimeout(1400);
  console.log('  after CLAIM x3:', await shown(pg));
  await pg.evaluate(() => { const p = document.getElementById('btnPlay'); p.click(); p.click(); });
  await pg.waitForTimeout(500);
  console.log('  after PLAY x2:', await shown(pg));
  await pg.evaluate(() => { const c = document.querySelector('#worldRow .wCard[data-world="maple"]'); c.click(); c.click(); });
  await pg.waitForTimeout(800);
  console.log('  after card x2:', await shown(pg), await st(pg));
  await pg.evaluate(() => { const g = document.getElementById('btnGotIt'); if (g) { g.click(); g.click(); g.click(); } });
  await pg.waitForTimeout(1200);
  console.log('  after LETS EAT x3:', await shown(pg), await st(pg));
  await pg.waitForFunction(() => { try { return window.__matchState().t > 1; } catch { return false; } }, null, { timeout: 200000 })
    .then(() => console.log('  match running'))
    .catch(() => console.log('  !! MATCH NEVER STARTED for a first-ever player'));
  await pg.close();
}

// ── B: results screen spam + PLAY AGAIN/HOME race ──────────────────────────
console.log('\n=== B. results screen: double-tap PLAY AGAIN, then PLAY AGAIN+HOME together ===');
{
  const pg = await mk(primed);
  await pg.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => { window.__renderer.render = () => {}; document.getElementById('btnPlay').click(); });
  await pg.waitForTimeout(400);
  await pg.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]').click());
  await pg.waitForFunction(() => { try { return window.__matchState().t > 1; } catch { return false; } }, null, { timeout: 200000 });
  const toEnd = async () => { await pg.evaluate(() => window.__rushClock(0.8));
    await pg.waitForFunction(() => getComputedStyle(document.getElementById('end')).display !== 'none', null, { timeout: 90000 }).catch(() => {});
    await pg.waitForTimeout(1200); };
  await toEnd();
  console.log('  at whistle:', await shown(pg));
  await pg.evaluate(() => { const a = document.getElementById('btnAgain'); a.click(); a.click(); a.click(); });
  await pg.waitForTimeout(1500);
  console.log('  after PLAY AGAIN x3:', await shown(pg), await st(pg));
  const clock1 = await pg.evaluate(() => window.__matchState().clock);
  await pg.waitForTimeout(1500);
  const clock2 = await pg.evaluate(() => window.__matchState().clock);
  console.log(`  clock ${clock1.toFixed(1)} -> ${clock2.toFixed(1)} (one clock, not two: ${clock1 > clock2 ? 'draining' : 'STALLED'})`);
  await toEnd();
  console.log('  second whistle:', await shown(pg));
  await pg.evaluate(() => { document.getElementById('btnAgain').click(); document.getElementById('btnHome').click(); });
  await pg.waitForTimeout(2000);
  console.log('  after AGAIN+HOME in the same tick:', await shown(pg), await st(pg));
  const canEscape = await pg.evaluate(() => {
    const p = document.getElementById('btnPlay'); const r = p.getBoundingClientRect();
    if (!r.width) return 'PLAY has zero size';
    const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return (t === p || p.contains(t)) ? 'PLAY reachable' : 'PLAY blocked-by:' + (t ? (t.id || t.className) : 'null');
  });
  console.log('  escape route:', canEscape);
  await pg.close();
}

// ── C: parental gate spam ──────────────────────────────────────────────────
console.log('\n=== C. parental gate: spam CONTINUE with junk, then NOT NOW ===');
{
  const pg = await mk(primed);
  await pg.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => document.getElementById('btnSettings').click());
  await pg.waitForTimeout(300);
  await pg.evaluate(() => document.getElementById('setPrivacy').click());
  await pg.waitForTimeout(400);
  console.log('  after PRIVACY POLICY:', await shown(pg));
  for (let i = 0; i < 12; i++) await pg.evaluate(() => {
    const inp = document.getElementById('gateIn'); if (inp) inp.value = String(Math.floor(Math.random() * 99));
    const g = document.getElementById('gateGo'); if (g) g.click();
  });
  await pg.waitForTimeout(500);
  console.log('  after 12 wrong answers:', await shown(pg),
    await pg.evaluate(() => document.getElementById('gateErr') ? document.getElementById('gateErr').textContent : ''));
  await pg.evaluate(() => { const n = document.getElementById('gateNo'); if (n) { n.click(); n.click(); } });
  await pg.waitForTimeout(400);
  console.log('  after NOT NOW x2:', await shown(pg));
  for (let i = 0; i < 6; i++) await pg.evaluate(() => {
    for (const id of ['polClose','setClose']) { const e = document.getElementById(id); if (e && e.offsetParent !== null) e.click(); }
  });
  await pg.waitForTimeout(400);
  console.log('  back at:', await shown(pg));
  console.log('  PLAY reachable:', await pg.evaluate(() => {
    const p = document.getElementById('btnPlay'); const r = p.getBoundingClientRect();
    const t = r.width ? document.elementFromPoint(r.left + r.width/2, r.top + r.height/2) : null;
    return !t ? 'zero' : (t === p || p.contains(t)) ? 'HIT' : 'blocked-by:' + (t.id || t.className); }));
  await pg.close();
}
await b.close();
