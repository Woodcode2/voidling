// DOES THIS WORLD'S GROUND CARRY ANY INFORMATION, OR IS IT PAINTED PAPER?
//
// Nothing in qa/ asked this before. qa/ground.mjs drives the void and samples
// wherever it lands, and its own successor qa/_grainab.mjs records that that
// variance is bigger than the effect. qa/groundsurf.mjs measures ROUGHNESS,
// which the same file proves inert on this surface (one flat horizontal plane,
// one sun, no mirror direction at this elevation). qa/normals.mjs classifies
// FORM, not tone. So a world could ship with a ground that resolves to a
// gradient and every gate in the repo would stay green.
//
//   node qa/groundgrain.mjs [port] [worlds]
//   node qa/groundgrain.mjs 4177 powder
//   node qa/groundgrain.mjs 4177 all
//
// ── WHAT IT MEASURES ──────────────────────────────────────────────────────
// One frame per world, at that world's own named fixed landmark spot, rung 0,
// r = 4, camera settled — the same subject and the same lens as
// qa/lookpair.mjs, because the bar below was derived off that pack and a bar
// derived at one framing may not be read at another.
//
// The frame is cut into non-overlapping 16x16 luminance tiles (Rec.709 on the
// sRGB bytes, 0..1) and the statistic is the MEDIAN tile's standard deviation:
// how much local tonal variation the typical square of this picture carries.
// A median is used rather than a mean because one bright window or one dark
// doorway must not stand in for a field of snow.
//
// ── THE FRAME IS A SCREENSHOT, AND THAT IS THE WHOLE POINT ────────────────
// p.screenshot() captures the composited canvas: ACES, the toe, the split
// tone, the chroma push, toneMappingExposure and the sRGB encode all applied.
// A probe that calls renderer.render() into its OWN WebGLRenderTarget does
// not measure that pipeline — three 0.185.1 forces NoToneMapping and
// working-colour-space output for any non-XR render target
// (three.module.js:7549-7559, :7585), which src/prototype3d.ts:1099-1112
// already records and which cost this round an instrument (see the header of
// qa/grounding.mjs). Measured on the same settled Powder frame by the skeptic
// of docs/crews/round-3/powder-form.verdict.md, the two buffers disagree by a
// factor of 103 on any-channel >= 250 and by 0.19 on mean luminance. Never
// read a grading question out of a render target.
//
// ── THE BAR: median tile sd >= 0.0060 ─────────────────────────────────────
// Measured by me, cold, off the five `_look` frames in qa/out/lookpair/ —
// ONE build (src digest 8bdf1a860df35055, stamped beside every frame), five
// worlds, five named spots, 6148 tiles each:
//
//     world     flat%   bottom third   MEDIAN TILE SD   p95/p25
//     maple      13.3        3.5           0.0172        2.29
//     pirate     39.9       44.8           0.0113        2.62
//     gameday    17.8       20.8           0.0360        4.48
//     lantern    18.3       31.6           0.0203        4.53
//     powder     51.3       54.4           0.0036        1.28
//
// (Those are my own numbers off the PNGs, from an instrument I wrote from the
// description without reading the other two. They land on the proposal's table
// and on the skeptic's re-run cell for cell, which is worth more than
// agreement — it means three implementations compute the same thing.)
//
// The obvious bar is "the lowest shipped world", 0.0113. IT IS THE WRONG BAR
// and no ground-grain change reaches it: the strongest weights anyone measured
// — Lantern's own [0.30,0.30,0.34,7] — land Powder at 0.0095 on the canvas,
// and the reason is that the other four frames get most of their tile variance
// from CONTENT: a boardwalk, a canal, eleven truck rows, a town square. Grain
// cannot manufacture a boardwalk and must not be asked to. So the bar is HALF
// the lowest shipped world, 0.0060 — a value the defect fails by roughly 2x
// and the ground itself can actually reach. The rest of the gap to 0.0113 is
// content, and it is a different piece of work.
//
// ── ONE LIMB, NOT TWO, AND WHY — this bar was filed with a false positive ──
// docs/crews/round-3/powder-form.proposal.md §9.1 proposed a second gated
// limb, "flat-tile share <= 30%", and asserted that maple, pirate, gameday and
// lantern all pass it. PIRATE BAY MEASURES 39.9% ON THAT VERY PACK — its own
// §2 table says so, the skeptic re-measured 39.9%, and so did I, above. As
// filed the limb reds a world nobody has claimed is broken, on the same frame
// the bar was derived from. It is also not independent evidence: flat share is
// P(tile sd < 0.004) and the median is the 50th percentile of the same
// distribution, so two limbs off one distribution buy one fact and two chances
// to be wrong. Flat share is PRINTED on every run because it is the statistic
// that describes what the defect LOOKS like, and it is not gated.
//
// ── THE SPOTS ARE READ OUT OF qa/lookpair.mjs, NOT COPIED ─────────────────
// qa/lookpair.mjs:143 declares SPOTS privately and its module body launches a
// browser on import, so it cannot be imported as it stands. Copying the table
// is not an option: _zgrade, _headcover and _distinct are all in
// docs/GOVERNOR.md's retractions for carrying their own copy of what they
// measure. This parses the real declarations — `w3`, `back`, `SPOTS` — out of
// that file at run time and THROWS if any of the three anchors has moved. A
// probe that silently skips what it cannot find is the same bug wearing a hat.
//
// ── LIMITS, STATED RATHER THAN TUNED AROUND ───────────────────────────────
//  · It measures the WHOLE FRAME, so prop density inflates it and a world
//    could pass on props alone. Powder is measured at THE VILLAGE, the
//    highest-density district it has (powder.ts:196, density 1.5), and still
//    fails by 2x, so the confound cannot explain the result — but the stronger
//    version hides every prop (`o.userData.fade !== undefined`, the selector
//    qa/_grainab.mjs already uses) and needs a five-world baseline of its own.
//    Build that version if this bar is ever argued with.
//  · ONE radius, r = 4, and therefore one follow distance (~129 units of the
//    26-340 the follow law spans). The flatness finding was reproduced across
//    the whole range and through the intro by the crew; this probe is not that
//    evidence and does not claim to be.
//  · The eat-ring pool is hidden in the shutter tick. A salmon annulus over a
//    third of the frame is variance the PROBE caused, and it would make a flat
//    world pass.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import { PNG } from 'pngjs';

