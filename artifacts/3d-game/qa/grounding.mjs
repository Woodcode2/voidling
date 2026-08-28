// IS THE HERO STANDING ON THE GROUND, OR FLOATING OVER IT?
//
// The void's body does NOT cast into the shadow map (void3d.ts:605 and :1582).
// Everything grounding him rests on one thing: the contact disc, a soft dark
// circle on the floor at 1.52x his radius. This renders the identical frame
// several times over — disc shown and hidden, shadow map on and off, the hero
// casting and not — and DIFFERENCES them. The difference IS the shadow, with
// no assumption about where it lands, how big it is, or what colour the ground
// under it happens to be.
//
//   node qa/grounding.mjs [port] [world] [radii]
//   node qa/grounding.mjs 4177 powder 1.5,4
//
// ── THREE RETRACTIONS IN THIS FILE'S OWN HEADER ───────────────────────────
// docs/GOVERNOR.md rule 3b: a metric that moved for the wrong reason is
// retracted in writing, in the probe's own header. Three of them, all found in
// round 3 (docs/crews/round-3/powder-form.proposal.md and its verdict):
//
// R1. **EVERY CODE THIS PROBE EVER PRINTED WAS AN UN-GRADED CODE.** It built a
//     `THREE.WebGLRenderTarget` and read that. three 0.185.1 forces
//     `NoToneMapping` and working-colour-space output for any non-XR render
//     target (`three.module.js:7549-7559`, `:7585`), so that buffer has no
//     ACES, no toe, no split tone, no chroma push, NO `toneMappingExposure`
//     and no sRGB encode. src/prototype3d.ts:1099-1112 already says so — "no
//     probe that renders its own frame can see this" — and this probe was one
//     of them. On one settled Powder frame the two buffers disagree by a
//     factor of 103 on any-channel >= 250 and by 0.19 on mean luminance —
//     measured by the skeptic of docs/crews/round-3/powder-form.verdict.md
//     §0, and quoted here as his, not as mine. Every
//     number this file printed before 2026-08-28 is withdrawn. It now renders
//     to `null` and reads the DEFAULT FRAMEBUFFER with `gl.readPixels`, inside
//     the same evaluate, so the codes are the codes a phone shows.
//
// R2. **THE "4.6% ANNULUS" ARGUMENT WAS WRONG BY 2.8x.** This header used to
//     reason from the claim at void3d.ts:2272-2275 that "anything under about
//     1.45x is entirely hidden behind the ball", conclude that the disc shows
//     a ring 4.6% of the hero's radius wide at an alpha of about 0.24, and
//     call that "close to nothing". Re-derived: the group sits at
//     `y = dispR * RADIUS_SINK` (0.9) and the body is a unit sphere scaled by
//     dispR, so a ground point at radius k clears the silhouette when
//     `k*sin(t) > 1 - 0.9*cos(t)` — **k > 0.524 at the 46.4-degree spawn
//     pitch and k > 0.689 at the 65.6-degree steep pitch**, not 1.45. At the
//     shipped 1.52x the disc shows from about rho 0.34 to 1.0 of its own
//     radius: a crescent, not a hairline. The argument was wrong and the
//     conclusion happens to survive, which is the worst way to be right.
//     (void3d.ts:2272-2275 still carries the 1.45x figure and needs correcting
//     in place — no crew has been cleared to edit that file yet.)
//
// R3. **IT WAS HARD-CODED TO MAPLE AND SILENT ABOUT THE RUNG.** The finding
//     this instrument exists for is a Powder finding and the probe had never
//     been pointed at Powder. Worse, it pinned no quality rung: a software
//     renderer walks the ladder down within seconds, and QUALITY[3]
//     (prototype3d.ts) is `shadows: false`. A shadow probe that demotes onto a
//     rung with no shadow map measures zero and reports it as an answer. It
//     pins rung 0 now, prints it, and takes a world argument.
//
// ── AND IT NEVER LET THE CAMERA ARRIVE ────────────────────────────────────
// The old version set the radius and waited 3.4 WALL seconds. The match clock
// under swiftshader runs 14-40x slower than wall, and `camDist` eases toward
// `clamp(38*(R/0.9)^0.82, 26, 340)` by a fraction PER FRAME — so the frames
// were taken with the camera still travelling, at a follow distance the game
// never uses. (The same fault put `qa/out/shippedlook/`'s whole pack at a lens
// three times too close; see §11 of the proposal.) This warps to the world's
// own fixed landmark spot and then settles on the MATCH clock until camDist
// stops moving, exactly as qa/lookpair.mjs does, and prints the camDist and
// pitch it actually shot at.
//
// ── WHAT IT PRINTS ────────────────────────────────────────────────────────
//   disc        the contact disc's darkening: pixels, mean, peak, p50, and the
//               centroid's distance from the hero's centre in his own radii
//   world       the darkening every OTHER caster in the same frame achieves —
//               the shadow term on against off, disc hidden in both. This is
//               the bar, and it is measured in the frame rather than asserted.
//               Turned off through `light.shadow.intensity`, which is a plain
//               UNIFORM; `renderer.shadowMap.enabled` is a program-cache-key
//               define that nothing re-checks mid-frame, so toggling it would
//               have changed no pixels and set the bar to zero.
//   hero-cast   what the hero's own body would put on the ground if it cast:
//               `body.castShadow` flipped on IN THE PAGE for one render and
//               put back. A MEASUREMENT, not a change — nothing on disk moves.
//   reach       max distance of any darkened pixel from his centre, in his own
//               radii. Under 1.00 means the whole shadow is behind him.
//
// ── THE BAR, AND WHERE IT COMES FROM ──────────────────────────────────────
// NOT from the line this file used to carry — "under ~12 is below the
// threshold most phone screens resolve outdoors". That is a number in a
// comment with nothing behind it and rule 3 forbids building on it. The bar is
// **the shadow this world already draws, in the same frame, under the same
// light**: the hero's grounding shadow must reach at least ONE THIRD of the
// median depth of every other cast shadow in the picture.
//
// One third is a floor and it is a judgement, so it is stated as a judgement:
// a soft radial disc cannot reach a cast shadow's median without becoming the
// near-solid core void3d.ts:641-646 already removed once as "a grey circle
// glued around the hero", so demanding parity would demand the known failure.
// A third is where the darkening is at least the same KIND of mark as the one
// the game puts under a snowman. It is a RATIO of a quantity measured in the
// same frame, never a constant in codes, so it moves with the world's light
// instead of describing the world it was written against.
//
// TWO THINGS THE FILING OF THIS BAR GOT WRONG, kept here so nobody re-derives
// them:
//  · The proposal's second limb — "peak >= two thirds of the world's p90" —
//    ALREADY PASSES on the corrected instrument (peak 43.0 against a required
//    35.7 on the skeptic's settled Powder frame). It was only failing in the
//    un-graded buffer. It is printed as `peak/worldP90` and NOT gated; a limb
//    that reds for the buffer it was measured in is not evidence.
//  · The proposal's first limb — "where the hero casts, his p50 within 20% of
//    the world's" — cannot be gated, because THE HERO NEVER CASTS. There is no
//    `CAST_R` in the source and no crew has landed one. `hero-cast` is printed
//    every run as the measurement that keeps that finding alive.
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'powder';
// 1.5 is spawn size and 4 is the size qa/lookpair.mjs and qa/shippedlook.mjs
// photograph, so the numbers here are comparable with that pack. The LARGE
// sizes are where the `CAST_R` question lives (void3d.ts:1570-1580 is about a
// 24-unit sphere) and sweeping them is the job of the crew that lands a size
// gate — pass them on the command line.
const RADII = (process.argv[4] || '1.5,4').split(',').map(Number);
const RUNG = 0;
const SHOOT_T = 10;        // MATCH seconds before the first shutter
const DELTA = 3;           // codes. A darkening under this is not a shadow.
const FLOOR = 1 / 3;       // the bar — see the header
const OUT = 'qa/out/grounding';
mkdirSync(OUT, { recursive: true });

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

