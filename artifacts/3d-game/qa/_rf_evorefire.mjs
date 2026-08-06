// REFUTE — "a hunter bite walks curStage back, so the EVOLVE card re-fires a
// form the child already earned". Logs every EVOLVE card fire with its form
// text, every hunter bite, and the HUD form label, all against __matchState().t.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'gameday').split(',');
const RUNS = +(process.argv[3] || 1);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) for (let run = 0; run < RUNS; run++) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => {}; });
  await p.evaluate(() => {
    const log = []; window.__ev = log;
    const evo = document.getElementById('evolve');
    const gNow = document.querySelector('#growth .gNow');
    const T = () => +(window.__matchState?.().t ?? 0).toFixed(2);
    const R = () => +(window.__matchState?.().r ?? 0).toFixed(3);
    // 1. every time the EVOLVE card is (re)shown
    // NB: the card is retriggered with remove('show') + add('show') in the same
    // task, so one fire delivers two attribute records. Collapse per callback.
    new MutationObserver(ms => {
      if (!ms.some(m => m.attributeName === 'class')) return;
      if (evo.classList.contains('show'))
        log.push({ k: 'CARD', t: T(), form: (evo.querySelector('.big').textContent || '').trim(), r: R() });
    }).observe(evo, { attributes: true });
    // 2. the HUD form label (paintGrowth, live from stageFor(radius))
    let lastLbl = null;
    // 3. hunter bites, from the match state counters
    let hb = 0, nb = 0, lastR = null;
    const tick = () => {
      const ms = window.__matchState?.();
      if (ms) {
        const lbl = (gNow?.textContent || '').trim();
        if (lbl && lbl !== lastLbl) { log.push({ k: 'HUD', t: T(), form: lbl, r: R() }); lastLbl = lbl; }
        if (ms.ev.hunterBites > hb) { hb = ms.ev.hunterBites; log.push({ k: 'HUNTERBITE', t: T(), r: R(), was: lastR, score: Math.round(ms.score) }); }
        if (ms.ev.bites - ms.ev.hunterBites > nb) { nb = ms.ev.bites - ms.ev.hunterBites; log.push({ k: 'nibble', t: T(), r: R() }); }
        lastR = R();
      }
      // steer at the nearest edible we can actually swallow
      const vs = window.__voidState();
      let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z, d = dx * dx + dz * dz;
        if (d < bd) { bd = d; best = { dx, dz }; }
      }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: innerWidth / 2 + best.dx / m * 110, clientY: innerHeight / 2 + best.dz / m * 110, bubbles: true })); }
      requestAnimationFrame(tick);
    };
    const cv = document.querySelector('canvas');
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true }));
    requestAnimationFrame(tick);
  });
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 2400000 });
  const log = await p.evaluate(() => window.__ev);
  await p.close();
  console.log(`\n══ ${wid.toUpperCase()} run ${run + 1} ══`);
  const cards = log.filter(x => x.k === 'CARD');
  const seen = new Set(); let refires = 0; const refireDetail = [];
  for (const c of cards) { if (seen.has(c.form)) { refires++; refireDetail.push(c); } seen.add(c.form); }
  console.log(`  EVOLVE cards: ${cards.length}   distinct forms: ${seen.size}   RE-FIRES: ${refires}`);
  console.log(`  hunter bites: ${log.filter(x => x.k === 'HUNTERBITE').length}   nibbles: ${log.filter(x => x.k === 'nibble').length}`);
  for (const x of log) {
    if (x.k === 'CARD') console.log(`   ${String(x.t).padStart(7)}s  CARD  EVOLVED — ${x.form}${refireDetail.includes(x) ? '   <<< RE-FIRE' : ''}  r=${x.r}`);
    else if (x.k === 'HUNTERBITE') console.log(`   ${String(x.t).padStart(7)}s  ==== HUNTER BITE ====  r ${x.was} -> ${x.r}  score=${x.score}`);
    else if (x.k === 'nibble') console.log(`   ${String(x.t).padStart(7)}s  nibble                 r=${x.r}`);
    else console.log(`   ${String(x.t).padStart(7)}s  hud   ${x.form}  r=${x.r}`);
  }
  // gap between a card and the card that overwrote it
  for (let i = 1; i < cards.length; i++) {
    const gap = cards[i].t - cards[i - 1].t;
    if (gap < 2.4) console.log(`  !! "${cards[i - 1].form}" card was on screen ${gap.toFixed(2)}s (holdBanner asks for 2.4) before "${cards[i].form}" replaced it`);
  }
}
await b.close();
