// THE POST CHAIN'S COLOUR CONTRACT — direct and composed must be THE SAME GAME.
//
//   node qa/postpipe.mjs [world] [port] [--gate]
//
// History (docs/AAA-BRIEF.md §4.1): the composer path shipped a wash — the
// hero lost ~0.20 saturation — because three.js skips tone mapping whenever it
// renders into a target, so RenderPass silently deleted the hand-authored
// ACES + grade and the frame went to screen linear-flat. The workaround was to
// switch post OFF at every rung; the previous OutputPass attempt measured
// WORSE because the bloom threshold (0.94, tuned against tone-mapped sRGB) was
// never re-tuned for the LINEAR buffer OutputPass makes bloom sample.
//
// This probe is the contract that keeps the repair honest, three cells on the
// same live frame, canvas readback (never a probe-owned render target — see
// FABLE-BRIEF on whole-pipeline swaps):
//
//   A  direct render                 — the reference look
//   B  composer, bloom strength 0    — MUST equal A on the hero disc: same
//                                      sat/val within tolerance. If it does
//                                      not, an encode is missing or doubled.
//   C  composer, shipped settings    — the hero must SURVIVE (he must not
//                                      bloom himself: sat within 0.05 of A)
//                                      while the frame's emissives lift
//                                      (p99 luminance up vs A).
//
//   --gate: exit 1 on any failure. Without it, prints the numbers.
import { chromium } from 'playwright';

const WORLD = process.argv[2] || 'lantern';
const PORT = process.argv.find((a, i) => i >= 3 && /^\d+$/.test(a)) || '4177';
const GATE = process.argv.includes('--gate');

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.log('PAGEERR ' + String(e).slice(0, 140)));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000 });
await p.waitForTimeout(2000);

const out = await p.evaluate(() => {
  const ren = window.__renderer, scene = window.__scene, cam = window.__cam;
  const composer = window.__composer();
  // find the bloom pass wherever it sits in the chain
  const bloom = composer.passes.find((x) => 'strength' in x && 'threshold' in x);
  const W = ren.domElement.width, H = ren.domElement.height;

  const read = () => {
    const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
    const g = c2.getContext('2d', { willReadFrequently: true });
    g.drawImage(ren.domElement, 0, 0);
    return g.getImageData(0, 0, W, H).data;
  };
  // the hero's own disc, from the game's state — not a guessed centre
  const v = window.__voidState();
  const proj = new window.__THREE.Vector3(v.x, 0, v.z).project(cam);
  const cx = Math.round((proj.x * 0.5 + 0.5) * W), cy = Math.round((-proj.y * 0.5 + 0.5) * H);
  const discR = Math.max(18, Math.min(90, Math.round(v.r * 14)));
  const stats = (d) => {
    let n = 0, sSum = 0, vSum = 0; const lums = [];
    for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) {
      const k = (y * W + x) * 4, r = d[k] / 255, g2 = d[k + 1] / 255, b2 = d[k + 2] / 255;
      lums.push(0.2126 * r + 0.7152 * g2 + 0.0722 * b2);
    }
    lums.sort((a, b2) => a - b2);
    for (let y = cy - discR; y <= cy + discR; y += 2) for (let x = cx - discR; x <= cx + discR; x += 2) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > discR * discR) continue;
      const k = (y * W + x) * 4, r = d[k] / 255, g2 = d[k + 1] / 255, b2 = d[k + 2] / 255;
      const mx = Math.max(r, g2, b2), mn = Math.min(r, g2, b2);
      // near-black pixels are EXCLUDED from the saturation mean: the disc is
      // mostly the void's pit, and sat=(mx-mn)/mx on a [3,0,9] pixel is 1.0 —
      // one count of readback noise there swings the average more than a real
      // wash on the lit half. Nobody perceives the saturation of black; the
      // metric should not either. (This exclusion was added when the tinted
      // skies shifted the pit's hue balance and pushed noise past the 0.02
      // contract on three worlds while the frame-level diff stayed ≤0.6% —
      // the frame check below is what still guards the historical wash.)
      if (mx >= 0.06) { sSum += mx === 0 ? 0 : (mx - mn) / mx; n++; }
      vSum += mx;
    }
    return { sat: +(sSum / Math.max(1, n)).toFixed(3), val: +(vSum / Math.max(1, n)).toFixed(3),
      p99: +(lums[Math.floor(lums.length * 0.99)]).toFixed(3) };
  };
  // frame-level agreement: mean |ΔRGB| per sampled pixel between two reads.
  // The historical missing-encode wash measured ~30/255 on midtones; MSAA
  // edge noise measures under 2. The gap between those is the contract.
  const frameDiff = (d1, d2) => {
    let sum = 0, n2 = 0;
    for (let k = 0; k < d1.length; k += 12) {
      sum += (Math.abs(d1[k] - d2[k]) + Math.abs(d1[k + 1] - d2[k + 1]) + Math.abs(d1[k + 2] - d2[k + 2])) / 3;
      n2++;
    }
    return +(sum / n2).toFixed(2);
  };

  const saved = { s: bloom ? bloom.strength : 0, t: bloom ? bloom.threshold : 0 };
  ren.setRenderTarget(null); ren.render(scene, cam);
  const dA = read(); const A = stats(dA);
  if (bloom) bloom.strength = 0;
  composer.render();
  const dB = read(); const B = stats(dB);
  const frameAB = frameDiff(dA, dB);
  if (bloom) { bloom.strength = saved.s; bloom.threshold = saved.t; }
  composer.render();
  const dC = read(); const C = stats(dC);
  // the glow's actual contribution: C minus B, mean over the frame. Zero means
  // the pass is decoration; a big number means a bath. This is the budget dial.
  let gSum = 0, gN = 0;
  for (let k = 0; k < dB.length; k += 12) {
    gSum += Math.max(0, (0.2126 * dC[k] + 0.7152 * dC[k + 1] + 0.0722 * dC[k + 2])
                      - (0.2126 * dB[k] + 0.7152 * dB[k + 1] + 0.0722 * dB[k + 2])) / 255;
    gN++;
  }
  ren.render(scene, cam);   // leave the canvas on the direct path
  // the sky contract: whatever texture is on scene.background — the canvas
  // fallback or the loaded painting — must be an equirect DOME, never a
  // screen-locked viewport quad (UVMapping = 300, EquirectangularReflection
  // = 304 in three's enums; ask the live THREE rather than hardcoding).
  const skyMapping = scene.background && scene.background.isTexture
    ? scene.background.mapping : null;
  const skyIsDome = skyMapping === window.__THREE.EquirectangularReflectionMapping
    || (scene.background && scene.background.isCubeTexture);
  // mean sky colour from the top strip of the frame — the per-world identity
  // number the shippedlook gate compares across worlds
  let sr = 0, sg = 0, sb = 0, sn = 0;
  for (let y = 10; y < 80; y += 4) for (let x = 0; x < W; x += 8) {
    const k = (y * W + x) * 4; sr += dB[k]; sg += dB[k + 1]; sb += dB[k + 2]; sn++;
  }
  return { A, B, C, frameAB, glow: +(gSum / gN).toFixed(4), shipped: saved, discR, at: [cx, cy],
    skyIsDome, skyMapping,
    skyMean: [Math.round(sr / sn), Math.round(sg / sn), Math.round(sb / sn)],
    fog: scene.fog ? '#' + scene.fog.color.getHexString() : null,
    passes: composer.passes.map((x) => x.constructor.name) };
});

