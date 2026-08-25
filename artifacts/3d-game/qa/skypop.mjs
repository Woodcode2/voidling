// IS THE SKY ACTUALLY IN SPACE? — the sky census.
//
//   node qa/skypop.mjs [port] [worlds...]
//   SKY_FALLBACK=1 node qa/skypop.mjs …   # block the painted PNG, measure the canvas sky
//
// The owner: "The background of the space /galaxy - it's like this weird faded
// color. It should pop. It doesn't give me the illusion this is in space."
//
// "Faded" is a feeling, and a feeling cannot be fixed twice in a row without a
// number under it. Four numbers, then, measured off the shipped frame:
//
//   SHARE  how much of the frame is background at all. Reported, never failed
//          on — see the note below. It turned out to be the largest finding.
//   SAT    mean HSV saturation of the sky. A wash is desaturated; space is not.
//   RANGE  P95 minus P5 luminance. The one an intensity slider CANNOT fix:
//          turning the whole sky up moves the mean and leaves the range where
//          it was. A flat fill has a range near zero however bright it is.
//   DARK   share below L 0.06. Space is mostly empty and mostly black; a sky
//          with no true darks is a painted ceiling, not a vacuum.
//
// ── TWO THINGS THIS PROBE LEARNED THE HARD WAY ───────────────────────────
//
// 1. IT CANNOT READ THE FRAME THE OBVIOUS WAY. Calling window.__renderBloom()
//    and reading the canvas in the same task returns the last COMPOSITED
//    frame, not the one just drawn, because the renderer's context attributes
//    carry `preserveDrawingBuffer: false`. Measured, not guessed: max
//    per-pixel change between a black and a white background was 0/765 that
//    way and 484/765 through the game's own rAF. So it goes through rAF, which
//    is what qa/postpipe.mjs has always done.
//
// 2. AT THE PLACES A HARNESS NATURALLY STANDS, THERE IS NO SKY. The first
//    version failed with "0.0% sky" at the spawn and I went looking for a bug
//    in the mask. There is no bug: the camera is pitched 46-65 degrees DOWN and
//    the island is ~550 units across, so at spawn the ground fills the frame
//    entirely. Space is only ever on screen near a coast. That is not a
//    measurement problem, it is the answer to why the sky does not read as
//    space — so the probe now WARPS to the coast to measure, and reports the
//    share at the spawn as a finding in its own right rather than as a failure.
//
//    The only thing it still fails on is a broken readback, which is what
//    `maxMove` distinguishes: near zero means no pixel responded to the
//    background changing at all, and every number below would be fiction.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv.slice(3).length ? process.argv.slice(3)
  : ['maple', 'pirate', 'gameday', 'lantern', 'powder'];
const FALLBACK = process.env.SKY_FALLBACK === '1';

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

console.log(FALLBACK ? '\nCANVAS FALLBACK (the sky a slow connection gets)\n'
  : '\nPAINTED SKY (the sky a fast connection gets)\n');

