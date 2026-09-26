// BELLCLOUD HEIGHTS (world 6, internal id 'skylark') — IS THERE SOMETHING TO
// EAT EVERYWHERE, DOES THE GROUND READ AS CLOUD, AND IS THE GREAT BELL THE HERO?
//
// The owner, 2026-09-24: "Skylark needs work. Item placement is like all just
// in the middle." He was reading the island the way a child crosses it, and no
// probe in this directory measured that. qa/rng.mjs asks whether each district
// got what it asked for — and every district did, which is exactly why it could
// not see this: the launch field asked for its envelopes and got them, and the
// three runway arms, the perimeter and the rough asked for grass and got grass.
// Asked-against-placed is green on a level whose food is all in one place.
//
// Then, 2026-09-25, the re-theme (docs/BELLCLOUD.md): "What if we did something
// like ... a cloud level, like there's clouds or something on the ground as
// texture. And then there's like some old style castles ... And the center
// could be like a giant bell." The airfield became a kingdom on the clouds.
//
// So this reads the LIVE page's edibles (after the boot sweep, the world a
// child plays) and lays a grid over the island's own coast, loaded through
// vite's SSR transform as qa/skyland.mjs does, so the regions and the strips
// are the game's own functions and not a copy of them. For every land cell it
// asks: is there something to eat near here, at each size? And it measures its
// own play frames for the cloud ground and the light (BELLCLOUD §4).
//
//   node qa/skylarkfield.mjs <port> [--out=dir] [--tag=name] [--world=skylark]
//   node qa/skylarkfield.mjs --from=<out>/<tag>.json      re-grade a saved run
//
// --world=maple photographs Maple's spawn with the same camera and measures the
// frame the same way — the daylight reference the light is compared against.
// It skips the coverage bars, which are this world's.
//
// "NEAR" IS THE PLAY FRAME, MEASURED. The settled camera at r 4 is projected
// onto y = 0 on every run (the frame's four corners), and a prop is near a
// cell when it is within the radius of a circle with the same ground area as
// that frame. A portrait phone frame is a long thin trapezoid — at r 4 it
// measured 566 world units across and 1,475 along — so half its narrow axis
// would ask for a balloon every 400 units, and half its long axis would call a
// prop off the top of the screen "in frame". Equal area is the one radius that
// is neither, and it moves with the camera if the camera ever moves.
//
// THE CELL IS 60 WORLD UNITS (3 scene units). The live strip (the Grand
// Avenue) and the circle (the Bell Plaza) are not graded: the avenue is the
// level's sightline and is kept clear by design, and the plaza is the Great
// Bell's authored precinct.
//
// ── RETRACTIONS (GOVERNOR rule 3b), 2026-09-25 ─────────────────────────────
// Two of the first version's bars and one of its metrics measured the airfield
// the owner has now replaced, and on the kingdom they would move for the wrong
// reason. They are retired here, in writing, with what they measured:
//
//   A — "an ENVELOPE within the frame radius from 60% of each part, 80% of the
//       island". It measured whether a balloon was in sight, because on the
//       airfield balloons were the only big meal. On the kingdom the gardens
//       hold cottages, turrets and bell shrines, and the balloons have gone to
//       the edge on purpose (visitors docking). An island full of castles would
//       FAIL A while being exactly what the owner asked for. A' asks the
//       question A was standing in for: is a BIG MEAL (eat radius >= 2.5 — a
//       cottage, a turret, the Keep, a gate, a wall, a balloon) in frame from
//       everywhere?
//   C — "standing envelopes are at least a quarter of ALL envelopes". It
//       measured whether the launch field read as a balloon meet. The field is
//       gardens now; C' asks whether the balloons that remain are where the
//       poster puts them (docked along the edge and at the Balloon Dock) and
//       whether a quarter of those stand.
//   the GRASS statistics (share, saturation and luma of green-dominant pixels)
//       — on a white-lilac cloud ground "green-dominant" selects the mint
//       garden tint and the cloud trees, not the ground. They are replaced by
//       the CLOUD metric: HSV saturation <= 0.20 and luma >= 0.60.
//
// ── THE BARS (BELLCLOUD §4 and §10.1) ──────────────────────────────────────
//   A' a big meal (r >= 2.5) within the frame radius of >= 60% of each part's
//      cells and >= 80% of the island's.
//   B  a mid-size meal (1 <= r < 3) within it of >= 50% per part, 70% island.
//   C' >= 24 flyable balloons (stage 1-3: spilled, cold, standing) on the
//      island; >= 60% of them in the Balloon Dock ('arrivals') or within 1,200
//      world units of the coast; >= 25% of them standing.
//   D  on this probe's own four play frames: L1 the spawn frame's mean luma
//      0.60-0.72 (Maple's recorded 0.553 plus 0.05-0.17: brighter than a green
//      town, short of the white stone merging into the ground); L2 the cloud
//      pixels' median luma 0.74-0.86 in every frame; L3 no frame with more than
//      2% of its pixels at any channel >= 250 (white must not blow out); and
//      cloud pixels >= 45% of every frame (the ground reads as cloud).
//   E  exactly one static edible tagged landmark 'great bell', within 60 world
//      units of the plaza centre (6107, 4349), with an eat radius >= every
//      other static edible's — so beginMatch's heroProp (the largest radius)
//      resolves to it.
//
// ── RECORDED (GOVERNOR rule 2), SEED 7, fresh builds, through the slot lock ──
//   BEFORE, the airfield (branch build d9517be): FAIL, 10 bars —
//     C' 169 flyable balloons, 33.1% docked at the edge (bar 60)
//     D  spawn luma 0.471 (L1 0.60-0.72); cloud pixels 9.7%, 1.1%, 2.0%, 0.5%
//        of the four frames (bar 45); cloud median 0.689, 0.716 and 0.720 at
//        the spawn, the north arm and the south-west arm (L2 0.74)
//     E  no static edible tagged 'great bell' (the largest is r 18, the whale)
//     (A' 85.2% and B 92.4% island-wide passed on the airfield already.)
//   AFTER, the kingdom (this branch, 2026-09-26): PASS — A' 87.9% island-wide,
//     the thinnest part the Cloud Market at 62.8%; B 81.4%; C' 44 flyable,
//     100% docked at the edge, 45.5% standing; D spawn luma 0.632, cloud
//     66.5%, 81.3%, 77.8%, 85.3% of the frames, cloud medians 0.759-0.781,
//     nothing blown; E the Great Bell r 5.5, 0.0 from the plaza centre, the
//     next largest r 5.2. qa/bellsheet.mjs lays the two runs side by side.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const flag = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const FROM = flag('from', null);
const PORT = argv.find((a) => /^\d+$/.test(a)) || '4177';
const OUT = flag('out', 'qa/out/skylarkfield');
const TAG = flag('tag', 'run');
const WORLD = flag('world', 'skylark');
const SEED = process.env.SEED ? Number(process.env.SEED) : 7;   // pinned, as qa/placement.mjs pins it

