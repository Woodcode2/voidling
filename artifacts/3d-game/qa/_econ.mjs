// SCRATCH PROBE — THE COIN ECONOMY, MEASURED.
//
// How many coins does one match actually pay, and therefore how many matches
// does a child play to afford each shop card? Everything in the shop is priced
// in a currency nobody had ever counted.
//
// Two drivers, because "coins per match" is meaningless without knowing whose
// match: EXPERT re-targets the nearest edible every frame (what pace.mjs does,
// and roughly what a good 11-year-old does), CHILD re-targets every ~1.2 match
// seconds, aims with 35 degrees of error, and stalls for a beat one time in
// six — which is what a six-year-old's thumb looks like.
//
//   node qa/_econ.mjs [worlds] [driver]
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const DRIVER = process.argv[3] || 'both';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const out = [];
for (const wid of WORLDS) {
  for (const drv of (DRIVER === 'both' ? ['expert', 'child'] : [DRIVER])) {
    const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
    await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
    await p.addInitScript(() => { try {
      localStorage.clear();
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
    await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
    await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
      if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
    const coins0 = await p.evaluate(() => Number(localStorage.getItem('voidCoins') || 0));
    await p.click('#btnPlay'); await p.waitForTimeout(1400);
    await p.click(`#worldRow .wCard[data-world="${wid}"]`);
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
    await p.evaluate(() => { window.__renderer.render = () => {}; });

    await p.evaluate((drv) => {
      window.__gold = 0;
      const cv = document.querySelector('canvas');
      const cx = innerWidth / 2, cy = innerHeight / 2;
      cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
      let heldT = -1, held = null, stall = 0;
      const tick = () => {
        const ms = window.__matchState?.(); if (!ms) { requestAnimationFrame(tick); return; }
        const vs = window.__voidState();
        // count gilded (coin-bearing) props that vanished — the discovery payout
        let gild = 0;
        for (const e of window.__edibles) if (!e.eaten && e.mesh?.userData?.coin) gild++;
        window.__gildNow = gild;
        // ── THE CHILD DRIVER HAS TO ACTUALLY BE WORSE ────────────────────
        // It was: retarget every 1.2s, a 17% stall and ±35 degrees of aim
        // error. Against a target-rich map that is barely a handicap — the
        // first trustworthy run of this probe had 'child' scoring 150,829 and
        // placing 1st of 6, eating 1,332 things. That is not a seven-year-old,
        // it is a slightly tipsy expert, and pricing a coin economy against it
        // would price it for nobody.
        //
        // A child holds a heading for a couple of seconds, stops a lot, aims
        // roughly, and — the big one — chases whatever is SHINY rather than
        // whatever is nearest, including things too big to eat.
        const gap = drv === 'expert' ? 0 : 2.4;
        if (ms.t - heldT > gap) {
          heldT = ms.t;
          const cand = [];
          let best = null, bd = 1e9;
          for (const e of window.__edibles) {
            if (e.eaten || !e.mesh?.visible) continue;
            const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
            const d = dx * dx + dz * dz;
            if (e.radius <= vs.r * 0.92) { if (d < bd) { bd = d; best = { dx, dz }; } }
            // a child does not check whether it fits before setting off
            if (drv === 'child' && d < 90000) cand.push({ dx, dz });
          }
          held = best;
          if (drv === 'child') {
            stall = Math.random() < 0.34 ? 1 : 0;               // stops, looks around
            if (cand.length && Math.random() < 0.30) {          // goes for the shiny one
              held = cand[(Math.random() * cand.length) | 0];
            }
          }
        }
        if (held && !stall) {
          let a = Math.atan2(held.dz, held.dx);
          if (drv === 'child') a += (Math.random() - 0.5) * 2.1;   // ±60°
          dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
            clientX: cx + Math.cos(a) * 110, clientY: cy + Math.sin(a) * 110, bubbles: true }));
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, drv);

    await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
      null, { timeout: 900000 });
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => {
      const ms = window.__matchState?.() || {};
      const rows = [...document.querySelectorAll('#endList .er')].map(e => ({
        nm: e.querySelector('.nm')?.textContent, sc: e.querySelector('.sc')?.textContent, me: e.classList.contains('me') }));
      const place = rows.findIndex(x => x.me) + 1;
      return {
        coins: Number(localStorage.getItem('voidCoins') || 0),
        xp: Number(localStorage.getItem('voidXP') || 0),
        score: Math.round(ms.score ?? 0), t: Math.round(ms.t ?? 0),
        place, rows: rows.length,
        next: document.getElementById('endNext')?.textContent?.trim().slice(0, 90),
        quests: JSON.parse(localStorage.getItem('voidQuestState') || '{}'),
        head: document.getElementById('endHd')?.textContent,
        eaten: document.querySelectorAll('#endStats .es')[1]?.querySelector('b')?.textContent,
      };
    });
    const qDone = Object.values(r.quests).filter(q => q.d).length;
    out.push({ wid, drv, ...r, coins0, gain: r.coins - coins0, qDone });
    console.log(`${wid.padEnd(8)} ${drv.padEnd(7)} score ${String(r.score).padStart(7)}  place ${r.place}/${r.rows}  ` +
      `COINS +${String(r.coins - coins0).padStart(4)}  xp ${String(r.xp).padStart(4)}  quests ${qDone}/3  eaten ${r.eaten}`);
    console.log(`         next: ${r.next}`);
    await p.close();
  }
}
await b.close();

// ── the grind table ─────────────────────────────────────────────────────────
const PRICES = { toxic: 150, sunset: 300, ocean: 500, candy: 750, honey: 1000 };
const avg = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
for (const drv of [...new Set(out.map(o => o.drv))]) {
  const g = out.filter(o => o.drv === drv).map(o => o.gain);
  const m = avg(g);
  console.log(`\n══ ${drv.toUpperCase()}  mean ${m.toFixed(0)}✦/match  (${g.join(', ')})`);
  let cum = 0;
  for (const [id, pr] of Object.entries(PRICES)) {
    cum += pr;
    console.log(`   ${id.padEnd(8)} ${String(pr).padStart(5)}✦  = ${(pr / m).toFixed(1).padStart(5)} matches (${(pr / m * 3).toFixed(0)} min)   ` +
      `cumulative ${String(cum).padStart(5)}✦ = ${(cum / m).toFixed(1)} matches`);
  }
}
