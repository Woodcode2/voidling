// REFUTE — the opening minute, measured PROPERLY.
// The rhythm probe's `eats` was a delta on the count of VISIBLE un-eaten props,
// which drops when a RIVAL eats too — so "first-20s eats" was the whole family's
// appetite, not the child's. userData.byPlayer is the real thing.
// Runs to t=45 only, then closes: no need to burn a 180s software-rendered match.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
const RUNS = Number(process.argv[3] || 3);
const UNTIL = Number(process.argv[4] || 45);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [];
for (const wid of WORLDS) for (let run = 0; run < RUNS; run++) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
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
  await p.evaluate((UNTIL) => {
    window.__rf = { s: [], done: false, evo: {} };
    const FORM_MIN = [0, 1.6, 2.5, 3.6, 5.5, 8.0];
    const iv = setInterval(() => {
      const ms = window.__matchState(); const vs = window.__voidState();
      let mine = 0, rival = 0;
      for (const e of window.__edibles) {
        const u = e.mesh?.userData; if (!u) continue;
        if (e.eaten || !e.mesh.visible) { if (u.byPlayer) mine++; else rival++; }
      }
      const scores = ms.rivals.filter(r => r.joined).map(r => r.score);
      const rank = 1 + scores.filter(s => s > ms.score).length;
      for (let i = 1; i < FORM_MIN.length; i++)
        if (ms.r >= FORM_MIN[i] && window.__rf.evo['f'+i] === undefined) window.__rf.evo['f'+i] = +ms.t.toFixed(1);
      window.__rf.s.push({ t: +ms.t.toFixed(1), r: +ms.r.toFixed(3), score: Math.round(ms.score),
        mine, rival, rank, bites: ms.ev.bites, hbites: ms.ev.hunterBites, stolen: Math.round(ms.ev.stolen),
        hunt: ms.rivals.filter(r => r.hunt).map(r => r.name).join('|'),
        joined: ms.rivals.filter(r => r.joined).length });
      if (ms.t >= UNTIL) { window.__rf.done = true; clearInterval(iv); }
    }, 250);
    // greedy-nearest drive, same baseline as the rhythm probe
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => { const vs = window.__voidState(); let best = null, bd = 1e9;
      for (const e of window.__edibles) { if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z; const d = dx*dx + dz*dz;
        if (d < bd) { bd = d; best = { dx, dz }; } }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + best.dx/m*110, clientY: cy + best.dz/m*110, bubbles: true })); }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, UNTIL);
  await p.waitForFunction(() => window.__rf?.done, null, { timeout: 1200000 });
  const d = await p.evaluate(() => window.__rf);
  await p.close();
  const at = t => d.s.reduce((a,c) => Math.abs(c.t-t) < Math.abs(a.t-t) ? c : a, d.s[0]);
  rows.push({ wid, run, d, at });
  const a20 = at(20), a30 = at(30), a45 = at(45);
  console.log(`${wid.padEnd(8)} run${run}  MINE@20=${String(a20.mine).padStart(4)}  fam@20=${String(a20.rival).padStart(4)}` +
    `  r@20=${a20.r}  score@20=${String(a20.score).padStart(4)}  rank@20=#${a20.rank}` +
    `  | MINE@45=${String(a45.mine).padStart(4)} r@45=${a45.r} score@45=${String(a45.score).padStart(4)} rank@45=#${a45.rank}` +
    `  | evo2@${d.evo.f2 ?? '-'}s evo3@${d.evo.f3 ?? '-'}s  bites=${a45.bites}(h${a45.hbites}) stolen=${a45.stolen}`);
  // did score ever go backwards?
  let dn = 0, dnMax = 0;
  for (let i = 1; i < d.s.length; i++) { const g = d.s[i].score - d.s[i-1].score; if (g < 0) { dn++; dnMax = Math.min(dnMax, g); } }
  const ranks = d.s.filter(s => s.rank > 1);
  console.log(`         score dipped ${dn}x (worst ${dnMax})   non-#1 samples: ${ranks.length}/${d.s.length}` +
    (ranks.length ? `  first at t=${ranks[0].t}s rank #${ranks[0].rank}, last at t=${ranks.at(-1).t}s` : ''));
}
console.log('\n── SUMMARY: the child\'s OWN eats ──');
for (const wid of WORLDS) {
  const rs = rows.filter(r => r.wid === wid);
  const m20 = rs.map(r => r.at(20).mine), m45 = rs.map(r => r.at(45).mine);
  const e2 = rs.map(r => r.d.evo.f2 ?? 99);
  const mean = a => (a.reduce((x,y)=>x+y,0)/a.length).toFixed(1);
  console.log(`${wid.padEnd(8)} mine@20 ${JSON.stringify(m20)} mean ${mean(m20)}` +
    `   mine@45 ${JSON.stringify(m45)} mean ${mean(m45)}   evo2 ${JSON.stringify(e2)} mean ${mean(e2)}s`);
}
await b.close();
