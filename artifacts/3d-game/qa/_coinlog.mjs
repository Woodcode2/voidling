// SCRATCH — WHERE THE COINS COME FROM. Every write to `voidCoins` is stamped
// with the match clock, so the wallet's income can be split into
//   in-match  (gilded finds + coin piles + quest completions)
//   end-of-match (placement + score curve + first-win bonus)
// which the design treats as the whole economy and which measurement says is
// the minority of it.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    const set = Storage.prototype.setItem;
    window.__coinLog = [];
    Storage.prototype.setItem = function (k, v) {
      if (k === 'voidCoins') {
        const t = window.__matchState ? (window.__matchState()?.t ?? -1) : -1;
        window.__coinLog.push({ t: +Number(t).toFixed(1), v: Number(v) });
      }
      return set.call(this, k, v);
    };
  } catch {} });
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => {}; });

  // census of coin-bearing props at match start
  const census = await p.evaluate(() => {
    let gild = 0, gildVal = 0, pile = 0, pileVal = 0;
    for (const e of window.__edibles) {
      const c = e.mesh?.userData?.coin;
      if (!c) continue;
      if (e.mesh.userData.gild) { gild++; gildVal += c; } else { pile++; pileVal += c; }
    }
    return { gild, gildVal, pile, pileVal, total: window.__edibles.length };
  });

  await p.evaluate(() => {
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => {
      const vs = window.__voidState(); let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
      }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 900000 });
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => ({
    log: window.__coinLog, score: Math.round(window.__matchState().score),
    quests: JSON.parse(localStorage.getItem('voidQuestState') || '{}'),
  }));
  const log = r.log;
  let prev = 0, inMatch = 0, atEnd = 0, nIn = 0, sizes = {};
  for (const e of log) {
    const d = e.v - prev; prev = e.v;
    if (d <= 0) continue;
    if (e.t >= 0 && e.t < 179.5) { inMatch += d; nIn++; sizes[d] = (sizes[d] || 0) + 1; }
    else atEnd += d;
  }
  const qDone = Object.values(r.quests).filter(q => q.d).length;
  const sc = Math.floor(60 * Math.log10(1 + r.score / 500) / Math.log10(7));
  console.log(`\n══ ${wid.toUpperCase()}  score ${r.score}  total wallet ${prev}✦`);
  console.log(`   census at t=0: ${census.gild} gilded (${census.gildVal}✦) + ${census.pile} coin piles (${census.pileVal}✦) = ${census.gildVal + census.pileVal}✦ on the ground, of ${census.total} props`);
  console.log(`   IN-MATCH  ${String(inMatch).padStart(5)}✦  over ${nIn} pickups   (${(inMatch / (inMatch + atEnd) * 100).toFixed(0)}% of the match's income)`);
  console.log(`   AT WHISTLE ${String(atEnd).padStart(4)}✦   = place bonus + min(300, ${sc}) score curve + bonuses   quests ${qDone}/3`);
  console.log(`   pickup sizes: ${Object.entries(sizes).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`${k}✦×${v}`).join('  ')}`);
  await p.close();
}
await b.close();
