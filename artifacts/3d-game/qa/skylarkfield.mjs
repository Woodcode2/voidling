// SKYLARK FIELD — IS THERE SOMETHING TO EAT EVERYWHERE, OR ONLY IN THE MIDDLE?
//
// The owner, 2026-09-24: "Skylark needs work. Item placement is like all just
// in the middle." He was reading the island the way a child crosses it, and no
// probe in this directory measured that. qa/rng.mjs asks whether each district
// got what it asked for — and every district did, which is exactly why it could
// not see this: the launch field asked for its envelopes and got them, and the
// three runway arms, the perimeter and the rough asked for grass and got grass.
// Asked-against-placed is green on a level whose food is all in one place.
//
// So this reads the LIVE page's edibles (after the boot sweep, the world a
// child plays) and lays a grid over the island's own coast, loaded through
// vite's SSR transform as qa/skyland.mjs does, so the regions and the strips
// are the game's own functions and not a copy of them. For every land cell it
// asks: is there something to eat near here, at each size?
//
//   node qa/skylarkfield.mjs <port> [--out=dir] [--tag=name] [--world=skylark]
//   node qa/skylarkfield.mjs --from=<out>/<tag>.json      re-grade a saved run
//
// --world=maple photographs Maple's spawn with the same camera and measures the
// frame the same way — the daylight reference the sunrise is compared against.
// It skips the coverage bars, which are Skylark's.
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
// THE CELL IS 60 WORLD UNITS (3 scene units). The live runway and the launch
// circle are not graded: the strip is the level's sightline and is kept clear
// by design, and the circle is the whale's authored precinct.
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
// build: every one is on grass, clear of 03/21 and the perimeter, so the same
// four frames can be shot on any layout.
const VIEWS = WORLD === 'skylark' ? [
  ['spawn', null],                // the arrivals hardstanding — the first frame
  ['northarm', [6000, 3000]],     // between the 03 and 15 thresholds, inside the track
  ['westshoulder', [3500, 6500]], // west of 03/21, north of the 21 threshold
  ['southwestarm', [3200, 7700]], // the 21 arm, beside the live strip
] : [['spawn', null]];

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
        stage: u.balloon ? u.balloon.stage : -1, kind: u.kind || '', qk: u.qk || '' };
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
    // mean Rec.709 luma over the frame, mean HSV saturation over the frame,
    // and the same over GRASS — the pixels whose largest channel is green —
    // which is the ground this whole item is about
    let n = 0, Y = 0, S = 0, gn = 0, gS = 0, gY = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      const r = img.data[i] / 255, g = img.data[i + 1] / 255, bl = img.data[i + 2] / 255;
      const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), s = mx > 0 ? (mx - mn) / mx : 0;
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      n++; Y += y; S += s;
      if (g >= r && g >= bl && mx > 0.08) { gn++; gS += s; gY += y; }
    }
    const f = { view: name, luma: Y / n, sat: S / n, grassShare: gn / n, grassSat: gn ? gS / gn : 0, grassLuma: gn ? gY / gn : 0 };
    frames.push(f);
    console.log(`  frame ${name.padEnd(13)} luma ${f.luma.toFixed(3)}  sat ${f.sat.toFixed(3)}  grass ${(f.grassShare * 100).toFixed(1)}% of frame, sat ${f.grassSat.toFixed(3)}, luma ${f.grassLuma.toFixed(3)}`);
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
   *  own; the strips and the track are split off the rough by distance,
   *  because the owner's complaint was the arms and the ring, and those are
   *  lines, not polygons. The disused slabs count as shoulder. */
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
    ['balloon', (q) => q.stage >= 0 && q.stage <= 3],
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
  console.log(`\nSKYLARK FIELD — ${raw.tag}, SEED ${raw.seed}, ${raw.props.length} static edibles, ${raw.movers ?? '?'} movers`);
  console.log(`\nCOVERAGE — share of ${CELL}-unit land cells with an edible of that class within ${R} world units`);
  console.log(`  (${R} = the equal-area radius of the settled r-4 play frame: ${fp.across.toFixed(0)} across x ${fp.along.toFixed(0)} along, ${(fp.area / 1e6).toFixed(3)}M sq units;`);
  console.log('   the live runway and the launch circle are kept clear by design and not graded)');
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
  console.log('\nEDIBLES BY PART — size class by eat radius (small <1, mid 1-3, big >=3), and the envelopes by stage');
  console.log(`  ${'part'.padEnd(12)} ${'all'.padStart(5)} ${'small'.padStart(6)} ${'mid'.padStart(5)} ${'big'.padStart(5)}   ${STAGES.map((s2) => s2.padStart(9)).join('')}`);
  const tot = { all: 0, small: 0, mid: 0, big: 0, st: [0, 0, 0, 0, 0] };
  for (const k of [...PARTS, 'runway', 'circle', 'off']) {
    const r = byPart[k]; if (!r) continue;
    tot.all += r.all; tot.small += r.small; tot.mid += r.mid; tot.big += r.big; r.st.forEach((v, i) => { tot.st[i] += v; });
    console.log(`  ${k.padEnd(12)} ${String(r.all).padStart(5)} ${String(r.small).padStart(6)} ${String(r.mid).padStart(5)} ${String(r.big).padStart(5)}   ${r.st.map((v) => String(v).padStart(9)).join('')}`);
  }
  console.log(`  ${'TOTAL'.padEnd(12)} ${String(tot.all).padStart(5)} ${String(tot.small).padStart(6)} ${String(tot.mid).padStart(5)} ${String(tot.big).padStart(5)}   ${tot.st.map((v) => String(v).padStart(9)).join('')}`);
  const nb = tot.st[0] + tot.st[1] + tot.st[2] + tot.st[3];
  const ratio = tot.st.slice(0, 4).map((v) => (14 * v / Math.max(1, nb)).toFixed(1)).join(' : ');
  console.log(`  stage ratio bagged : spilled : cold : standing, per 14 = ${ratio}  (${nb} envelopes)`);
  for (const f of raw.frames) console.log(`  frame ${f.view.padEnd(13)} luma ${f.luma.toFixed(3)}  sat ${f.sat.toFixed(3)}  grass ${(f.grassShare * 100).toFixed(1)}% of frame, sat ${f.grassSat.toFixed(3)}, luma ${f.grassLuma.toFixed(3)}`);

  // ══ THE BARS ═══════════════════════════════════════════════════════════
  // Set from the complaint, on the build that has it, each with its reason:
  //   A. A BALLOON IN FRAME FROM EVERYWHERE. Every graded part has an
  //      envelope within the frame radius from at least 60% of its cells, and
  //      the island from 80%. 60 is "most of it", with room left for the track
  //      and the coast, which are ground a crew does not rig on.
  //   B. SOMETHING MID-SIZED IN REACH EVERYWHERE — a bag, a trailer, a car
  //      (eat radius 1-3) — at the same radius, 50% per part and 70% for the
  //      island. The owner's "every size" is the whole ladder: an r-2 void
  //      cannot eat an envelope and has outgrown a tussock. Lower than A
  //      because mid-size things are furniture, and furniture clusters.
  //   C. THE FIELD READS AS A BALLOON MEET: standing envelopes are at least a
  //      quarter of all envelopes on the island.
  const fails = [];
  const pct = (k, i) => 100 * cov[k].hit[i] / Math.max(1, cov[k].cells);
  const bi = CLASSES.findIndex(([n]) => n === 'balloon'), mi = CLASSES.findIndex(([n]) => n === 'mid 1-3');
  for (const k of PARTS) {
    if (!cov[k].cells) continue;
    if (pct(k, bi) < 60) fails.push(`A ${k}: an envelope within ${R} of ${pct(k, bi).toFixed(1)}% of its cells (bar 60)`);
    if (pct(k, mi) < 50) fails.push(`B ${k}: a mid-size edible within ${R} of ${pct(k, mi).toFixed(1)}% of its cells (bar 50)`);
  }
  if (pct('ALL', bi) < 80) fails.push(`A island: an envelope within ${R} of ${pct('ALL', bi).toFixed(1)}% of cells (bar 80)`);
  if (pct('ALL', mi) < 70) fails.push(`B island: a mid-size edible within ${R} of ${pct('ALL', mi).toFixed(1)}% of cells (bar 70)`);
  const standShare = 100 * tot.st[3] / Math.max(1, nb);
  if (standShare < 25) fails.push(`C standing envelopes are ${standShare.toFixed(1)}% of ${nb} (bar 25)`);

  writeFileSync(FROM ? FROM.replace(/\.json$/, '.graded.json') : `${OUT}/${raw.tag}.graded.json`,
    JSON.stringify({ R, coverage: cov, classes: CLASSES.map(([n]) => n), byPart, total: tot, standShare, fails }, null, 1));
  console.log('');
  for (const f of fails) console.log(`  FAIL  ${f}`);
  console.log(fails.length ? `FAIL — skylarkfield: ${fails.length} bar(s) missed`
    : 'PASS — skylarkfield: an envelope and a mid-size meal in frame from every part of the island, and a quarter of the envelopes standing');
  return fails.length ? 1 : 0;
}