const PORT = process.argv[2] || '4177';
const ARG = process.argv[3] || 'powder';

// ── THE PINS. Identical to qa/lookpair.mjs's, deliberately: the bar came off
// that pack and a number sampled at another rung or another radius is a number
// about another picture.
const RUNG = 0;
const R = 4;
const SHOOT_T = 10;      // MATCH seconds at the shutter, never wall seconds
const TILE = 16;
const FLAT = 0.004;      // a tile under this sd carries no information
const BAR = 0.0060;      // median tile sd — see the header for the derivation

const OUT = 'qa/out/groundgrain';

// ── A FRAME RECORDS WHAT IT IS A PHOTOGRAPH OF ────────────────────────────
// Same digest as qa/lookpair.mjs and qa/shippedlook.mjs: two runs whose src
// digests are EQUAL are not an A/B, they are one build photographed twice.
const srcDigest = () => {
  const h = createHash('sha256');
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      const q = join(d, e.name);
      if (e.isDirectory()) { walk(q); continue; }
      if (!/\.(ts|tsx)$/.test(e.name)) continue;
      h.update(e.name); h.update(readFileSync(q));
    }
  };
  walk('src');
  return h.digest('hex').slice(0, 16);
};

// ── READ THE SPOTS OFF THE REAL FILE ──────────────────────────────────────
// Three anchors, each asserted. If any of them moves this throws by name
// instead of quietly measuring somewhere else.
const readSpots = () => {
  const path = 'qa/lookpair.mjs';
  const src = readFileSync(path, 'utf8');
  const grab = (re, what) => {
    const m = src.match(re);
    if (!m) throw new Error(`${path} no longer declares ${what} in the form this probe reads `
      + `(anchor: ${re}). Re-derive the read; do NOT copy the table — see the header.`);
    return m[0];
  };
  const w3 = grab(/^const w3 = .*$/m, '`const w3 = …`');
  const back = grab(/^const back = .*$/m, '`const back = …`');
  // the whole object literal, from its declaration to the first `};` at column 0
  const spots = grab(/^const SPOTS = \{[\s\S]*?^\};$/m, '`const SPOTS = { … };`');
  const spotsObj = new Function(`${w3}\n${back}\n${spots}\nreturn SPOTS;`)();
  const n = Object.keys(spotsObj).length;
  if (n < 5) throw new Error(`${path} declares only ${n} fixed spots; this probe expects the five worlds.`);
  return spotsObj;
};