// ── THE SPOT IS READ OUT OF qa/lookpair.mjs, NOT COPIED ───────────────────
// That file declares SPOTS privately and boots a browser on import, so it
// cannot be imported as it stands; and copying the table is what put _zgrade,
// _headcover and _distinct in the retractions. This parses the real
// declarations and throws by name if any anchor has moved.
const readSpots = () => {
  const path = 'qa/lookpair.mjs';
  const src = readFileSync(path, 'utf8');
  const grab = (re, what) => {
    const m = src.match(re);
    if (!m) throw new Error(`${path} no longer declares ${what} in the form this probe reads. `
      + `Re-derive the read; do NOT copy the table.`);
    return m[0];
  };
  return new Function(`${grab(/^const w3 = .*$/m, '`const w3 = …`')}\n`
    + `${grab(/^const back = .*$/m, '`const back = …`')}\n`
    + `${grab(/^const SPOTS = \{[\s\S]*?^\};$/m, '`const SPOTS = { … };`')}\nreturn SPOTS;`)();
};

let verdict = null;
const say = (ok, line) => { verdict = `  VERDICT ${ok ? 'PASS' : 'FAIL'} ${line}`; };
const QUIT = '__grounding_verdict_already_set';
const fail = (line) => { say(false, line); throw new Error(QUIT); };
process.on('exit', (code) => {
  if (verdict === null) console.log(`  VERDICT FAIL grounding — the probe exited (${code}) without reaching a conclusion`);
  else console.log(verdict);
});

