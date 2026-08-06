// REFUTE (instrumented) — reads curStage directly via a TEMP __stages hook and a
// TEMP __biteLog, so the demotion and the card re-fire can be paired exactly.
// NEEDS TWO TEMPORARY HOOKS IN src/prototype3d.ts (added, measured, reverted):
//   _dbg.__stages = () => ({ cur: curStage, ns: stageFor(voidling.radius), r: voidling.radius });
//   …and a push into window.__biteLog inside the `if (hit.hunter)` branch of
//   rivals.onPlayerBitten, recording { t, rBefore, st, down, rAfter, curBefore, curAfter }.
// Without them this probe throws on __stages(). qa/_rf_evorefire.mjs is the
// hook-free version and needs no source change.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'gameday').split(',');
const RUNS = +(process.argv[3] || 1);
const SPEED = +(process.argv[4] || 110);   // pointer offset px: 110 = full tilt
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
  await p.evaluate((SPEED) => {
    const log = []; window.__ev = log;
    const evo = document.getElementById('evolve');
    const gNow = document.querySelector('#growth .gNow');
    const T = () => +(window.__matchState?.().t ?? 0).toFixed(3);
    const S = () => window.__stages();
    new MutationObserver(ms => {
      if (!ms.some(m => m.attributeName === 'class')) return;
      if (evo.classList.contains('show')) {
        const s = S();
        log.push({ k: 'CARD', t: T(), form: (evo.querySelector('.big').textContent || '').trim(),
          r: +s.r.toFixed(3), cur: s.cur, vis: getComputedStyle(evo).opacity });
      }
    }).observe(evo, { attributes: true });
    let lastLbl = null, hb = 0, nb = 0, lastCur = null, nBites = 0;
    const tick = () => {
      const ms = window.__matchState?.();
      if (ms) {
        const s = S();
        const lbl = (gNow?.textContent || '').trim();
        if (lbl && lbl !== lastLbl) { log.push({ k: 'HUD', t: T(), form: lbl, r: +s.r.toFixed(3) }); lastLbl = lbl; }
        if (lastCur !== null && s.cur !== lastCur) log.push({ k: 'CURSTAGE', t: T(), from: lastCur, to: s.cur, r: +s.r.toFixed(3) });
        lastCur = s.cur;
        if (ms.ev.hunterBites > hb) { hb = ms.ev.hunterBites;
          const bl = window.__biteLog || []; const last = bl[bl.length - 1];
          log.push({ k: 'HUNTERBITE', t: T(), score: Math.round(ms.score), bite: last }); nBites++; }
        if (ms.ev.bites - ms.ev.hunterBites > nb) { nb = ms.ev.bites - ms.ev.hunterBites; log.push({ k: 'nibble', t: T() }); }
      }
      const vs = window.__voidState();
      let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z, d = dx * dx + dz * dz;
        if (d < bd) { bd = d; best = { dx, dz }; }
      }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: innerWidth / 2 + best.dx / m * SPEED, clientY: innerHeight / 2 + best.dz / m * SPEED, bubbles: true })); }
      requestAnimationFrame(tick);
    };
    const cv = document.querySelector('canvas');
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true }));
    requestAnimationFrame(tick);
  }, SPEED);
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 2400000 });
  const { log, bites, score } = await p.evaluate(() => ({ log: window.__ev, bites: window.__biteLog || [], score: 0 }));
  await p.close();
  console.log(`\n══ ${wid.toUpperCase()} run ${run + 1} (speed ${SPEED}) ══`);
  const cards = log.filter(x => x.k === 'CARD');
  const seen = new Set(); const refire = new Set();
  for (const c of cards) { if (seen.has(c.form)) refire.add(c); seen.add(c.form); }
  console.log(`  EVOLVE cards ${cards.length}  distinct ${seen.size}  RE-FIRES ${refire.size}  hunter bites ${bites.length}`);
  for (const x of log) {
    if (x.k === 'CARD') console.log(`   ${String(x.t).padStart(8)}s  CARD  "EVOLVED — ${x.form}"  curStage=${x.cur} r=${x.r}${refire.has(x) ? '   <<< RE-FIRE' : ''}`);
    else if (x.k === 'HUNTERBITE') console.log(`   ${String(x.t).padStart(8)}s  ==HUNTER BITE== r ${x.bite?.rBefore?.toFixed(3)} -> ${x.bite?.rAfter?.toFixed(3)}  st=${x.bite?.st} down=${x.bite?.down?.toFixed(3)}  curStage ${x.bite?.curBefore} -> ${x.bite?.curAfter}  score=${x.score}`);
    else if (x.k === 'CURSTAGE') console.log(`   ${String(x.t).padStart(8)}s  curStage ${x.from} -> ${x.to}  r=${x.r}`);
    else if (x.k === 'nibble') console.log(`   ${String(x.t).padStart(8)}s  nibble`);
    else console.log(`   ${String(x.t).padStart(8)}s  hud   ${x.form}  r=${x.r}`);
  }
  for (let i = 1; i < cards.length; i++) {
    const gap = +(cards[i].t - cards[i - 1].t).toFixed(2);
    if (gap < 2.4) console.log(`  !! "${cards[i - 1].form}" card lived ${gap}s (holdBanner 2.4) before "${cards[i].form}" replaced it`);
  }
}
await b.close();