console.log(`  ${WORLD}  hero disc r=${out.discR}px at ${out.at}  chain: ${out.passes.join(' → ')}`);
console.log(`  A direct           sat=${out.A.sat}  val=${out.A.val}  frame p99 lum=${out.A.p99}`);
console.log(`  B composed, glow 0 sat=${out.B.sat}  val=${out.B.val}  frame p99 lum=${out.B.p99}`);
console.log(`  C composed, glow on sat=${out.C.sat}  val=${out.C.val}  frame p99 lum=${out.C.p99}   (strength=${out.shipped.s} threshold=${out.shipped.t})`);
console.log(`  glow budget (mean C−B luminance): ${out.glow}`);

const fails = [];
const dSat = Math.abs(out.A.sat - out.B.sat), dVal = Math.abs(out.A.val - out.B.val);
console.log(`\n  equivalence  |Δsat|=${dSat.toFixed(3)}  |Δval|=${dVal.toFixed(3)}  frame mean|ΔRGB|=${out.frameAB}/255   (contract: ≤0.02, ≤0.02, ≤4)`);
if (dSat > 0.02 || dVal > 0.02) fails.push(`composed-at-zero is a different game than direct (Δsat ${dSat.toFixed(3)}, Δval ${dVal.toFixed(3)})`);
if (out.frameAB > 4) fails.push(`whole-frame divergence between paths (mean|ΔRGB| ${out.frameAB}/255 — the historical wash measured ~30)`);
const heroLoss = out.A.sat - out.C.sat;
console.log(`  hero survives glow: sat loss ${heroLoss.toFixed(3)}   (contract: ≤0.05 — he must not bloom himself)`);
if (heroLoss > 0.05) fails.push(`the hero blooms himself (sat loss ${heroLoss.toFixed(3)})`);
console.log(`  sky: dome=${out.skyIsDome} (mapping=${out.skyMapping})  mean rgb=[${out.skyMean}]  fog=${out.fog}`);
if (!out.skyIsDome) fails.push('the sky is a screen-locked wallpaper again (background.mapping is not equirect)');

await b.close();
console.log('\n  ' + (fails.length ? 'FAIL — ' + fails.join('; ') : 'PASS — one colour pipeline, whichever path the rung picks') + '\n');
if (GATE) process.exit(fails.length ? 1 : 0);