// ── THE VERDICT IS PRINTED EVEN IF THIS FILE THROWS ───────────────────────
// Silence is a FAIL — docs/GOVERNOR.md, "WHAT THE GATE NOW HOLDS".
let verdict = null;
const say = (ok, line) => { verdict = `  VERDICT ${ok ? 'PASS' : 'FAIL'} ${line}`; };
const QUIT = '__groundgrain_verdict_already_set';
const fail = (line) => { say(false, line); throw new Error(QUIT); };
process.on('exit', (code) => {
  if (verdict === null) console.log(`  VERDICT FAIL groundgrain — the probe exited (${code}) without reaching a conclusion`);
  else console.log(verdict);
});

const SPOTS = readSpots();
const WORLDS = ARG === 'all' ? Object.keys(SPOTS) : ARG.split(',');
for (const w of WORLDS) {
  if (!SPOTS[w]) { say(false, `no fixed spot is authored for "${w}" (have: ${Object.keys(SPOTS).join(', ')})`); process.exit(1); }
}
mkdirSync(OUT, { recursive: true });

// ── THE STATISTIC ─────────────────────────────────────────────────────────
const tiles = (png) => {
  const { width: W, height: H, data } = png;
  const lum = new Float64Array(W * H);
  for (let i = 0, p = 0; i < data.length; i += 4, p++)
    lum[p] = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  const sds = [], bot = [];
  for (let y = 0; y + TILE <= H; y += TILE) {
    for (let x = 0; x + TILE <= W; x += TILE) {
      let s = 0, s2 = 0;
      for (let j = 0; j < TILE; j++) for (let i = 0; i < TILE; i++) {
        const v = lum[(y + j) * W + x + i]; s += v; s2 += v * v;
      }
      const n = TILE * TILE, m = s / n;
      const sd = Math.sqrt(Math.max(0, s2 / n - m * m));
      sds.push(sd);
      if (y >= H * 2 / 3) bot.push(sd);
    }
  }
  const srt = [...sds].sort((a, b) => a - b);
  const pct = (f) => srt[Math.floor(f * (srt.length - 1))];
  let clip = 0, sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] >= 250 || data[i + 1] >= 250 || data[i + 2] >= 250) clip++;
    sum += lum[i >> 2];
  }
  return {
    n: sds.length,
    med: pct(0.5), p25: pct(0.25), p90: pct(0.90),
    flat: sds.filter((v) => v < FLAT).length / sds.length * 100,
    bot3: bot.filter((v) => v < FLAT).length / bot.length * 100,
    clip: clip / (W * H) * 100, mean: sum / (W * H), W, H,
  };
};

const DIGEST = srcDigest();
console.log(`  build  src digest ${DIGEST}  ·  bar: median ${TILE}x${TILE} tile sd >= ${BAR.toFixed(4)}`);