// ── THE VIEWS. Fixed world points, one per part of the island the owner said
// was empty, plus the spawn. Chosen off skylark.ts's geometry, not off any
// build: every one is on open ground, clear of the Grand Avenue (03/21) and the
// Rainbow Ring, so the same four frames can be shot on any layout — which is
// what lets the owner's sheet put the airfield and the kingdom side by side.
const VIEWS = WORLD === 'skylark' ? [
  ['spawn', null],                // the Balloon Dock — the first frame
  ['northarm', [6000, 3000]],     // between the 03 and 15 ends, inside the ring
  ['westshoulder', [3500, 6500]], // west of the Grand Avenue, north of its 21 end
  ['southwestarm', [3200, 7700]], // the 21 arm, beside the avenue
] : [['spawn', null]];

/** one frame's measurements on one line, for the shoot and the grade alike */
const frameLine = (f) => f.cloudShare === undefined
  ? `luma ${f.luma.toFixed(3)}  sat ${f.sat.toFixed(3)}  (saved before the cloud metric existed; re-shoot it)`
  : `luma ${f.luma.toFixed(3)}  sat ${f.sat.toFixed(3)}  cloud ${(f.cloudShare * 100).toFixed(1)}% of frame, median luma ${f.cloudLuma.toFixed(3)}  blown ${(f.blownShare * 100).toFixed(2)}%`;