// ── TWO PASSES, BECAUSE THEY ANSWER DIFFERENT QUESTIONS ──────────────────
// EXPOSURE, at the real spawn size: how much sky does a child actually SEE.
// GRADE, at ?r=10: what does that sky look like when it IS on screen. Grading
// a sky off eleven pixels is how you get a confident number about nothing, so
// the colour work is done on a frame that has sky in it, and the exposure
// number is reported next to it so the grade is never mistaken for the
// experience.
const rows = [];
for (const wid of WORLDS) {
  for (const R of [0, 10]) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  if (FALLBACK) await p.route('**/assets/hf/hf_*.png', (r) => r.abort());
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
  } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}${R ? `&r=${R}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  // ?r=N sets DEBUG_HARNESS (prototype3d.ts:3071), which starts a match without
  // the menu — so PLAY never becomes visible and waiting for it hangs for the
  // full timeout. The graded pass therefore goes straight to the match.
  if (!R) {
    await p.waitForSelector('#btnPlay', { state: 'visible', timeout: 400000 });
    await p.evaluate(() => document.getElementById('btnPlay').click());
    await p.waitForSelector(`#worldRow .wCard[data-world="${wid}"]`, { state: 'visible', timeout: 400000 });
    await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`).click(), wid);
  }
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 10, null, { timeout: 400000 });
  if (!FALLBACK) await p.waitForFunction(() => (window.__scene?.background?.image?.width ?? 0) > 2048,
    null, { timeout: 400000 })
    .catch(() => console.log(`  (${wid}: painted sky never arrived — measuring the canvas fallback)`));

  await p.evaluate((ab) => { window.__SKY_AB = ab; }, R > 0);
  const r = await p.evaluate(async () => {
    const S = window.__scene, T = window.__THREE;
    const cv = window.__renderer.domElement;
    const frame = () => new Promise((res) => requestAnimationFrame(() =>
      requestAnimationFrame(() => requestAnimationFrame(res))));
    const shot = async () => {
      await frame();
      const c = document.createElement('canvas');
      c.width = cv.width; c.height = cv.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(cv, 0, 0);
      return g.getImageData(0, 0, c.width, c.height);
    };
    const d3 = (u, v, i) => Math.abs(u.data[i * 4] - v.data[i * 4])
      + Math.abs(u.data[i * 4 + 1] - v.data[i * 4 + 1])
      + Math.abs(u.data[i * 4 + 2] - v.data[i * 4 + 2]);

    // ── ONE CENSUS ────────────────────────────────────────────────────────
    // Keys the background black, white, black and demands a pixel move BOTH
    // times and come back where it started. Difference keying because the
    // background is TONE MAPPED like everything else and a magenta key does not
    // come back magenta; three keys because going through rAF lets the game
    // advance, and a moving high-contrast edge changes by more than any sane
    // threshold — but motion does not reverse itself on cue, and sky does.
    const census = async () => {
      const keptBg = S.background, keptI = S.backgroundIntensity, keptFog = S.fog;
      S.fog = null;   // fog tints distant ground toward the sky and would leak into the mask
      S.background = new T.Color(0, 0, 0); S.backgroundIntensity = 1;
      const kA = await shot();
      S.background = new T.Color(1, 1, 1); S.backgroundIntensity = 1;
      const kB = await shot();
      S.background = new T.Color(0, 0, 0); S.backgroundIntensity = 1;
      const kC = await shot();
      S.background = keptBg; S.backgroundIntensity = keptI; S.fog = keptFog;
      const real = await shot();

      const n = kA.data.length / 4;
      const mask = new Uint8Array(n);
      let m = 0, moved = 0;
      for (let i = 0; i < n; i++) {
        const ab = d3(kA, kB, i), bc = d3(kB, kC, i), ac = d3(kA, kC, i);
        moved = Math.max(moved, ab);
        if (ab > 200 && bc > 200 && ac < 100) { mask[i] = 1; m++; }
      }
      const lum = [], sat = []; let rs = 0, gs = 0, bs = 0;
      for (let i = 0; i < n; i++) {
        if (!mask[i]) continue;
        const R = real.data[i * 4] / 255, G = real.data[i * 4 + 1] / 255, B = real.data[i * 4 + 2] / 255;
        const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
        lum.push(0.2126 * R + 0.7152 * G + 0.0722 * B);
        sat.push(mx <= 0 ? 0 : (mx - mn) / mx);
        rs += real.data[i * 4]; gs += real.data[i * 4 + 1]; bs += real.data[i * 4 + 2];
      }
      lum.sort((a, x) => a - x);
      const q = (f) => lum[Math.min(lum.length - 1, Math.max(0, Math.round(f * (lum.length - 1))))] ?? 0;
      return {
        share: 100 * m / n, maxMove: moved,
        sat: sat.reduce((a, x) => a + x, 0) / Math.max(1, sat.length),
        p5: q(0.05), p95: q(0.95), range: q(0.95) - q(0.05),
        dark: 100 * lum.filter((x) => x < 0.06).length / Math.max(1, lum.length),
        rgb: m ? [Math.round(rs / m), Math.round(gs / m), Math.round(bs / m)] : [0, 0, 0],
      };
    };

    const atSpawn = await census();

    // ── GO WHERE SPACE IS ─────────────────────────────────────────────────
    // Walk outward from the island centre along +x until the movement
    // predicate itself says we have left the land, then stand a little inside
    // that. It asks __solidAt — the SAME function the hero moves by — rather
    // than carrying its own idea of where the coast is.
    const v0 = window.__voidState();
    let edge = 0;
    for (let x = 0; x < 600; x += 4) { if (!window.__solidAt(x, 0, v0.r)) { edge = x; break; } }
    if (!edge) throw new Error('never left the land walking 600 units — __solidAt has moved');
    window.__warpVoid(edge - 12, 0);
    const atCoast = await census();

    // ── AND THE CAUSAL TEST ───────────────────────────────────────────────
    // Find the additive halo plane by what it IS in the live scene — additive,
    // a plane, lying at y = -3 — rather than by a name that can be renamed.
    let halo = null;
    S.traverse((o) => {
      if (o.isMesh && o.material && o.material.blending === T.AdditiveBlending
        && o.geometry?.type === 'PlaneGeometry' && Math.abs(o.position.y + 3) < 0.01) halo = o;
    });
    let noHalo = null, srgbHalo = null;
    if (halo && window.__SKY_AB) {
      halo.visible = false;
      noHalo = await census();
      halo.visible = true;
      // the proposed fix, tried in the engine BEFORE it is written into source:
      // the halo's CanvasTexture is constructed with no colour space, and
      // three's Texture constructor defaults to NoColorSpace, so its sRGB bytes
      // are handed to the shader as linear and it adds far more light than the
      // rgba() values in island.ts say it should.
      const keptCS = halo.material.map.colorSpace;
      halo.material.map.colorSpace = T.SRGBColorSpace;
      halo.material.map.needsUpdate = true; halo.material.needsUpdate = true;
      srgbHalo = await census();
      halo.material.map.colorSpace = keptCS;
      halo.material.map.needsUpdate = true; halo.material.needsUpdate = true;
    }
    return { atSpawn, atCoast, noHalo, srgbHalo, foundHalo: !!halo, edge };
  });

  if (r.atCoast.maxMove < 50) {
    console.log(`FAIL — ${wid}: no pixel responded to the background changing `
      + `(largest move ${r.atCoast.maxMove}/765). The readback is blank; every number would be fiction.`);
    await b.close(); process.exit(2);
  }
  const line = (lbl, c) => `    ${lbl.padEnd(16)} share ${c.share.toFixed(1).padStart(5)}%  `
    + `rgb(${c.rgb.join(',')})`.padEnd(18) + `  sat ${c.sat.toFixed(3)}  range ${c.range.toFixed(3)}  `
    + `dark ${c.dark.toFixed(0).padStart(3)}%`;
  console.log(`  ${wid}${R ? ` @ r=${R}` : ' @ real spawn size'}  (coast at x=${r.edge})`);
  console.log(line(R ? 'mid-island' : 'at spawn', r.atSpawn));
  console.log(line('at the coast', r.atCoast));
  if (r.noHalo) console.log(line('halo hidden', r.noHalo));
  if (r.srgbHalo) console.log(line('halo as sRGB', r.srgbHalo));
  if (!r.foundHalo) console.log('    (no additive halo plane found at y=-3 — it has moved or gone)');
  rows.push({ wid, R, ...r });
  await p.close();
  }
}
await b.close();

console.log('');
const graded = rows.filter((r) => r.R > 0);
const real = rows.filter((r) => r.R === 0);
const mean = (f, set = graded) => (set.reduce((a, r) => a + f(r), 0) / Math.max(1, set.length));
console.log(`  At the coast, across ${graded.length} world(s) at r=10: sky is ${mean((r) => r.atCoast.share).toFixed(1)}% `
  + `of the frame, sat ${mean((r) => r.atCoast.sat).toFixed(3)}, range ${mean((r) => r.atCoast.range).toFixed(3)}, `
  + `dark ${mean((r) => r.atCoast.dark).toFixed(0)}%.`);
if (graded[0]?.noHalo) console.log(`  With the halo hidden: sat ${mean((r) => r.noHalo.sat).toFixed(3)}, `
  + `range ${mean((r) => r.noHalo.range).toFixed(3)}, dark ${mean((r) => r.noHalo.dark).toFixed(0)}%.`);
if (graded[0]?.srgbHalo) console.log(`  With the halo decoded as sRGB: sat ${mean((r) => r.srgbHalo.sat).toFixed(3)}, `
  + `range ${mean((r) => r.srgbHalo.range).toFixed(3)}, dark ${mean((r) => r.srgbHalo.dark).toFixed(0)}%.`);
console.log(`  AT REAL SPAWN SIZE, sky is ${mean((r) => r.atSpawn.share, real).toFixed(1)}% of the frame at the `
  + `spawn and ${mean((r) => r.atCoast.share, real).toFixed(1)}% standing ON the coast — which is how much of `
  + `any of this a child sees for most of a match.`);
