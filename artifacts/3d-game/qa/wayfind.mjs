// DOES THE ARROW POINT AT THE THING?
//
//   node qa/wayfind.mjs [port] [world]
//
// The owner: "when you hit the amount needed for the goal you get this arrow
// that points where that last objective is right. Give some form of guidance
// to finish the level."
//
// ── THE BUG THIS EXISTS FOR ──────────────────────────────────────────────────
// THREE.Vector3.project() divides by w, and w is negative for anything BEHIND
// the camera — so a point behind you comes back with x and y MIRRORED through
// the origin. An edge arrow built the obvious way, by clamping the projected
// point to the frame, therefore points AWAY from the target for exactly the
// half of the world the child cannot see. That is not a corner case on this
// feature: the arrow's whole job is the moment she has walked past the barn.
//
// So the probe does not merely check the shipped arrow. It ALSO computes what
// the naive projected-and-clamped implementation would have returned for the
// same target, and prints how many samples that version gets wrong. A probe
// that cannot show its own teeth is a probe nobody can trust to have them.
//
// ── WHY IT DOES NOT PLAY THE GAME ────────────────────────────────────────────
// The arrow appears at voidling.radius >= landmarkR, which is 4.50 on maple —
// roughly 60% of a three-minute match. This box renders about one frame per
// two wall-seconds, so growing to it costs longer than the whole gate. The
// placement is therefore exported as window.__wayAim(x,y,z) and swept over a
// sphere of synthetic targets in a SINGLE frame, and the live arrow's own
// state is read separately from window.__wayState().
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
const ANG_TOL = 2.0;     // degrees of bearing error allowed
const EDGE_TOL = 1.0;    // pixels outside the safe rect allowed

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 430, height: 932 } });
let fail = 0;
const bad = (m) => { console.log('  ' + m); fail++; };