const SPOTS = readSpots();
const spot = SPOTS[WORLD];
if (!spot) { say(false, `no fixed spot is authored for "${WORLD}" (have: ${Object.keys(SPOTS).join(', ')})`); process.exit(1); }
const DIGEST = srcDigest();
console.log(`  build  src digest ${DIGEST}  ·  world ${WORLD} — ${spot.name}  ·  rung ${RUNG}  ·  bar: hero p50 >= 1/3 of the world's own`);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [];
try {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
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
      // comma-joined, not JSON — unlocks.ts splits on commas, and the JSON
      // form leaves every world but Maple locked and hangs the probe
      localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
    } catch { }
  });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
  }));
  await p.evaluate(() => document.getElementById('btnPlay')?.click());
  await p.waitForTimeout(1400);
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), WORLD);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => {
    const cv = document.querySelector('canvas');
    cv.dispatchEvent(new PointerEvent('pointerdown', {
      pointerId: 1, clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true }));
  });
  // past the establishing shot: while introT runs the camera is diving from
  // three hundred units up and shadows are off outright
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4.2, null, { timeout: 600000 });
  await p.addStyleTag({ content: '#joy,#joyNub{display:none !important}' });
  await p.evaluate((rung) => window.__pinQuality(rung), RUNG);

  const ground = await p.evaluate(({ x, z }) => ({
    solid: window.__solidAt(x, z, 4), biome: window.__biomeAt(x, z),
  }), { x: spot.x, z: spot.z });
  if (!ground.solid) {
    fail(`${WORLD} — the fixed spot (${spot.x.toFixed(2)}, ${spot.z.toFixed(2)}) is NOT solid ground. `
      + `The world moved under this probe; re-derive the spot, do not shoot.`);
  }

  console.log(`     r   camDist  pitch  heroPxR |          the disc: px    mean   peak    p50  centroid  reach`
    + ` |  the world's own: px    mean    p50    p90 |  the hero, if he cast: px   mean    p50  centroid`);
  for (const rr of RADII) {
    // ── SET, THEN SETTLE ON THE MATCH CLOCK ───────────────────────────────
    await p.evaluate(({ x, z, r }) => {
      window.__setVoidR(r); window.__warpVoid(x, z);
      window.__setMood?.('cruise'); window.__pinMouth?.(true); window.__calm?.();
    }, { x: spot.x, z: spot.z, r: rr });
    const step = ({ x, z, r }) => {
      const vs = window.__voidState(), ms = window.__matchState();
      const off = Math.hypot(vs.x - x, vs.z - z);
      let warped = false;
      if (off > 0.35) { window.__warpVoid(x, z); warped = true; }
      if (Math.abs(vs.r - r) > r * 0.005) window.__setVoidR(r);
      return { x: vs.x, z: vs.z, r: vs.r, cam: ms.camDist, t: ms.t, off, warped };
    };
    const arg = { x: spot.x, z: spot.z, r: rr };
    const DEADLINE = Date.now() + 25 * 60 * 1000;
    let st = null, prev = null, still = 0, iters = 0;
    for (;;) {
      if (Date.now() > DEADLINE) {
        fail(`${WORLD} r=${rr} — the camera never settled inside 25 minutes over ${iters} samples `
          + `(camDist ${st ? st.cam.toFixed(1) : '?'}, still ${still}/6). Nothing measured.`);
      }
      prev = st;
      st = await p.evaluate(step, arg);
      iters++;
      const dpos = prev ? Math.hypot(st.x - prev.x, st.z - prev.z) : Infinity;
      const dcam = prev ? Math.abs(st.cam - prev.cam) : Infinity;
      if (st.warped) still = 0;
      else if (dpos < 0.02 && dcam < 0.05) still++;
      else still = 0;
      if (iters % 12 === 1) {
        console.log(`  settle r=${rr} t=${st.t.toFixed(2)} off=${st.off.toFixed(3)} camDist=${st.cam.toFixed(1)} `
          + `r=${st.r.toFixed(3)} still=${still}/6`);
      }
      if (still >= 6 && st.t >= SHOOT_T) break;
      await p.waitForFunction((t) => (window.__matchState?.().t ?? 0) > t, st.t + 0.15, { timeout: 600000 });
    }

    // ── FOUR RENDERS, ONE FRAME, NOTHING STEPPED BETWEEN THEM ─────────────
    const m = await p.evaluate(({ delta }) => {
      const THREE = window.__THREE, ren = window.__renderer, sc = window.__scene, cam = window.__cam;
      const vs = window.__voidState();
      const dpr = ren.getPixelRatio();
      const W = Math.floor(ren.domElement.width), H = Math.floor(ren.domElement.height);
      const gl = ren.getContext();

      // where he is on screen, and how big — PROJECTED, not segmented. A
      // largest-connected-purple-component measurement reads the ball at about
      // 76% of its projected radius and drags a rival's pixels in with it; the
      // proposal's centroid figures were corrected by that factor and the
      // correction went the wrong way. The follow law confirms this number.
      const wp = new THREE.Vector3(vs.x, vs.r, vs.z);
      const sp = wp.clone().project(cam);
      const cx = (sp.x * 0.5 + 0.5) * W, cy = (1 - (sp.y * 0.5 + 0.5)) * H;
      const camD = Math.max(1, cam.position.distanceTo(wp));
      const pxR = (window.innerHeight / (2 * camD * Math.tan(cam.fov * Math.PI / 360))) * vs.r * dpr;
      const dir = new THREE.Vector3(); cam.getWorldDirection(dir);
      const pitch = -Math.asin(Math.max(-1, Math.min(1, dir.y))) * 180 / Math.PI;

      // THE HERO'S BODY, found by its geometry rather than by a name it does
      // not have: void3d.ts builds it as SphereGeometry(1, 96, 72) under the
      // void's own group. A miss is a THROW — silently skipping what you
      // cannot find is the same bug wearing a hat.
      const bodies = [];
      window.__voidGroup().traverse((o) => {
        const g = o.geometry;
        if (o.isMesh && g?.type === 'SphereGeometry'
          && g.parameters?.widthSegments === 96 && g.parameters?.heightSegments === 72) bodies.push(o);
      });
      if (bodies.length !== 1) {
        return { err: `expected exactly one SphereGeometry(1,96,72) body under __voidGroup() and found ${bodies.length}. `
          + `void3d.ts has changed shape; re-derive the match in qa/grounding.mjs.` };
      }
      const body = bodies[0];
      const disc = sc.getObjectByName('contact');
      if (!disc) return { err: 'no object named "contact" in the scene.' };

      // ── RENDER TO null AND READ THE DEFAULT FRAMEBUFFER ────────────────
      // NOT into a WebGLRenderTarget: three forces NoToneMapping and linear
      // output for one of those, so the codes would have no ACES, no toe, no
      // exposure and no sRGB encode (three.module.js:7549-7559, :7585;
      // prototype3d.ts:1099-1112). preserveDrawingBuffer is false, but every
      // render and read here happens inside this ONE evaluate — one task, no
      // compositor swap in between — so the buffer is still there to read.
      //
      // AND shadowMap.needsUpdate ON EVERY RENDER: autoUpdate is false
      // (prototype3d.ts:142) and the frame loop refreshes it every other
      // frame, so a probe that renders outside that loop gets a STALE shadow
      // map and flipping castShadow changes exactly zero pixels — which looks
      // identical to "the flag does nothing".
      const shoot = () => {
        ren.setRenderTarget(null);
        ren.shadowMap.needsUpdate = true;
        ren.render(sc, cam);
        const buf = new Uint8Array(W * H * 4);
        gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        const lum = new Float32Array(W * H);
        for (let i = 0, q = 0; q < lum.length; i += 4, q++)
          lum[q] = 0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2];
        return lum;
      };
      // ── THE SHADOWS ARE TURNED OFF BY A UNIFORM, NOT BY A DEFINE ───────
      // `renderer.shadowMap.enabled` is part of the PROGRAM CACHE KEY and
      // nothing in three's needsProgramChange test watches it, so flipping it
      // mid-frame leaves every already-compiled material rendering its
      // shadows exactly as before — the toggle would change nothing and the
      // world's own shadows would measure ZERO, which is a passing bar for the
      // wrong reason. `light.shadow.intensity` is a plain uniform
      // (`shadowUniforms.shadowIntensity`, and the shader ends
      // `mix(1.0, shadow, shadowIntensity)`), so setting it to 0 removes the
      // shadow term with no recompile at all. The self-check below refuses to
      // report if the toggle moved nothing.
      const shadowLights = [];
      sc.traverse((o) => { if (o.isLight && o.castShadow && o.shadow) shadowLights.push(o); });
      if (!shadowLights.length) return { err: 'no shadow-casting light in the scene.' };
      const wasDisc = disc.visible, wasCast = body.castShadow;
      const wasInt = shadowLights.map((l) => l.shadow.intensity);
      const A = shoot();                                   // as shipped
      disc.visible = false;
      const B = shoot();                                   // no disc
      shadowLights.forEach((l) => { l.shadow.intensity = 0; });
      const C = shoot();                                   // no disc, no shadow term
      shadowLights.forEach((l, i) => { l.shadow.intensity = wasInt[i]; });
      body.castShadow = true;
      const D = shoot();                                   // no disc, hero casting
      body.castShadow = wasCast; disc.visible = wasDisc;
      shadowLights.forEach((l, i) => { l.shadow.intensity = wasInt[i]; });
      ren.shadowMap.needsUpdate = true;

      // THE THREE POPULATIONS ARE DISJOINT BY CONSTRUCTION.
      //   disc  = B - A   the disc darkens the frame it is drawn into
      //   world = C - B   every OTHER caster, with the hero not casting
      //   hero  = B - D   the hero's own body, and nothing else, added
      const pop = (hi, lo) => {
        const vals = [];
        let sum = 0, peak = 0, reach = 0, sx = 0, sy = 0;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const d = hi[i] - lo[i];
            if (d <= delta) continue;
            vals.push(d); sum += d; if (d > peak) peak = d;
            // readPixels is bottom-up; the projection above is top-down
            const yy = H - 1 - y;
            sx += x; sy += yy;
            const q = Math.hypot(x - cx, yy - cy) / Math.max(1, pxR);
            if (q > reach) reach = q;
          }
        }
        vals.sort((a, b) => a - b);
        const q = (f) => (vals.length ? vals[Math.floor(f * (vals.length - 1))] : 0);
        return { n: vals.length, mean: vals.length ? sum / vals.length : 0, peak,
          p50: q(0.5), p75: q(0.75), p90: q(0.9), reach,
          centroid: vals.length ? Math.hypot(sx / vals.length - cx, sy / vals.length - cy) / Math.max(1, pxR) : 0,
          pctFrame: vals.length / (W * H) * 100 };
      };
      return { W, H, pxR, cx, cy, camDist: window.__matchState().camDist, pitch,
        q: window.__quality(), r: vs.r, lights: shadowLights.length,
        disc: pop(B, A), world: pop(C, B), hero: pop(B, D),
        heroArea: Math.PI * pxR * pxR };
    }, { delta: DELTA });
    if (m.err) fail(`${WORLD} r=${rr} — ${m.err}`);
    if (!m.q.shadows) {
      fail(`${WORLD} r=${rr} — the renderer's shadow map is DISABLED at rung ${m.q.pinned} (level ${m.q.level}). `
        + `A shadow probe on a rung with no shadows measures zero and would report it as an answer.`);
    }
    // ── THE INSTRUMENT'S OWN SELF-CHECK ─────────────────────────────────
    // If the shadow toggle moved nothing, the bar is zero and EVERYTHING
    // passes. That is what a broken instrument looks like from the outside,
    // and it is how the first run of this measurement reported "castShadow
    // changes exactly zero pixels". A world where 0.1% of the frame is not in
    // some cast shadow is not a world this probe can set a bar in.
    if (m.world.n / (m.W * m.H) < 0.001) {
      fail(`${WORLD} r=${rr} — turning the shadow term off changed only ${m.world.n} px `
        + `(${(m.world.n / (m.W * m.H) * 100).toFixed(4)}% of the frame) across ${m.lights} shadow-casting light(s). `
        + `Either this spot has no casters in frame or the toggle did not take; the bar cannot be set from it. Nothing reported.`);
    }
    rows.push({ rr, ...m });
    const f = (v, w = 6, d = 1) => v.toFixed(d).padStart(w);
    console.log(`${String(rr).padStart(6)}  ${f(m.camDist, 7)}  ${f(m.pitch, 5)}  ${f(m.pxR, 6, 0)}`
      + ` | ${String(m.disc.n).padStart(20)} ${f(m.disc.mean, 6)} ${f(m.disc.peak, 6)} ${f(m.disc.p50, 6)}`
      + `    ${f(m.disc.centroid, 5, 2)}  ${f(m.disc.reach, 5, 2)}`
      + ` | ${String(m.world.n).padStart(18)} ${f(m.world.mean, 6)} ${f(m.world.p50, 6)} ${f(m.world.p90, 6)}`
      + ` | ${String(m.hero.n).padStart(22)} ${f(m.hero.mean, 6)} ${f(m.hero.p50, 6)}    ${f(m.hero.centroid, 5, 2)}`);
  }
  await p.screenshot({ path: `${OUT}/${WORLD}.png`, timeout: 600000 });
  writeFileSync(`${OUT}/${WORLD}.src`, DIGEST + '\n');
} finally {
  await b.close();
}