const raw = FROM ? JSON.parse(readFileSync(FROM, 'utf8')) : await shoot();
if (raw.world !== 'skylark') process.exit(0);
process.exit(await grade(raw));

async function shoot() {
  const { chromium } = await import('playwright');
  const { PNG } = await import('pngjs');
  mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript((seed) => {
    let a = (seed >>> 0) + 0x6D2B79F5;
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, SEED);
  await p.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('voidPlayed', '1');
      localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
      localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
    } catch { }
  });
  const t0 = Date.now();
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => window.__validateWorld?.());

  // ── THE POPULATION, as the page holds it after the boot sweep ───────────
  const props = await p.evaluate(() => window.__edibles
    .filter((e) => e.mesh && !e.eaten && e.mesh.visible && !e.mesh.userData.mover)
    .map((e) => {
      const u = e.mesh.userData;
      return { x: +e.mesh.position.x.toFixed(3), z: +e.mesh.position.z.toFixed(3), r: e.radius,
        stage: u.balloon ? u.balloon.stage : -1, kind: u.kind || '', qk: u.qk || '', lm: u.landmark || '' };
    }));
  const movers = await p.evaluate(() => window.__edibles.filter((e) => e.mesh && e.mesh.userData.mover).length);
  console.log(`${WORLD.toUpperCase()} — ${props.length} static edibles and ${movers} movers on the page after the boot sweep (${((Date.now() - t0) / 1000).toFixed(0)}s)`);

  // ── THE OVERVIEW — straight down, orthographic, the whole island ────────
  // No game hook: a camera made here and one render into the canvas, read
  // back in the same task (a WebGL canvas holds its frame until the task
  // yields). Fog off for the one frame so the far arm is not greyed by
  // distance from a camera that does not exist in play. Restored at once.
  if (WORLD === 'skylark') {
    const url = await p.evaluate(() => {
      const THREE = window.__THREE, R = window.__renderer, S = window.__scene;
      const cam = new THREE.OrthographicCamera(-232, 232, 232, -232, 1, 4000);
      cam.position.set(0, 1500, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
      const fog = S.fog; S.fog = null;
      const size = new THREE.Vector2(); R.getSize(size); const pr = R.getPixelRatio();
      R.setPixelRatio(1); R.setSize(1400, 1400, false);
      R.render(S, cam);
      const u = R.domElement.toDataURL('image/png');
      S.fog = fog; R.setPixelRatio(pr); R.setSize(size.x, size.y, false);
      return u;
    });
    writeFileSync(`${OUT}/${TAG}_overview.png`, Buffer.from(url.split(',')[1], 'base64'));
  }

  // ── THE PLAY FRAMES — shippedlook's recipe: one match, HUD hidden by a
  // stylesheet, rung 0 pinned, r 4, mouth pinned shut, camera settled ──────
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
  }));
  await p.evaluate(() => document.getElementById('btnPlay')?.click());
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => {
    const cv = document.querySelector('canvas');
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true }));
  });
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 400000 });
  await p.evaluate(() => {
    const cv = document.querySelector('canvas');
    for (const el of Array.from(document.body.children)) if (el !== cv && !el.contains(cv)) el.setAttribute('data-qahide', '');
    const st = document.createElement('style'); st.textContent = '[data-qahide]{display:none !important}';
    document.head.appendChild(st);
    window.__pinQuality(0); window.__setVoidR(4);
    window.__setMood?.('cruise'); window.__pinMouth?.(true); window.__calm?.();
  });
  const tick = async (dt) => {
    const t = await p.evaluate(() => window.__matchState().t);
    await p.waitForFunction((t1) => (window.__matchState?.().t ?? 0) > t1, t + dt, { timeout: 400000 }).catch(() => { });
  };
  await tick(0.6);

  /** the ground the settled play camera shows: the frame's corners and edge
   *  midpoints on y = 0, in world units, measured off the live camera */
  const footprint = async () => p.evaluate(() => {
    const THREE = window.__THREE, cam = window.__cam, ray = new THREE.Raycaster();
    const hit = (sx, sy) => {
      ray.setFromCamera(new THREE.Vector2(sx, sy), cam);
      const d = ray.ray.direction, o = ray.ray.origin;
      if (d.y >= -1e-6) return null;
      const t = -o.y / d.y; return [(o.x + d.x * t) / 0.05 + 6000, (o.z + d.z * t) / 0.05 + 6000];
    };
    const L = hit(-1, 0), R = hit(1, 0), T = hit(0, 1), B = hit(0, -1);
    const C = [hit(-1, -1), hit(1, -1), hit(1, 1), hit(-1, 1)];
    let area = null;
    if (C.every(Boolean)) {
      area = 0;
      for (let i = 0; i < 4; i++) { const [x1, y1] = C[i], [x2, y2] = C[(i + 1) % 4]; area += x1 * y2 - x2 * y1; }
      area = Math.abs(area) / 2;
    }
    return { across: L && R ? Math.hypot(R[0] - L[0], R[1] - L[1]) : null, along: T && B ? Math.hypot(T[0] - B[0], T[1] - B[1]) : null, area };
  });

  const frames = [];
  let fp = null;
  for (const [name, at] of VIEWS) {
    if (at) await p.evaluate(([x, y]) => window.__warpVoid((x - 6000) * 0.05, (y - 6000) * 0.05), at);
    await p.evaluate(() => { window.__calm?.(); window.__settleCam?.(4); });
    await tick(0.15);
    if (!fp) fp = await footprint();
    const path = `${OUT}/${TAG}_${name}.png`;
    await p.screenshot({ path });
    const img = PNG.sync.read(readFileSync(path));
    // mean Rec.709 luma and HSV saturation over the frame; the CLOUD pixels
    // (saturation <= 0.20 and luma >= 0.60, BELLCLOUD L2), their share of the
    // frame and their median luma; and the BLOWN pixels, any channel >= 250 (L3)
    let n = 0, Y = 0, S = 0, blown = 0;
    const cloudY = [];
    for (let i = 0; i < img.data.length; i += 4) {
      const R8 = img.data[i], G8 = img.data[i + 1], B8 = img.data[i + 2];
      const r = R8 / 255, g = G8 / 255, bl = B8 / 255;
      const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), s = mx > 0 ? (mx - mn) / mx : 0;
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      n++; Y += y; S += s;
      if (s <= 0.20 && y >= 0.60) cloudY.push(y);
      if (R8 >= 250 || G8 >= 250 || B8 >= 250) blown++;
    }
    cloudY.sort((a, c) => a - c);
    const f = { view: name, luma: Y / n, sat: S / n, cloudShare: cloudY.length / n,
      cloudLuma: cloudY.length ? cloudY[Math.floor(cloudY.length / 2)] : 0, blownShare: blown / n };
    frames.push(f);
    console.log(`  frame ${name.padEnd(13)} ${frameLine(f)}`);
  }
  await b.close();
  console.log(`  play frame shows ${fp.across?.toFixed(0)} world units across, ${fp.along?.toFixed(0)} along, ${(fp.area / 1e6).toFixed(3)}M square units (settled, r 4)`);
  const out = { world: WORLD, tag: TAG, seed: SEED, footprint: fp, frames, movers, props };
  writeFileSync(`${OUT}/${TAG}.json`, JSON.stringify(out));
  return out;
}

