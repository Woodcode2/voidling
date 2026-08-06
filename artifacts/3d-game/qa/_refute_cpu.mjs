// Isolating what a PHONE would actually pay for the scene graph.
//
// SwiftShader rasterises on the host CPU, so anything timed inside a real frame
// is contaminated by rasteriser contention that a real device (separate GPU)
// does not have. Shrinking the drawing buffer to 4x4 makes rasterisation free
// while leaving EVERY CPU-side step of renderer.render() at full cost:
// scene.updateMatrixWorld(), projectObject's frustum test over the whole graph,
// the render-list sort, and one uniform-upload + drawElements per visible item.
// That residue IS the phone's CPU cost for this scene graph.
//
// Three arms, interleaved, medians per block:
//   A  today
//   B  matrixAutoUpdate = false on every static prop  (the "one line in place()")
//   C  B, plus scene.matrixWorldAutoUpdate = false    (skips the walk entirely)
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

  const res = await p.evaluate(async (RAD) => {
    const S = window.__scene, R = window.__renderer, C = window.__cam;
    const raw = window.requestAnimationFrame.bind(window);
    const nextFrame = () => new Promise(r => raw(r));
    let nodes = 0; S.traverse(() => nodes++);
    const orig = Object.getPrototypeOf(S).updateMatrixWorld;
    let mwAcc = [];
    S.updateMatrixWorld = function (f) { const t = performance.now(); orig.call(this, f); mwAcc.push(performance.now() - t); };
    const frozen = [];
    S.updateMatrixWorld(true);
    for (const e of window.__edibles) { if (!e.mesh.userData.mover) e.mesh.traverse(o => frozen.push(o)); }
    const setAuto = on => { for (const o of frozen) { o.matrixAutoUpdate = on; if (on) o.matrixWorldNeedsUpdate = true; } };

    // shrink the drawing buffer: rasterisation becomes free, CPU path unchanged
    const w0 = R.domElement.width, h0 = R.domElement.height, pr0 = R.getPixelRatio();
    R.setPixelRatio(1); R.setSize(4, 4, false);
    await nextFrame(); await nextFrame(); await nextFrame();

    const arm = async (mode, k) => {
      setAuto(mode === 'A');
      S.matrixWorldAutoUpdate = mode !== 'C';
      if (mode === 'C') S.updateMatrixWorld(true);
      await nextFrame(); await nextFrame();
      mwAcc = [];
      const rr = [];
      for (let i = 0; i < k; i++) {
        await nextFrame();
        const t = performance.now(); R.render(S, C); rr.push(performance.now() - t);
      }
      const m = a => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return +s[s.length >> 1].toFixed(2); };
      return { render: m(rr), mw: m(mwAcc) };
    };
    const A = [], B = [], Cc = [];
    for (let i = 0; i < 5; i++) { A.push(await arm('A', 10)); B.push(await arm('B', 10)); Cc.push(await arm('C', 10)); }
    // restore
    setAuto(true); S.matrixWorldAutoUpdate = true;
    R.setPixelRatio(pr0); R.setSize(w0 / pr0, h0 / pr0, false);
    const med = a => { const s = a.slice().sort((x, y) => x - y); return +s[s.length >> 1].toFixed(2); };
    const pack = a => ({ render: med(a.map(x => x.render)), mw: med(a.map(x => x.mw)),
      renders: a.map(x => x.render), mws: a.map(x => x.mw) });
    return { nodes, frozen: frozen.length, calls: R.info.render.calls,
      A: pack(A), B: pack(B), C: pack(Cc), r: window.__voidState().r };
  }, 0);

  out[wid] = res;
  console.log(`\n===== ${wid.toUpperCase()} =====   ${res.nodes} nodes, void r=${res.r.toFixed(1)}, ${res.calls} draw calls`);
  console.log(`CPU-ONLY renderer.render() (4x4 drawing buffer — rasterisation removed, whole CPU path intact):`);
  console.log(`  A today                                    render ${res.A.render} ms   of which updateMatrixWorld ${res.A.mw} ms`);
  console.log(`  B + matrixAutoUpdate=false on ${res.frozen} static nodes   render ${res.B.render} ms   of which updateMatrixWorld ${res.B.mw} ms`);
  console.log(`  C + scene.matrixWorldAutoUpdate=false (walk skipped)  render ${res.C.render} ms   of which updateMatrixWorld ${res.C.mw} ms`);
  console.log(`  block medians A ${res.A.renders.join(' ')} | B ${res.B.renders.join(' ')} | C ${res.C.renders.join(' ')}`);
  console.log(`  => the ENTIRE scene-graph walk is worth ${(res.A.render - res.C.render).toFixed(2)} ms of a 16.7 ms frame (${(100 * (res.A.render - res.C.render) / 16.7).toFixed(0)}% of budget)`);
  await p.close();
}
writeFileSync('qa-out/_refute_cpu.json', JSON.stringify(out, null, 1));
await b.close();
