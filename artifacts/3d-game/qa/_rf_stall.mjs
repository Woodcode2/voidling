// REFUTE — is the greedy-nearest bot STUCK on PIRATE, or is the world thin?
// The bot has no pathfinding: it steers at the nearest swallowable prop even if
// the straight line crosses water. PIRATE's spawn is DANCE COVE — a cove. Log
// the void's track and how much of the opening it spends going nowhere.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,pirate').split(',');
const RUNS = Number(process.argv[3] || 3);
const UNTIL = Number(process.argv[4] || 45);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
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
    window.__rs = { trk: [], done: false, water: 0, n: 0 };
    const sp = window.__spawn();
    let px = null, pz = null, pt = null;
    const iv = setInterval(() => {
      const ms = window.__matchState(); const vs = window.__voidState();
      // is the STRAIGHT LINE to the bot's current target blocked by water?
      let best = null, bd = 1e9;
      for (const e of window.__edibles) { if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z; const d = dx*dx + dz*dz;
        if (d < bd) { bd = d; best = e.mesh.position; } }
      let blocked = 0;
      if (best) { const N = 12; for (let i = 1; i <= N; i++) {
        const x = vs.x + (best.x - vs.x) * i / N, z = vs.z + (best.z - vs.z) * i / N;
        if (!window.__biomeAt(x, z)) { blocked = 1; break; } } }
      window.__rs.n++; window.__rs.water += blocked;
      const spd = (px === null) ? 0 : Math.hypot(vs.x - px, vs.z - pz) / Math.max(1e-3, ms.t - pt);
      px = vs.x; pz = vs.z; pt = ms.t;
      window.__rs.trk.push({ t: +ms.t.toFixed(1), x: +vs.x.toFixed(1), z: +vs.z.toFixed(1),
        spd: +spd.toFixed(2), fromSpawn: +Math.hypot(vs.x - sp.x, vs.z - sp.z).toFixed(1),
        tgt: Math.round(Math.sqrt(bd)), blocked, score: Math.round(ms.score), r: +ms.r.toFixed(3) });
      if (ms.t >= UNTIL) { window.__rs.done = true; clearInterval(iv); }
    }, 250);
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
  await p.waitForFunction(() => window.__rs?.done, null, { timeout: 1200000 });
  const d = await p.evaluate(() => window.__rs);
  await p.close();
  const t = d.trk;
  let path = 0; for (let i = 1; i < t.length; i++) path += Math.hypot(t[i].x - t[i-1].x, t[i].z - t[i-1].z);
  const slow = t.filter(s => s.t > 2 && s.spd < 3).length, tot = t.filter(s => s.t > 2).length;
  const far = Math.max(...t.map(s => s.fromSpawn));
  console.log(`${wid.padEnd(7)} run${run}  path=${path.toFixed(0)}u (ideal ~${(45*16).toFixed(0)})  ` +
    `stalled(<3u/s) ${(slow/tot*100).toFixed(0)}%  maxFromSpawn=${far.toFixed(0)}u  ` +
    `target-across-water ${(d.water/d.n*100).toFixed(0)}% of samples  score@45=${t.at(-1).score} r@45=${t.at(-1).r}`);
}
await b.close();
