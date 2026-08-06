// REFUTATION PROBE — what colour does each rival's ground ring actually show,
// and is that colour telling the truth about whether the player can eat it?
// The ONLY ground truth in the sim: player eats rival when pr > rv.r*1.2;
// rival bites player when rv.r > pr*1.2.  Everything else is a claim.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const wid of WORLDS) {
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

  const CASUAL = process.argv[3] === 'casual';
  await p.evaluate((CASUAL) => {
    window.__ring = []; window.__casual = CASUAL;
    // the halos are added straight to the scene as RingGeometry meshes
    const halos = [];
    window.__scene.traverse(o => { if (o.isMesh && o.geometry?.type === 'RingGeometry') halos.push(o); });
    window.__nHalo = halos.length;
    setInterval(() => {
      const ms = window.__matchState?.(); if (!ms) return;
      const pr = ms.r;
      for (const rv of ms.rivals) {
        if (!rv.joined) continue;
        // match halo by world position (halo.position is set to rv.x, rv.z)
        let h = null, bd = 1e9;
        for (const o of halos) { if (!o.visible) continue;
          const d = Math.hypot(o.position.x - rv.x, o.position.z - rv.z);
          if (d < bd) { bd = d; h = o; } }
        if (!h || bd > 0.5) continue;
        // material.color is LINEAR (ColorManagement is on); convert back to
        // sRGB or every comparison against a source hex is nonsense
        const c = h.material.color;
        const s2 = v => { v = Math.max(0, Math.min(1, v));
          return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; };
        const hex = '#' + [c.r, c.g, c.b].map(v =>
          Math.round(s2(v) * 255).toString(16).padStart(2, '0')).join('');
        window.__ring.push({ t: +ms.t.toFixed(1), n: rv.name, r: +rv.r.toFixed(3), pr: +pr.toFixed(3),
          hex, op: +h.material.opacity.toFixed(2), k: +(h.scale.x / rv.r).toFixed(2), hunt: !!rv.hunt });
      }
    }, 120);
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    let hold = null, holdT = 0, idle = 0;
    const tick = () => {
      const vs = window.__voidState(); let best = null, bd = 1e9;
      if (window.__casual) {
        // A SIX-YEAR-OLD IS NOT AN OPTIMAL SOLVER. Re-aim twice a second, sit
        // still a third of the time, and overshoot: this is the player whose
        // size actually stays inside the family's range.
        holdT--; idle--;
        if (idle > 0) { return requestAnimationFrame(tick); }
        if (holdT <= 0) { holdT = 30 + Math.random() * 60; hold = null;
          if (Math.random() < 0.33) idle = 40 + Math.random() * 80; }
      }
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
      }
      if (window.__casual) { if (hold) best = hold; else hold = best; }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, CASUAL);
  await p.evaluate(() => { window.__renderer.render = () => {}; });
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 900000 });
  const { ring, nHalo } = await p.evaluate(() => ({ ring: window.__ring, nHalo: window.__nHalo }));

  // ── classify every sample against the SIM's real rules ────────────────────
  const SEM = { '#54e88a': 'GREEN eat-me', '#ff5560': 'RED run', '#ffcf3a': 'GOLD prize',
                '#ff2b3c': 'RED strobe' };
  const per = {};
  for (const s of ring) {
    const canEat = s.pr > s.r * 1.2;          // player swallows rival — rivals.ts:1155
    const canBite = s.r > s.pr * 1.2;         // rival bites player  — rivals.ts:1190
    const band = canEat ? 'EDIBLE' : canBite ? 'DEADLY' : 'STALEMATE';
    const sem = SEM[s.hex] || 'skin';
    const k = per[s.n] ||= { n: 0, band: {}, hex: {}, cross: {} };
    k.n++; k.band[band] = (k.band[band] || 0) + 1;
    k.hex[s.hex] = (k.hex[s.hex] || 0) + 1;
    const key = band + ' / ' + (sem === 'skin' ? 'skin ' + s.hex : sem);
    const cc = k.cross[key] ||= { n: 0, opLo: 9, opHi: 0, kLo: 9, kHi: 0 };
    cc.n++; cc.opLo = Math.min(cc.opLo, s.op); cc.opHi = Math.max(cc.opHi, s.op);
    cc.kLo = Math.min(cc.kLo, s.k); cc.kHi = Math.max(cc.kHi, s.k);
  }
  // THE ONLY TWO MISCUES THAT COST A CHILD ANYTHING
  const REDS = ['#ff5560', '#ff2b3c'], GOS = ['#54e88a', '#ffcf3a'];
  let dN = 0, dBad = 0, eN = 0, eBad = 0;
  for (const s of ring) {
    if (s.pr > s.r * 1.2) { eN++; if (!GOS.includes(s.hex)) eBad++; }
    else if (s.r > s.pr * 1.2) { dN++; if (!REDS.includes(s.hex)) dBad++; }
  }
  console.log(`\n══ ${wid.toUpperCase()} ══  ${ring.length} ring samples, ${nHalo} halo meshes`);
  console.log(`  DANGER MISSED (rival can bite you, ring not red): ${dBad}/${dN}`
    + `  = ${(dBad / (dN || 1) * 100).toFixed(2)}%`);
  console.log(`  MEAL MISSED  (you can eat rival, ring not green/gold): ${eBad}/${eN}`
    + `  = ${(eBad / (eN || 1) * 100).toFixed(2)}%`);
  for (const [n, k] of Object.entries(per)) {
    console.log(`\n  ${n}  (${k.n} samples)`);
    console.log('    band occupancy: ' + Object.entries(k.band)
      .map(([a, c]) => `${a} ${(c / k.n * 100).toFixed(1)}%`).join('   '));
    console.log('    ring colours:   ' + Object.entries(k.hex).sort((a, b) => b[1] - a[1])
      .map(([a, c]) => `${a} ${(c / k.n * 100).toFixed(1)}%`).join('   '));
    for (const [a, c] of Object.entries(k.cross).sort((x, y) => y[1].n - x[1].n))
      console.log(`      ${(c.n / k.n * 100).toFixed(1).padStart(5)}%  ${a.padEnd(28)}`
        + ` opacity ${c.opLo.toFixed(2)}-${c.opHi.toFixed(2)}  ringK ${c.kLo.toFixed(2)}-${c.kHi.toFixed(2)}`);
  }
  await p.close();
}
await b.close();