async function grade(raw) {
  const { createServer } = await import('vite');
  const s = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent', optimizeDeps: { noDiscovery: true, include: [] } });
  const SK = await s.ssrLoadModule('/src/proto3d/skylark.ts');
  await s.close();
  const W = raw.props.map((q) => ({ ...q, wx: q.x / 0.05 + 6000, wy: q.z / 0.05 + 6000 }));

  /** which part of the island a point is in. The districts are skRegionAt's
   *  own; the strips and the ring are split off the meadows by distance,
   *  because the owner's first complaint was the arms and the ring, and those
   *  are lines, not polygons. The Old Stone Ways count as shoulder. */
  const partOf = (x, y) => {
    const d = SK.skRegionAt(x, y);
    if (!d) return null;
    if (d === 'runway' || d === 'circle') return d;
    if (['launchfield', 'arrivals', 'tower', 'hangars', 'breakfast'].includes(d)) return d;
    if (SK.RUNWAYS.some((r) => SK.distToPath(x, y, r.pts) <= r.half + 450)) return 'shoulders';
    if (SK.distToPath(x, y, SK.PERIMETER) <= SK.PERIMETER_HALF + 400) return 'perimeter';
    return 'rough';
  };
  const R = Math.round(Math.sqrt(raw.footprint.area / Math.PI));
  const CLASSES = [
    ['any', () => true],
    ['small r<1', (q) => q.r < 1],
    ['mid 1-3', (q) => q.r >= 1 && q.r < 3],
    ['big r>=2.5', (q) => q.r >= 2.5],
    ['balloon', (q) => q.stage >= 1 && q.stage <= 3],
    ['standing', (q) => q.stage === 3],
  ];
  // a bucket hash so 20,000 cells x 5,000 props is not 10^8 distance tests
  const BK = 400, hash = new Map();
  for (const q of W) { const k = `${Math.floor(q.wx / BK)},${Math.floor(q.wy / BK)}`; (hash.get(k) || hash.set(k, []).get(k)).push(q); }
  const near = (x, y, pred) => {
    const r0 = Math.ceil(R / BK), i0 = Math.floor(x / BK), j0 = Math.floor(y / BK);
    for (let i = i0 - r0; i <= i0 + r0; i++) for (let j = j0 - r0; j <= j0 + r0; j++) {
      const L = hash.get(`${i},${j}`); if (!L) continue;
      for (const q of L) if (pred(q) && Math.hypot(q.wx - x, q.wy - y) <= R) return true;
    }
    return false;
  };
  const CELL = 60;
  const PARTS = ['launchfield', 'shoulders', 'perimeter', 'rough', 'arrivals', 'tower', 'hangars', 'breakfast'];
  const cov = {}; for (const k of [...PARTS, 'ALL']) cov[k] = { cells: 0, hit: CLASSES.map(() => 0) };
  for (let y = 1000 + CELL / 2; y < 10500; y += CELL) for (let x = 1500 + CELL / 2; x < 10500; x += CELL) {
    const part = partOf(x, y);
    if (!part || part === 'runway' || part === 'circle') continue;
    for (const k of [part, 'ALL']) {
      cov[k].cells++;
      CLASSES.forEach(([, pred], i) => { if (near(x, y, pred)) cov[k].hit[i]++; });
    }
  }
  const fp = raw.footprint;
  console.log(`\nBELLCLOUD HEIGHTS (skylark) — ${raw.tag}, SEED ${raw.seed}, ${raw.props.length} static edibles, ${raw.movers ?? '?'} movers`);
  console.log(`\nCOVERAGE — share of ${CELL}-unit land cells with an edible of that class within ${R} world units`);
  console.log(`  (${R} = the equal-area radius of the settled r-4 play frame: ${fp.across.toFixed(0)} across x ${fp.along.toFixed(0)} along, ${(fp.area / 1e6).toFixed(3)}M sq units;`);
  console.log('   the Grand Avenue and the Bell Plaza are kept clear by design and not graded)');
  console.log(`  ${'part'.padEnd(12)} ${'cells'.padStart(6)}  ${CLASSES.map(([n]) => n.padStart(11)).join('')}`);
  for (const k of [...PARTS, 'ALL']) {
    const c = cov[k];
    console.log(`  ${k.padEnd(12)} ${String(c.cells).padStart(6)}  ${c.hit.map((h) => `${(100 * h / Math.max(1, c.cells)).toFixed(1)}%`.padStart(11)).join('')}`);
  }

  // ── counts by part and by balloon stage ───────────────────────────────
  const byPart = {};
  const STAGES = ['bagged', 'spilled', 'cold', 'standing', 'whale'];
  for (const q of W) {
    const part = partOf(q.wx, q.wy) || 'off';
    const row = byPart[part] || (byPart[part] = { all: 0, small: 0, mid: 0, big: 0, st: [0, 0, 0, 0, 0] });
    row.all++;
    if (q.r < 1) row.small++; else if (q.r < 3) row.mid++; else row.big++;
    if (q.stage >= 0) row.st[q.stage]++;
  }
  console.log('\nEDIBLES BY PART — size class by eat radius (small <1, mid 1-3, big >=3), and the balloons by stage');
  console.log(`  ${'part'.padEnd(12)} ${'all'.padStart(5)} ${'small'.padStart(6)} ${'mid'.padStart(5)} ${'big'.padStart(5)}   ${STAGES.map((s2) => s2.padStart(9)).join('')}`);
  const tot = { all: 0, small: 0, mid: 0, big: 0, st: [0, 0, 0, 0, 0] };
  for (const k of [...PARTS, 'runway', 'circle', 'off']) {
    const r = byPart[k]; if (!r) continue;
    tot.all += r.all; tot.small += r.small; tot.mid += r.mid; tot.big += r.big; r.st.forEach((v, i) => { tot.st[i] += v; });
    console.log(`  ${k.padEnd(12)} ${String(r.all).padStart(5)} ${String(r.small).padStart(6)} ${String(r.mid).padStart(5)} ${String(r.big).padStart(5)}   ${r.st.map((v) => String(v).padStart(9)).join('')}`);
  }
  console.log(`  ${'TOTAL'.padEnd(12)} ${String(tot.all).padStart(5)} ${String(tot.small).padStart(6)} ${String(tot.mid).padStart(5)} ${String(tot.big).padStart(5)}   ${tot.st.map((v) => String(v).padStart(9)).join('')}`);

  // ── the flyable balloons (stage 1-3) and where they are ──────────────
  const fly = W.filter((q) => q.stage >= 1 && q.stage <= 3 && SK.onSkylarkLand(q.wx, q.wy));
  const edge = fly.filter((q) => SK.skRegionAt(q.wx, q.wy) === 'arrivals' || SK.distToEdge(q.wx, q.wy) <= 1200);
  const standFly = fly.filter((q) => q.stage === 3);
  const edgeShare = 100 * edge.length / Math.max(1, fly.length), standShare = 100 * standFly.length / Math.max(1, fly.length);
  console.log(`  flyable balloons ${fly.length}: ${edge.length} (${edgeShare.toFixed(1)}%) at the Balloon Dock or within 1,200 of the coast, ${standFly.length} (${standShare.toFixed(1)}%) standing`);

  // ── the landmark ──────────────────────────────────────────────────────
  const bells = W.filter((q) => q.lm === 'great bell');
  const others = W.filter((q) => q.lm !== 'great bell');
  const biggest = others.reduce((m, q) => (q.r > m.r ? q : m), { r: 0, kind: '', lm: '' });
  for (const q of bells) console.log(`  the Great Bell: r ${q.r} at (${q.wx.toFixed(0)}, ${q.wy.toFixed(0)}), ${Math.hypot(q.wx - 6107, q.wy - 4349).toFixed(1)} from the plaza centre`);
  console.log(`  the largest other static edible: r ${biggest.r} (${biggest.lm || biggest.kind || biggest.qk || '?'})`);
  for (const f of raw.frames) console.log(`  frame ${f.view.padEnd(13)} ${frameLine(f)}`);

  // ══ THE BARS — see the header for each one's reason ════════════════════
  const fails = [];
  const pct = (k, i) => 100 * cov[k].hit[i] / Math.max(1, cov[k].cells);
  const gi = CLASSES.findIndex(([n]) => n === 'big r>=2.5'), mi = CLASSES.findIndex(([n]) => n === 'mid 1-3');
  for (const k of PARTS) {
    if (!cov[k].cells) continue;
    if (pct(k, gi) < 60) fails.push(`A' ${k}: a big meal (r >= 2.5) within ${R} of ${pct(k, gi).toFixed(1)}% of its cells (bar 60)`);
    if (pct(k, mi) < 50) fails.push(`B ${k}: a mid-size edible within ${R} of ${pct(k, mi).toFixed(1)}% of its cells (bar 50)`);
  }
  if (pct('ALL', gi) < 80) fails.push(`A' island: a big meal within ${R} of ${pct('ALL', gi).toFixed(1)}% of cells (bar 80)`);
  if (pct('ALL', mi) < 70) fails.push(`B island: a mid-size edible within ${R} of ${pct('ALL', mi).toFixed(1)}% of cells (bar 70)`);
  if (fly.length < 24) fails.push(`C' ${fly.length} flyable balloons on the island (bar 24)`);
  if (edgeShare < 60) fails.push(`C' ${edgeShare.toFixed(1)}% of the flyable balloons are at the Balloon Dock or within 1,200 of the coast (bar 60)`);
  if (standShare < 25) fails.push(`C' ${standShare.toFixed(1)}% of the flyable balloons are standing (bar 25)`);
  const spawn = raw.frames.find((f) => f.view === 'spawn');
  if (!spawn || spawn.luma < 0.60 || spawn.luma > 0.72) fails.push(`D L1 spawn frame mean luma ${spawn?.luma.toFixed(3)} (bar 0.60-0.72)`);
  for (const f of raw.frames) {
    if (f.cloudShare === undefined) { fails.push(`D ${f.view}: no cloud metric in this run (re-shoot it)`); continue; }
    if (f.cloudShare < 0.45) fails.push(`D ${f.view}: cloud pixels ${(f.cloudShare * 100).toFixed(1)}% of the frame (bar 45%)`);
    if (f.cloudLuma < 0.74 || f.cloudLuma > 0.86) fails.push(`D L2 ${f.view}: cloud median luma ${f.cloudLuma.toFixed(3)} (bar 0.74-0.86)`);
    if (f.blownShare > 0.02) fails.push(`D L3 ${f.view}: ${(f.blownShare * 100).toFixed(2)}% of pixels at a channel >= 250 (bar 2%)`);
  }
  if (bells.length !== 1) fails.push(`E ${bells.length} static edibles tagged 'great bell' (bar exactly 1)`);
  else {
    const q = bells[0], d = Math.hypot(q.wx - 6107, q.wy - 4349);
    if (d > 60) fails.push(`E the Great Bell is ${d.toFixed(0)} from the plaza centre (bar 60)`);
    if (q.r < biggest.r) fails.push(`E the Great Bell's r ${q.r} is under the largest other edible's r ${biggest.r} (${biggest.kind || biggest.qk}) — heroProp would not be the bell`);
  }

  writeFileSync(FROM ? FROM.replace(/\.json$/, '.graded.json') : `${OUT}/${raw.tag}.graded.json`,
    JSON.stringify({ R, coverage: cov, classes: CLASSES.map(([n]) => n), byPart, total: tot,
      flyable: fly.length, edgeShare, standShare, bells: bells.length, fails }, null, 1));
  console.log('');
  for (const f of fails) console.log(`  FAIL  ${f}`);
  console.log(fails.length ? `FAIL — skylarkfield: ${fails.length} bar(s) missed`
    : 'PASS — skylarkfield: a big and a mid-size meal in frame from every part of the kingdom, the balloons docked at the edge, a cloud ground in a bright day, and the Great Bell is the hero');
  return fails.length ? 1 : 0;
}