const { chromium } = await import('playwright');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [];
try {
  for (const WORLD of WORLDS) {
    const spot = SPOTS[WORLD];
    const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
    // Ten minutes on anything with a clock on it: under a software renderer a
    // single frame can outrun playwright's 30-second default, and the one call
    // qa/lookpair.mjs left on the default was the screenshot, which then timed
    // out on two worlds out of five.
    p.setDefaultTimeout(600000);
    p.setDefaultNavigationTimeout(600000);
    p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
    await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
    await p.addInitScript(() => {
      try {
        localStorage.clear();
        localStorage.setItem('voidPlayed', '1');
        localStorage.setItem('voidTut', '1');
        localStorage.setItem('voidDailyLast', new Date().toDateString());
        // THE COMMA-JOINED SEED. unlocks.ts splits this on commas — written as
        // JSON.stringify([...]) nothing matches, every world but Maple stays
        // locked, and the probe waits forever for a match that cannot start.
        localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
      } catch { }
    });
    // `?w=` only — no debug-harness params, or ATTRACT-DRIVE takes the wheel
    // after four idle seconds and walks him off the spot.
    await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
    await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
      if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
    }));
    await p.evaluate(() => document.getElementById('btnPlay')?.click());
    await p.waitForTimeout(1400);
    await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), WORLD);
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
    // one pointerdown, no move: it satisfies the first-gesture latch without
    // steering, because the stick is only read above joy.mag 0.156.
    await p.evaluate(() => {
      const cv = document.querySelector('canvas');
      cv.dispatchEvent(new PointerEvent('pointerdown', {
        pointerId: 1, clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true }));
    });
    // past the establishing shot — the longest intro in the game is 3.6s, and
    // during it the camera is diving from three hundred units up with shadows
    // off, so a warp lands under a camera that is still travelling
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4.2, null, { timeout: 600000 });
    await p.evaluate(() => {
      const cv = document.querySelector('canvas');
      for (const el of Array.from(document.body.children)) {
        if (el !== cv && !el.contains(cv)) el.style.display = 'none';
      }
    });
    await p.evaluate(({ rung, r }) => { window.__pinQuality(rung); window.__setVoidR(r); }, { rung: RUNG, r: R });

    // ── PRE-FLIGHT: is the spot GROUND? Asked of the game's own predicate,
    // never of a copy of the containment rule.
    const ground = await p.evaluate(({ x, z, r }) => ({
      solid: window.__solidAt(x, z, r), biome: window.__biomeAt(x, z),
    }), { x: spot.x, z: spot.z, r: R });
    if (!ground.solid) {
      fail(`${WORLD} — the fixed spot (${spot.x.toFixed(2)}, ${spot.z.toFixed(2)}) is NOT solid ground for a `
        + `radius-${R} void (biome=${ground.biome}). The world moved under this probe; re-derive the spot, do not shoot.`);
    }

    // ── THE WARP AND THE SETTLE ─────────────────────────────────────────
    // Every wait is on the MATCH clock, and the sample loop waits between
    // reads so that FRAMES actually advance: a settle built out of back-to-
    // back p.evaluate round-trips converges on state nothing has simulated —
    // two hundred round-trips fit between two rAF callbacks under swiftshader.
    const POS_TOL = 0.35, CAM_TOL = 0.05, R_TOL = R * 0.005;
    const DEADLINE = Date.now() + 25 * 60 * 1000;
    const step = ({ x, z, R, posTol, rTol }) => {
      const vs = window.__voidState(), ms = window.__matchState();
      const off = Math.hypot(vs.x - x, vs.z - z);
      let warped = false;
      if (off > posTol) { window.__warpVoid(x, z); warped = true; }
      if (Math.abs(vs.r - R) > rTol) window.__setVoidR(R);
      return { x: vs.x, z: vs.z, r: vs.r, cam: ms.camDist, t: ms.t, off, warped };
    };
    const arg = { x: spot.x, z: spot.z, R, posTol: POS_TOL, rTol: R_TOL };
    await p.evaluate(({ x, z }) => {
      window.__warpVoid(x, z);
      // Pin the face at the TOP of the settle: a hero parked on a spot is by
      // definition eight seconds of no input, which is the one mood a parked
      // hero can reach, and the Zzz billboard takes its own time to fade.
      window.__setMood?.('cruise');
      window.__pinMouth?.(true);
    }, { x: spot.x, z: spot.z });
    let st = null, prev = null, still = 0, iters = 0, warps = 1;
    for (;;) {
      if (Date.now() > DEADLINE) {
        fail(`${WORLD} — the spot never settled inside 25 minutes over ${iters} samples `
          + `(last: t=${st ? st.t.toFixed(2) : '?'} off ${st ? st.off.toFixed(3) : '?'}u, camDist `
          + `${st ? st.cam.toFixed(1) : '?'}, still ${still}/6). Nothing shot.`);
      }
      prev = st;
      st = await p.evaluate(step, arg);
      iters++;
      if (st.warped) warps++;
      const dpos = prev ? Math.hypot(st.x - prev.x, st.z - prev.z) : Infinity;
      const dcam = prev ? Math.abs(st.cam - prev.cam) : Infinity;
      if (st.warped) still = 0;
      else if (dpos < 0.02 && dcam < CAM_TOL) still++;
      else still = 0;
      if (iters % 10 === 1) {
        console.log(`  settle ${WORLD} t=${st.t.toFixed(2)} off=${st.off.toFixed(3)} `
          + `camDist=${st.cam.toFixed(1)} r=${st.r.toFixed(3)} still=${still}/6 warps=${warps}`);
      }
      if (still >= 6 && st.t >= SHOOT_T) break;
      await p.waitForFunction((t) => (window.__matchState?.().t ?? 0) > t, st.t + 0.15, { timeout: 600000 });
    }
    await p.waitForFunction((t) => (window.__matchState?.().t ?? 0) >= t, SHOOT_T + 0.4, { timeout: 600000 });

    // ── THE LAST PINS AND THE READING IN ONE TICK ───────────────────────
    const fin = await p.evaluate(({ x, z, r }) => {
      const THREE = window.__THREE, cam = window.__cam;
      const drift = window.__voidState().r;
      window.__setVoidR(r);
      window.__setMood?.('cruise');
      window.__pinMouth?.(true);
      window.__calm?.();
      // THE EAT RINGS. fx.ts adds RING_POOL = 12 additive RingGeometry meshes
      // as DIRECT children of the scene, and a hero parked in a dense district
      // eats — so a salmon annulus four to six void-radii across can sit over a
      // third of the frame at the shutter. That is variance this probe caused,
      // and on a flatness measurement it is variance in the direction that
      // hides the defect. Matched on all of geometry type, inner radius and
      // additive blending; a miss is a FAIL, never a silent skip.
      let rings = 0;
      for (const o of window.__scene.children) {
        if (!o.isMesh || o.geometry?.type !== 'RingGeometry') continue;
        if (o.geometry.parameters?.innerRadius !== 0.86) continue;
        if (o.material?.blending !== THREE.AdditiveBlending) continue;
        o.visible = false; rings++;
      }
      const vs = window.__voidState(), ms = window.__matchState();
      const wp = new THREE.Vector3(vs.x, vs.r, vs.z);
      const camD = Math.max(1, cam.position.distanceTo(wp));
      const dir = new THREE.Vector3(); cam.getWorldDirection(dir);
      let props = 0;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh.visible) continue;
        const q = e.mesh.position.clone().project(cam);
        if (Math.abs(q.x) > 1 || Math.abs(q.y) > 1 || q.z > 1) continue;
        props++;
      }
      return {
        x: vs.x, z: vs.z, r: vs.r, drift, t: ms.t, camDist: ms.camDist, rings, props,
        q: window.__quality(),
        off: Math.hypot(vs.x - x, vs.z - z), dr: Math.abs(vs.r - r),
        pitch: -Math.asin(Math.max(-1, Math.min(1, dir.y))) * 180 / Math.PI,
        pxR: (innerHeight / (2 * camD * Math.tan(cam.fov * Math.PI / 360))) * vs.r,
      };
    }, { x: spot.x, z: spot.z, r: R });
    if (fin.off > POS_TOL || fin.dr > R_TOL || fin.q.pinned !== RUNG) {
      fail(`${WORLD} — the pins did not hold at the shutter: wanted (${spot.x.toFixed(2)}, ${spot.z.toFixed(2)}) `
        + `r${R} rung${RUNG}, got (${fin.x.toFixed(2)}, ${fin.z.toFixed(2)}) r${fin.r.toFixed(3)} rung${fin.q.pinned}. Nothing shot.`);
    }
    if (fin.rings !== 12) {
      fail(`${WORLD} — expected fx.ts's 12-ring pool as direct children of the scene and found ${fin.rings}. `
        + `The pool has changed shape; re-derive the match in this file before trusting another frame. Nothing shot.`);
    }
    if (Math.abs(fin.drift - R) > R * 0.03) {
      fail(`${WORLD} — the hero reached r${fin.drift.toFixed(3)} before the shutter reset him to ${R}, so camDist `
        + `(${fin.camDist.toFixed(1)}) is still framed for a bigger void. Nothing shot.`);
    }

    const path = `${OUT}/${WORLD}.png`;
    await p.screenshot({ path, timeout: 600000 });
    const bytes = readFileSync(path);
    writeFileSync(`${OUT}/${WORLD}.src`, DIGEST + ' ' + createHash('sha256').update(bytes).digest('hex').slice(0, 16));
    const png = PNG.sync.read(bytes);
    const s = tiles(png);
    // A frame that is a flat FILL is not a photograph of a world — it is the
    // wrong render path (GOVERNOR retraction 8), and it would score 0.0000
    // here and look like the worst possible result rather than like a broken
    // probe. Separate the two before reading the bar.
    if (s.p90 < 0.0005) {
      fail(`${WORLD} — the frame carries no variation anywhere (p90 tile sd ${s.p90.toFixed(5)}). `
        + `Something rendered and it was not the world. ${path} kept for inspection.`);
    }
    rows.push({ WORLD, spot, ground, fin, s, path });
    console.log(`  shot   ${WORLD} — ${spot.name}`);
    console.log(`         landed (${fin.x.toFixed(2)}, ${fin.z.toFixed(2)}) Δ${fin.off.toFixed(3)}u  biome=${ground.biome}  `
      + `t=${fin.t.toFixed(2)}  r=${fin.r.toFixed(3)}  camDist=${fin.camDist.toFixed(1)}  pitch=${fin.pitch.toFixed(2)}°  `
      + `rung=${fin.q.pinned}  props=${fin.props}`);
    console.log(`         ${png.width}x${png.height}  ${s.n} tiles  medSd ${s.med.toFixed(4)}  p25 ${s.p25.toFixed(4)}  `
      + `p90 ${s.p90.toFixed(4)}  flat ${s.flat.toFixed(1)}%  bottom-third flat ${s.bot3.toFixed(1)}%  `
      + `meanL ${s.mean.toFixed(4)}  >=250 ${s.clip.toFixed(4)}%  -> ${path}`);
    await p.close();
  }
} finally {
  await b.close();
}

