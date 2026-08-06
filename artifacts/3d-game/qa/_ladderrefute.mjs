// REFUTE — is the pScore*0.94 anchor dead code, and would raising the lane fix
// the race? Measures, per match-second: player score, every rival's score, the
// two terms of the Math.min at rivals.ts:571, whether the rival is FULL (at its
// lane) or STARVED (behind its lane with nothing left to graze), and how much
// food is actually inside the leader's 170-unit larder patch.
//
// Driver modes: greedy (perfect autopilot, what the audit used) | child
// (reaction lag + aim error + idle gaps).
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLDS = (process.argv[2] || 'maple,gameday').split(',');
const MODE = process.argv[3] || 'greedy';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const ALL = {};
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:4177/?w=${wid}&fix=${process.env.FIX||0}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => {}; });

  await p.evaluate(() => { window.__FIXMODE = !!(new URLSearchParams(location.search).get('fix')==='1'); });
  await p.evaluate((mode) => {
    const LANE_FINAL = [1.00, 0.68, 0.46, 0.31, 0.20];
    const FIELD_TOP = 16000, FIELD_CURVE = 1.45, FULL_AT = 1.20;
    const EAT_RATIO = 1.11;
    const clamp = (v, a, z) => Math.max(a, Math.min(z, v));
    // exact copy of laneWant, but returning every intermediate
    const terms = (t, matchLen, pScore) => {
      const prog = clamp(t / Math.max(1, matchLen), 0, 1);
      const shape = Math.pow(prog, FIELD_CURVE);
      const par = Math.max(200, FIELD_TOP * LANE_FINAL[2] * shape);
      const ratio = Math.max(0, pScore / par);
      const scale = clamp(0.62 + 0.38 * Math.pow(ratio, 0.88), 0.62, 24);
      const ceil = FIELD_TOP * shape * scale;
      const floor = FIELD_TOP * LANE_FINAL[2] * shape;
      const anchor = pScore * 0.94;
      const inner = Math.max(floor, anchor);
      const FIX = !!window.__FIXMODE;
      const top = FIX ? Math.max(floor, pScore * 0.94 * shape) : Math.min(ceil, inner);
      return { shape, par, ratio, scale, ceil, floor, anchor, inner, top,
        binds: FIX ? (pScore * 0.94 * shape > floor ? 'ANCHOR*' : 'FLOOR') : (ceil < inner ? 'CEIL' : (anchor > floor ? 'ANCHOR' : 'FLOOR')),
        scaleSat: scale >= 23.999 };
    };
    window.__L = { s: [], mode };
    const iv = setInterval(() => {
      const ms = window.__matchState?.(); if (!ms) return;
      const vs = window.__voidState();
      const T = terms(ms.t, 180, ms.score);
      const rs = ms.rivals.filter(r => r.joined).map(r => {
        const want = T.top * (LANE_FINAL[r.lane] ?? 0.14);
        // food actually available inside this rival's larder patch right now
        let patch = 0, patchBig = 0, anywhere = 0;
        const minSw = r.r * 0.45, maxSw = r.r * EAT_RATIO;
        for (const e of window.__edibles) {
          if (e.eaten || !e.mesh?.visible) continue;
          if (e.radius > maxSw || e.radius < minSw) continue;
          anywhere++;
          const dx = e.mesh.position.x - r.x, dz = e.mesh.position.z - r.z;
          if (dx * dx + dz * dz <= 170 * 170) { patch++; if (e.radius > r.r * 0.8) patchBig++; }
        }
        return { n: r.name, lane: r.lane, score: r.score, r: +r.r.toFixed(2), full: r.full,
          want: Math.round(want), off: +(want / Math.max(120, r.score)).toFixed(2),
          band: +clamp(want / Math.max(120, r.score), 0.5, 16).toFixed(2),
          patch, anywhere, hunt: r.hunt };
      });
      const scores = rs.map(r => r.score);
      const rank = 1 + scores.filter(s => s > ms.score).length;
      let aliveAll = 0; for (const e of window.__edibles) if (!e.eaten && e.mesh?.visible) aliveAll++;
      window.__L.s.push({ t: +ms.t.toFixed(1), score: Math.round(ms.score), r: +ms.r.toFixed(2),
        rank, graze: ms.graze, aliveAll, T: { ceil: Math.round(T.ceil), anchor: Math.round(T.anchor),
        floor: Math.round(T.floor), top: Math.round(T.top), binds: T.binds, scale: +T.scale.toFixed(2),
        sat: T.scaleSat }, rs });
      if (document.getElementById('end')?.classList.contains('show')) clearInterval(iv);
    }, 200);

    // ── driver ───────────────────────────────────────────────────────────────
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    let aimX = 0, aimZ = 1, nextDecide = 0, idleUntil = 0, frames = 0;
    const tick = () => {
      frames++;
      const vs = window.__voidState();
      if (mode === 'greedy') {
        let best = null, bd = 1e9;
        for (const e of window.__edibles) {
          if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
          const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
          const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
        }
        if (best) { aimX = best.dx; aimZ = best.dz; }
      } else {
        // CHILD: re-decides ~every 0.75s of frames, aims at a prop within a
        // near-ish radius (not the global nearest), misses the heading by up to
        // ~35 degrees, and stops moving entirely for ~1s about every 9s.
        if (frames > idleUntil && frames > nextDecide) {
          nextDecide = frames + 30 + Math.random() * 30;
          const cand = [];
          for (const e of window.__edibles) {
            if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
            const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
            const d2 = dx * dx + dz * dz;
            if (d2 < 260 * 260) cand.push({ dx, dz, d2 });
          }
          if (cand.length) {
            const pick = cand[Math.floor(Math.random() * cand.length)];
            const a = Math.atan2(pick.dz, pick.dx) + (Math.random() - 0.5) * 1.2;
            aimX = Math.cos(a); aimZ = Math.sin(a);
          } else { const a = Math.random() * 6.283; aimX = Math.cos(a); aimZ = Math.sin(a); }
          if (Math.random() < 0.09) idleUntil = frames + 55;
        }
      }
      if (mode === 'child' && frames < idleUntil) {
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
      } else {
        const m = Math.hypot(aimX, aimZ) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + aimX / m * 110, clientY: cy + aimZ / m * 110, bubbles: true }));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, MODE);

  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 1200000 });
  const L = await p.evaluate(() => window.__L);
  ALL[wid] = L;

  // ── report ────────────────────────────────────────────────────────────────
  const S = L.s;
  const at = tt => S.reduce((a, s) => Math.abs(s.t - tt) < Math.abs(a.t - tt) ? s : a, S[0]);
  const last = S[S.length - 1];
  console.log(`\n===== ${wid.toUpperCase()} (${MODE}) =====`);
  console.log('  t   playerScore  rank  binds  scale  ceilTerm  anchorTerm   topLane  leaderScore  ldr/you  ldrFull  ldrPatch  aliveProps');
  for (const tt of [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 179]) {
    const s = at(tt); if (!s) continue;
    const ld = s.rs.reduce((a, r) => (r.score > (a?.score ?? -1) ? r : a), null);
    const l0 = s.rs.find(r => r.lane === 0);
    console.log(`${String(s.t).padStart(5)} ${String(s.score).padStart(11)} ${String('#'+s.rank).padStart(5)} ${String(s.T.binds).padStart(7)} ${String(s.T.scale).padStart(6)} ${String(s.T.ceil).padStart(9)} ${String(s.T.anchor).padStart(11)} ${String(s.T.top).padStart(9)} ${String(ld?.score??0).padStart(12)} ${String(((ld?.score??0)/Math.max(1,s.score)).toFixed(2)).padStart(8)} ${String(l0?.full).padStart(8)} ${String(l0?.patch??-1).padStart(9)} ${String(s.aliveAll).padStart(11)}`);
  }
  const nRank1 = S.filter(s => s.rank === 1).length;
  console.log(`  rank#1 in ${nRank1}/${S.length} samples (${(100*nRank1/S.length).toFixed(0)}%)`);
  console.log(`  FINAL you=${last.score}  leader=${Math.max(...last.rs.map(r=>r.score))}  ratio=${(Math.max(...last.rs.map(r=>r.score))/Math.max(1,last.score)).toFixed(2)}  grazeBites=${last.graze}  propsLeft=${last.aliveAll}`);
  const bindTally = {}; S.forEach(s => bindTally[s.T.binds] = (bindTally[s.T.binds]||0)+1);
  console.log(`  which term binds, over the whole match:`, JSON.stringify(bindTally));
  // lane-0 rival: how much of the match was it behind its lane AND out of food?
  const l0s = S.filter(s => s.rs.some(r => r.lane === 0)).map(s => s.rs.find(r => r.lane === 0));
  const behind = l0s.filter(r => r.score < r.want * 0.98).length;
  const behindNoFood = l0s.filter(r => r.score < r.want * 0.98 && r.patch === 0).length;
  const behindBanded = l0s.filter(r => r.score < r.want * 0.98 && r.band >= 15.9).length;
  console.log(`  lane-0 rival: behind its lane in ${behind}/${l0s.length} samples; of those, ZERO food in patch in ${behindNoFood}; band pegged at 16 in ${behindBanded}`);
  console.log(`  lane-0 rival FULL (at/over lane) in ${l0s.filter(r=>r.full).length}/${l0s.length} samples`);
  await p.close();
}
fs.writeFileSync(process.argv[4] || '/tmp/ladder.json', JSON.stringify(ALL));
await b.close();
