// DECISIVE A/B for the "16-22k node scene graph" finding.
//
// The finding says this is "the one item here that is not a small fix" and
// prescribes a structural pass (merge districts, instance repeated props).
// This probe tests whether a ONE-LINE change recovers most of the cost:
// every placed prop is static until it is eaten, so `mesh.matrixAutoUpdate =
// false` in island.ts place() stops three.js recomposing 16,000 local matrices
// and remultiplying 16,000 world matrices every single frame (Object3D.
// updateMatrix() sets matrixWorldNeedsUpdate = true unconditionally, three.core
// .js:12885, so the "clean matrices are skipped" hedge in the finding is false).
//
// A/B is INTERLEAVED — the host is contended and drifts, so ON and OFF are
// sampled in alternating blocks and compared by median, not across runs.
// Also samples draw calls at every radius the match passes through, to test the
// claim that the node count is "the structural reason the draw-call finding is
// as bad as it is".
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
const PORT = process.env.PORT || 4177;
const WORLDS = (process.argv[2] || 'maple').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const out = {};
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });

  const res = await p.evaluate(async () => {
    const S = window.__scene, R = window.__renderer;
    const raw = window.requestAnimationFrame.bind(window);
    const nextFrame = () => new Promise(r => raw(r));
    // wrap the exact method the renderer calls, once
    const orig = Object.getPrototypeOf(S).updateMatrixWorld;
    let acc = [];
    S.updateMatrixWorld = function (force) {
      const t = performance.now(); orig.call(this, force); acc.push(performance.now() - t);
    };
    let nodes = 0; S.traverse(() => nodes++);

    // the one-line fix, applied to exactly what place() would apply it to:
    // every non-mover edible subtree. Matrices are already correct, so freezing
    // them changes nothing on screen.
    const frozen = [];
    const setAuto = (on) => { for (const o of frozen) { o.matrixAutoUpdate = on;
      if (on) o.matrixWorldNeedsUpdate = true; } };
    S.updateMatrixWorld(true);                       // make every matrixWorld correct first
    for (const e of window.__edibles) {
      if (e.mesh.userData.mover) continue;
      e.mesh.traverse(o => frozen.push(o));
    }

    const block = async (on, k) => {
      setAuto(on);
      await nextFrame(); await nextFrame();          // settle
      acc = [];
      for (let i = 0; i < k; i++) await nextFrame();
      const s = acc.slice().sort((a, x) => a - x);
      return s.length ? s[s.length >> 1] : NaN;      // median of the block
    };
    // interleave 6 blocks of 12 frames each way
    const ON = [], OFF = [];
    for (let r = 0; r < 6; r++) { ON.push(await block(true, 12)); OFF.push(await block(false, 12)); }
    setAuto(true);                                    // restore
    const med = a => { const s = a.slice().sort((x, y) => x - y); return +s[s.length >> 1].toFixed(2); };

    // ── draw calls across the whole size ladder ──
    const ladder = [];
    for (const rr of [0.9, 2.5, 5.0, 8.0, 12.0]) {
      window.__setVoidR(rr);
      for (let i = 0; i < 70; i++) await nextFrame();
      const c = [], t = [];
      for (let i = 0; i < 6; i++) { await nextFrame(); c.push(R.info.render.calls); t.push(R.info.render.triangles); }
      let live = 0; S.traverse(o => { if (o.isMesh || o.isPoints || o.isLine) live++; });
      ladder.push({ r: rr, camY: Math.round(window.__cam.position.y), drawable: live,
        calls: Math.round(c.reduce((a, x) => a + x, 0) / c.length),
        tris: Math.round(t.reduce((a, x) => a + x, 0) / t.length) });
    }
    return { nodes, frozenNodes: frozen.length, edibles: window.__edibles.length,
      ON, OFF, onMed: med(ON), offMed: med(OFF), ladder };
  });

  out[wid] = res;
  console.log(`\n===== ${wid.toUpperCase()} =====`);
  console.log(`scene nodes ${res.nodes}; ${res.edibles} edibles; the one-liner freezes ${res.frozenNodes} of them (${(100 * res.frozenNodes / res.nodes).toFixed(0)}%)`);
  console.log(`per-frame scene.updateMatrixWorld(), interleaved blocks of 12 frames, median of each block:`);
  console.log(`  matrixAutoUpdate ON  (today): ${res.ON.map(x => x.toFixed(1)).join('  ')}   -> median ${res.onMed} ms`);
  console.log(`  matrixAutoUpdate OFF (fix)  : ${res.OFF.map(x => x.toFixed(1)).join('  ')}   -> median ${res.offMed} ms`);
  console.log(`  => the one-line change cuts the per-frame walk by ${(100 * (res.onMed - res.offMed) / res.onMed).toFixed(0)}%`);
  console.log(`draw calls across the size ladder (the node count is claimed to be why these are bad):`);
  console.log(`  radius  camY  drawable-in-scene  DRAW CALLS  triangles`);
  for (const l of res.ladder) console.log(`  ${String(l.r).padStart(5)} ${String(l.camY).padStart(6)} ${String(l.drawable).padStart(17)} ${String(l.calls).padStart(11)} ${String(l.tris).padStart(10)}`);
  await p.close();
}
writeFileSync('qa-out/_refute_ab.json', JSON.stringify(out, null, 1));
await b.close();