if (!rows.length) { say(false, 'nothing was shot'); process.exit(1); }
console.log('\n══ GROUND GRAIN — median 16x16 tile sd, whole frame, canvas pipeline');
console.log('  world     medSd    vs bar   flat%   bot3%   camDist   props');
for (const r of rows) {
  console.log(`  ${r.WORLD.padEnd(8)} ${r.s.med.toFixed(4)}  ${(r.s.med / BAR).toFixed(2).padStart(6)}x  `
    + `${r.s.flat.toFixed(1).padStart(5)}   ${r.s.bot3.toFixed(1).padStart(5)}   ${r.fin.camDist.toFixed(1).padStart(6)}   ${String(r.fin.props).padStart(5)}`);
}
console.log('\n  medSd     the MEDIAN 16x16 tile\'s luminance sd. The bar is 0.0060 — half the');
console.log('            lowest world on the qa/out/lookpair pack (pirate, 0.0113). See the header.');
console.log('  flat%     share of tiles under sd 0.004. DESCRIPTIVE, NOT GATED: pirate reads 39.9%');
console.log('            on that same pack and is not broken. It says what the defect looks like.');
const bad = rows.filter((r) => r.s.med < BAR);
say(!bad.length, bad.length
  ? `${bad.map((r) => `${r.WORLD} ${r.s.med.toFixed(4)}`).join(', ')} — below the ${BAR.toFixed(4)} bar `
    + `(${bad.map((r) => (BAR / r.s.med).toFixed(1) + 'x').join(', ')} short). This ground resolves to a gradient at the play camera.`
  : `${rows.map((r) => `${r.WORLD} ${r.s.med.toFixed(4)}`).join(', ')} — every world's median tile clears ${BAR.toFixed(4)}.`);
process.exit(bad.length ? 1 : 0);