try {
  // ?w= and ?g= are the repo's own probe channel (qa/levels.mjs:229). ?world=
  // is NOT read by the build and a probe that used it armed no goal at all.
  await pg.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&g=3&len=180`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  // ── TELLING "NO WAYFINDER" APART FROM "STILL BOOTING" ────────────────────
  // _dbgLive flips true on the LAST line of module init (prototype3d.ts, just
  // before animate()), so every hook appears at once or not at all. A plain
  // timeout on __wayState therefore cannot distinguish a build without the
  // feature from a build that is merely slow — and this one is slow: the
  // island carries 5,600 edibles and the software renderer takes its time.
  // A fixed 30s window produced a FALSE FAIL on a correct build the day the
  // people gained 39% more triangles and init crossed it.
  // So: wait for a hook that exists on BOTH builds, then ask about this one.
  await pg.waitForFunction(() => typeof window.__edibles !== 'undefined', null, { timeout: 600000 });
  if (await pg.evaluate(() => typeof window.__wayState !== 'function')) {
    console.log('\nFAIL — the debug API is live but window.__wayState is absent: this build has no wayfinder.');
    await b.close();
    process.exit(1);
  }
  await pg.waitForFunction(() => window.__wayState().goalN === 3, null, { timeout: 600000 });

  // ── (a) THE GATE ───────────────────────────────────────────────────────────
  // Before she is big enough, there is no arrow. This is the owner's own
  // trigger and it is also the kind thing: pointing at a building she would
  // bounce off is worse than silence.
  const st = await pg.evaluate(() => window.__wayState());
  console.log(`\n  goal ${st.goalN}, landmark held: ${st.haveProp}, r ${st.r.toFixed(2)} of ${st.need} needed\n`);
  if (st.goalN !== 3) bad(`FAIL — ?g=3 did not arm the landmark dot; goal is ${st.goalN}.`);
  if (!st.haveProp) bad('FAIL — the landmark dot armed but goalProp is null, so there is nothing to point at.');
  if (st.r < st.need && st.on) bad(`FAIL — the arrow is up at r ${st.r.toFixed(2)} against a needed ${st.need}.`);
  if (st.r < st.need) console.log(`  (a) gate holds: r ${st.r.toFixed(2)} < ${st.need}, arrow is ${st.on ? 'UP' : 'down'}.`);

  // ── (b) THE SWEEP ──────────────────────────────────────────────────────────
  const res = await pg.evaluate(({ ANG_TOL }) => {
    const THREE = window.__THREE, cam = window.__cam;
    const w = innerWidth, h = innerHeight;
    const st = window.__wayState();
    const L = st.pad, R = w - st.pad, T = st.top, B = h - st.bot;
    const centre = window.__edibles.length ? window.__edibles[0].mesh.position.clone() : new THREE.Vector3();
    const out = [];
    for (let i = 0; i < 24; i++) {
      const az = (i / 24) * Math.PI * 2;
      for (const dist of [8, 40, 160, 600]) {
        const t = new THREE.Vector3(centre.x + Math.cos(az) * dist, 2, centre.z + Math.sin(az) * dist);
        const a = window.__wayAim(t.x, t.y, t.z);
        if (!a) continue;
        // TRUTH, taken in camera space, which is signed correctly on both
        // sides of the lens: x right, y up, z negative in front.
        const c = t.clone().applyMatrix4(cam.matrixWorldInverse);
        const trueAng = Math.atan2(-c.y, c.x) * 180 / Math.PI + 90;
        // A SECOND, INDEPENDENT TRUTH that involves no camera-space algebra at
        // all: where the void IS on screen, to where the target IS on screen.
        // That is the bearing a child actually reads, and it is the one that
        // has to agree with the joystick — this repo has already shipped a
        // gaze that pointed 45 degrees wrong because a flat world basis was
        // used where a camera basis was needed. Only defined in front.
        const hp = window.__voidPos ? window.__voidPos() : null;
        let seenAng = null;
        if (hp && a.inFront) {
          const hv = new THREE.Vector3(hp.x, hp.y, hp.z);
          const hc = hv.clone().applyMatrix4(cam.matrixWorldInverse);
          if (hc.z < -0.1) {
            const hpj = hv.clone().project(cam);
            const hx = (hpj.x * 0.5 + 0.5) * w, hy = (-hpj.y * 0.5 + 0.5) * h;
            const tp = t.clone().project(cam);
            const tx2 = (tp.x * 0.5 + 0.5) * w, ty2 = (-tp.y * 0.5 + 0.5) * h;
            if (Math.hypot(tx2 - hx, ty2 - hy) > 12)
              seenAng = Math.atan2(ty2 - hy, tx2 - hx) * 180 / Math.PI + 90;
          }
        }
        // what the naive projected-and-clamped version would have said
        const p = t.clone().project(cam);
        const npx = (p.x * 0.5 + 0.5) * w, npy = (-p.y * 0.5 + 0.5) * h;
        const naiveAng = Math.atan2(npy - h / 2, npx - w / 2) * 180 / Math.PI + 90;
        const norm = (d) => { d = ((d % 360) + 540) % 360 - 180; return Math.abs(d); };
        out.push({ az: Math.round(az * 180 / Math.PI), dist, inFront: a.inFront, onScreen: a.onScreen,
          x: a.x, y: a.y, ang: a.ang, err: norm(a.ang - trueAng), naiveErr: norm(naiveAng - trueAng),
          seenErr: seenAng === null ? null : norm(a.ang - seenAng),
          outside: a.x < L - 1 || a.x > R + 1 || a.y < T - 1 || a.y > B + 1 });
      }
    }
    return { out, rect: { L, R, T, B } };
  }, { ANG_TOL });

  const rows = res.out;
  const edge = rows.filter((r) => !r.onScreen);
  const behind = rows.filter((r) => !r.inFront);
  const worst = edge.reduce((a, r) => (r.err > a.err ? r : a), edge[0]);
  const naiveWrong = rows.filter((r) => r.naiveErr > 90);
  console.log(`  (b) swept ${rows.length} targets: ${behind.length} behind the camera, ${edge.length} off screen.`);
  console.log(`      worst EDGE bearing error ${worst.err.toFixed(2)} deg (az ${worst.az}, ${worst.dist}u, ${worst.inFront ? 'in front' : 'BEHIND'}).`);
  console.log(`      the naive projected-and-clamped arrow points more than 90 deg wrong on ${naiveWrong.length} of them.`);

  // THE TWO MODES ARE GRADED DIFFERENTLY, and conflating them is a mistake
  // this probe made on its first run: an ON-SCREEN target is marked, not
  // pointed at — the chevron sits above the building and faces DOWN at it, so
  // its rotation is 180 by design and comparing that to a bearing fails a
  // correct implementation. Only the edge arrows carry a bearing.
  for (const r of rows) {
    if (!r.onScreen && r.err > ANG_TOL)
      bad(`FAIL — bearing off by ${r.err.toFixed(1)} deg at az ${r.az}, ${r.dist}u, ${r.inFront ? 'in front' : 'behind'}.`);
    if (r.onScreen && Math.abs(r.ang - 180) > 0.01)
      bad(`FAIL — an on-screen landmark is marked, not aimed at: expected a rotation of 180, got ${r.ang.toFixed(1)} at az ${r.az}.`);
    if (r.outside) bad(`FAIL — placed at ${r.x.toFixed(0)},${r.y.toFixed(0)}, outside the safe rect, az ${r.az}.`);
  }
  // (d) does it agree with what she sees, and therefore with the stick?
  const seen = rows.filter((r) => !r.onScreen && r.seenErr !== null);
  if (seen.length < 8) bad(`FAIL — only ${seen.length} targets could be graded against the on-screen void-to-target bearing; the sweep cannot speak to whether the arrow agrees with the joystick.`);
  else {
    const ws = seen.reduce((a, r) => (r.seenErr > a.seenErr ? r : a), seen[0]);
    console.log(`  (d) against the bearing a child actually sees (void on screen -> target on screen),`);
    console.log(`      worst disagreement ${ws.seenErr.toFixed(2)} deg over ${seen.length} targets.`);
    for (const r of seen) if (r.seenErr > ANG_TOL)
      bad(`FAIL — the arrow disagrees with the on-screen bearing by ${r.seenErr.toFixed(1)} deg at az ${r.az}, ${r.dist}u. A child dragging along it would miss.`);
  }

  if (!naiveWrong.length) bad('FAIL — the sweep never put a target behind the camera, so it cannot prove it catches the mirroring bug. Widen it.');

  // ── (c) NO KEYFRAMES ───────────────────────────────────────────────────────
  // #evolve, #banner and #titlecard are each on screen for ten microseconds
  // under the OS reduced-motion catch-all, because their visibility IS their
  // animation. The arrow must not join them: it is shown by a class and moves
  // because it tracks a thing in the world.
  const anim = await pg.evaluate(() => {
    const e = document.getElementById('wayfind');
    if (!e) return 'ABSENT';
    const a = getComputedStyle(e).animationName;
    e.classList.add('on'); const b = getComputedStyle(e).animationName;
    e.classList.remove('on'); return { off: a, on: b };
  });
  if (anim === 'ABSENT') bad('FAIL — #wayfind is not in the document.');
  else if (anim.off !== 'none' || anim.on !== 'none') bad(`FAIL — #wayfind carries an animation (${anim.off} / ${anim.on}); it must be shown by a class, not by a keyframe's last frame.`);
  else console.log('  (c) no @keyframes on #wayfind, shown and hidden by a class.');
  // ── (e) THE CROSSING: HAND HER THE RADIUS, DO NOT GROW IT ────────────────
  // Three things must happen together at the crossing, and until this probe
  // none of them was asserted anywhere: the chip must stop saying GROW BIGGER,
  // the cue must fire for the LANDMARK (it used to fire only for the largest
  // prop on the island, which is a different building on every world), and the
  // arrow must come up.
  // The chip is filled by refreshGoalChip at 5 Hz and the arrow by the frame
  // loop, and this box renders about one frame per two seconds — so every
  // assertion below waits for the state to CONVERGE rather than sampling once.
  // Reading immediately after __eatKind returns catches a frame that has not
  // happened yet, which is a fault in the probe and not in the game.
  await pg.waitForFunction(() => window.__wayState().chip !== '', null, { timeout: 300000 });
  const before = await pg.evaluate(() => window.__wayState());
  if (before.chip !== 'GROW BIGGER') bad(`FAIL — before the crossing the chip reads "${before.chip}", not GROW BIGGER.`);
  if (before.cued) bad('FAIL — the landmark cue fired before she was big enough to eat it.');
  if (before.on) bad('FAIL — the arrow is up before the crossing.');

  // ── THIS BAR USED TO EAT ITS WAY THERE, AND IT WAS MEASURING THE CLAMP ───
  // It grew the void with __eatKind('snack', 60) in a loop that broke on the
  // FIRST sample where r >= need. That loop can never deliver a SUSTAINED
  // crossing, and prototype3d.ts ~3653 already said why: "In a match the growth
  // law owns the radius and would walk this back on the next frame; the probe
  // would then be measuring the clamp."
  //
  // The law has two walls and __eatKind defeats neither. prototype3d.ts:13027
  // rate-limits growth to lastR + maxStep, at most ~0.0135 per RENDERED frame;
  // :13028 caps it at lawCap, a function of MATCH-elapsed seconds, and match
  // time advances at the clamped dt of 0.05s per frame (:12659). So on a box
  // rendering one frame per ~2.5 wall-seconds, 0.90 -> 4.50 is hundreds of
  // frames and many wall-minutes. __eatKind writes the radius directly, the
  // next frame takes it straight back, and a read between those two moments
  // sees a number the game has already revoked. That is exactly what the gate
  // captured: "ate 1320 snacks: r 0.90 -> 4.76 against 4.5 needed" and then
  // "cue false -> false". The game was right; the probe was measuring the clamp.
  //
  // __setVoidR (prototype3d.ts:3662) is the instrument that exists for this. It
  // sets frozenR — the flag every one of those clamps tests, and :13027, :13028
  // and :13091 are its only three readers — and it sets radius AND lastR
  // together, which matters because lastR is what the rate limiter measures
  // from. The crossing it hands over is one the growth law cannot take back.
  //
  // + 0.25, NOT + 0. The chip (:2695) and the arrow (:2785) trigger on
  // sp.landmarkR = 4.50, but the CUE (:14378) asks the real eat question —
  // goalProp.radius <= voidling.radius * EAT_RATIO — and maple's barn is r 5.0
  // (:2527), so the cue actually needs 5.0 / 1.11 = 4.5045. Sitting exactly on
  // 4.50 lights two of the three signals and hangs on the third.
  // (|| 1) mirrors the fallback the chip and the arrow use; __wayState's own
  // `need` falls back to 0 (:4081), which would freeze her under START_R on a
  // world that has no landmark.
  //
  // The supply-wall reading the old loop gave for free is kept as a REPORT: a
  // caller that asks __eatKind for sixty and gets nine is looking at an island
  // with nothing left to eat, and that is worth printing even though it is no
  // longer what this bar turns on.
  const grew = await pg.evaluate(() => window.__eatKind('snack', 60));
  await pg.evaluate(() => { const s = window.__wayState(); window.__setVoidR((s.need || 1) + 0.25); });
  const crossed = await pg.evaluate(() => window.__wayState());
  console.log(`  (e) asked __eatKind for 60 snacks and got ${grew}; radius handed over the law: `
    + `r ${before.r.toFixed(2)} -> ${crossed.r.toFixed(2)} against ${crossed.need} needed.`);
  if (crossed.r < crossed.need) {
    bad(`FAIL — __setVoidR did not take (${crossed.r.toFixed(2)} of ${crossed.need}); the crossing was never reached, so nothing below was tested.`);
  } else {
    // give the frame loop and the 5 Hz chip a fair chance to notice
    // …AND RE-ASSERT ON THE WAY. frozenR turns the three growth clamps off, but
    // the HUNTER SHRINK at prototype3d.ts:4972 and :4988 does not test it — so
    // one bite during this wait would drop her back under the threshold and
    // this bar would report the arrow down for a reason that is not the arrow's
    // fault. A bite is not a verdict; re-arming inside the poll is.
    await pg.waitForFunction(() => {
      const s = window.__wayState();
      if (s.r < (s.need || 1)) window.__setVoidR((s.need || 1) + 0.25);
      return s.on && s.cued && s.chip === 'EAT IT NOW';
    }, null, { timeout: 240000 }).catch(() => { });
    const after = await pg.evaluate(() => window.__wayState());
    console.log(`      chip "${before.chip}" -> "${after.chip}", cue ${before.cued} -> ${after.cued}, arrow ${before.on} -> ${after.on}`);
    if (after.chip !== 'EAT IT NOW') bad(`FAIL — past the crossing the chip reads "${after.chip}", not EAT IT NOW.`);
    if (!after.cued) bad('FAIL — the landmark came into range and the game said nothing: no banner, no ring, no sound. That moment belongs to the goal, not to the biggest building on the island.');
    if (!after.on) bad('FAIL — the landmark is edible and the arrow is still down.');
    // WHEN THIS GOES RED AGAIN, SAY WHICH KIND OF RED IT IS. __law() publishes
    // lawCap, maxStep and fed (prototype3d.ts:3527). Printed only on a failure,
    // it separates "the game did not react" from "the radius was taken back",
    // which printed identically before and cost a wrong diagnosis out loud.
    if (after.chip !== 'EAT IT NOW' || !after.cued || !after.on) {
      const law = await pg.evaluate(() => ({ ...window.__law(), r: window.__wayState().r }));
      console.log('      law at the verdict: ' + Object.entries(law)
        .map(([k, v]) => `${k}=${typeof v === 'number' ? +v.toFixed(3) : v}`).join(' '));
    }
  }
} catch (e) {
  bad(`FAIL — wayfind threw: ${e.message}`);
}
await b.close();
console.log('');
console.log(fail ? `FAIL — ${fail} problem(s).`
  : '\nPASS — the arrow points at the landmark from every bearing, in front and behind, and never leaves the safe rect.');
process.exit(fail ? 1 : 0);