if (!rows.length) { say(false, `${WORLD} — nothing was measured`); process.exit(1); }
console.log('\n══ READ IT LIKE THIS');
console.log('  disc      what the contact disc removes from the ground, in display codes out of 255.');
console.log('  world     what every OTHER caster in the SAME frame removes — the bar, measured, not asserted.');
console.log('  hero-cast what the hero\'s own body would put down if body.castShadow were true. Measured by');
console.log('            flipping it in the page for one render. NOTHING ON DISK CHANGES — void3d.ts:605 is');
console.log('            still an unconditional false and no crew has landed a size gate.');
console.log('  centroid  distance of the darkening\'s centre of mass from the hero\'s centre, in his own');
console.log('            radii, off the PROJECTED radius. This is the quantity the black-ellipse objection');
console.log('            at void3d.ts:1570-1580 is actually about, and the one a CAST_R sweep needs.');
console.log('  reach     furthest darkened pixel from his centre, in his own radii. Under 1.00 means the');
console.log('            whole shadow is behind him and the player never sees it.');
console.log('\n══ THE BAR');
for (const r of rows) {
  const need = r.world.p50 * FLOOR;
  const peakNeed = r.world.p90 * (2 / 3);
  console.log(`  r=${String(r.rr).padEnd(5)} the world draws p50 ${r.world.p50.toFixed(1)} in this frame; the hero needs `
    + `${need.toFixed(1)} and has ${r.disc.p50.toFixed(1)} `
    + `(${(r.disc.p50 / Math.max(1e-9, r.world.p50) * 100).toFixed(0)}% of the world's) — `
    + `${r.disc.p50 >= need ? 'PASS' : 'FAIL'}`);
  console.log(`         descriptive, NOT gated: peak ${r.disc.peak.toFixed(1)} against two thirds of the world's p90 `
    + `(${peakNeed.toFixed(1)}) — ${r.disc.peak >= peakNeed ? 'already clear' : 'short'}; `
    + `reach ${r.disc.reach.toFixed(2)}, footprint ${(r.disc.n / r.heroArea * 100).toFixed(1)}% of his own area`);
  console.log(`         and if he cast: ${r.hero.n} px at p50 ${r.hero.p50.toFixed(1)} `
    + `(${(r.hero.p50 / Math.max(1e-9, r.world.p50) * 100).toFixed(0)}% of the world's), centroid ${r.hero.centroid.toFixed(2)} hero-radii out`);
}
const dark = rows.filter((r) => r.disc.p50 < r.world.p50 * FLOOR);
const extent = rows.filter((r) => r.disc.reach < 1.02 || r.disc.n / r.heroArea < 0.05);
say(!dark.length && !extent.length,
  [dark.length ? `NOT DARK ENOUGH at r = ${dark.map((r) => r.rr).join(', ')}: the hero's grounding shadow reads `
    + `${dark.map((r) => r.disc.p50.toFixed(1)).join(', ')} against the ${dark.map((r) => (r.world.p50 * FLOOR).toFixed(1)).join(', ')} `
    + `this world's own cast shadows set in the same frame` : null,
   extent.length ? `UNGROUNDED (extent) at r = ${extent.map((r) => r.rr).join(', ')}` : null,
   (!dark.length && !extent.length) ? `${WORLD} — the contact disc is visible, placed, and at least a third as `
     + `deep as the shadows this world draws for everything else` : null,
  ].filter(Boolean).join(' · '));
process.exit(dark.length || extent.length ? 1 : 0);
