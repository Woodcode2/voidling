// PURPOSE — what is every person in this town actually DOING? (brief §2A, the harder half)
//
// The owner: "Every chat bubble, every person moving, there's got to be a
// purpose behind that." Today `addWanderer` (life.ts:2557) gives each townsperson
// a home point, a tether and `ang += rand(-1,1) * dt * 3` — a random walk that
// turns back when it strays too far. Nobody is going anywhere. This measures
// that, so the fix has a number to beat and the claim is not an opinion.
//
//   SEED=7 node qa/purpose.mjs [port] [worlds...]        (add --secs=N, default 45)
//
// Per world it samples every mover's world position on the page's own frames
// (rAF, so no sampling clock of ours) for N MATCH seconds and reports:
//
//   drift      net displacement / path length, per person, median.  A courier
//              walking a block is ~0.9; a random walk on a tether is ~0.1.
//   home       fraction of the sample each person spends inside its own tether
//              of its spawn point — a person who never leaves the spot it was
//              born on is furniture that jiggles.
//   turn       mean |heading change| per second, degrees. A walk to a door is
//              near 0 between corners; a random walk is 60-120.
//   journeys   the number the brief is about: a person who TRAVELS — gets 15
//              units from where it was, then settles inside 3 units of the new
//              place for 1.5 seconds. It needs no prop tagging (userData.qk is
//              carried by fewer than 2% of props, and by none at all on Pirate
//              Bay), so it measures errand behaviour rather than the accident of
//              standing next to a stall. RETRACTED: an earlier version counted
//              "arrivals" as proximity-plus-dwell near a tagged prop, which read
//              254 on Lantern Night — where 83% of people never leave their
//              birthplace and the market is simply dense with stalls.
//   still      fraction of people who never moved more than 2u all sample.
//
// It also draws the paths: qa/out/purpose/<world>_paths.png, every person's
// trail over the sample on a top-down plan, so "screensaver" is a picture.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const A = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const F = process.argv.slice(2).filter((a) => a.startsWith('--'));
const PORT = A[0] || '4177';
const WORLDS = A.slice(1).length ? A.slice(1) : ['maple', 'pirate', 'gameday', 'lantern', 'powder'];
const SECS = Number((F.find((f) => f.startsWith('--secs=')) || '--secs=45').slice(7));
const SEED = process.env.SEED ? Number(process.env.SEED) : null;
const TAG = (F.find((f) => f.startsWith('--tag=')) || '--tag=before').slice(6);
const OUT = 'qa/out/purpose';
mkdirSync(OUT, { recursive: true });

const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);

let fails = 0;
for (const WORLD of WORLDS) {
  console.log(`== ${WORLD} (${SECS} match-seconds, tag ${TAG})`);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript((seed) => {
    try { localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder'); } catch { }
    if (seed !== null) { let s = seed >>> 0; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  }, SEED);
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.getElementById('btnPlay')?.click());
  await p.waitForTimeout(1200);
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), WORLD);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.3, null, { timeout: 400000 });

  // THE SAMPLER RUNS IN THE PAGE, ON THE PAGE'S OWN FRAMES. Sampling from this
  // side would add a round trip per frame and would sample wall time, not the
  // match clock the crowd actually moves on.
  const data = await p.evaluate(async (secs) => {
    const people = [];
    window.__scene.traverse((o) => {
      if (!o.userData || !o.userData.mover) return;
      if (o.userData.qk === 'car') return;           // vehicles are on rails by design
      if (!o.visible || !o.parent) return;
      people.push({ o, x0: o.position.x, z0: o.position.z, path: 0, px: o.position.x, pz: o.position.z,
        home: 0, n: 0, ang: null, turn: 0, trail: [], vmin: Infinity });
    });
    // A JOURNEY needs no map of the town: leave, arrive, stay. Each person
    // carries the last place it settled; when it gets 15 units from that anchor
    // and then holds still (inside 3 units) for 1.5 s, that is one journey and
    // the anchor moves. Nothing here depends on how a prop is tagged.
    const GO = 15, SETTLE = 3, HOLD = 1.5;
    const t0 = window.__matchState().t;
    let last = t0, journeys = 0;
    for (const q of people) { q.ax = q.x0; q.az = q.z0; q.away = false; q.sx = q.x0; q.sz = q.z0; q.hold = 0; }
    await new Promise((res) => {
      const tick = () => {
        const t = window.__matchState().t;
        const dt = t - last; last = t;
        for (const q of people) {
          if (!q.o.parent || !q.o.visible) continue;
          const x = q.o.position.x, z = q.o.position.z;
          const step = Math.hypot(x - q.px, z - q.pz);
          if (step > 0.0005) {
            q.path += step;
            const a = Math.atan2(z - q.pz, x - q.px);
            if (q.ang !== null) { let d = Math.abs(a - q.ang); if (d > Math.PI) d = 2 * Math.PI - d; q.turn += d; }
            q.ang = a;
          }
          q.px = x; q.pz = z;
          // HOW CLOSE DID THE VOID GET? The errand is what a person does when
          // the void is NOT near — flee, the panic contagion and the guest
          // branch all outrank it by design — so a person who was hunted
          // during the sample is not evidence about the errand. Recorded here,
          // used to split the medians below.
          const vs = window.__voidState();
          const vd = Math.hypot(x - vs.x, z - vs.z) - vs.r;
          if (vd < q.vmin) q.vmin = vd;
          if (Math.hypot(x - q.x0, z - q.z0) < 6) q.home++;
          q.n++;
          if (q.trail.length < 400 && q.n % 3 === 0) q.trail.push([Math.round(x * 10) / 10, Math.round(z * 10) / 10]);
          // A JOURNEY: away from the last anchor by GO, then still for HOLD
          if (!q.away) { if (Math.hypot(x - q.ax, z - q.az) >= GO) { q.away = true; q.sx = x; q.sz = z; q.hold = 0; } }
          else {
            if (Math.hypot(x - q.sx, z - q.sz) <= SETTLE) {
              q.hold += dt;
              if (q.hold >= HOLD) { journeys++; q.trips = (q.trips || 0) + 1; q.ax = q.sx; q.az = q.sz; q.away = false; q.hold = 0; }
            } else { q.sx = x; q.sz = z; q.hold = 0; }
          }
        }
        if (window.__matchState().t - t0 >= secs) res(); else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return {
      secs: window.__matchState().t - t0, journeys,
      travellers: people.filter((q) => (q.trips || 0) > 0).length,
      people: people.map((q) => ({
        path: +q.path.toFixed(2),
        net: +Math.hypot(q.px - q.x0, q.pz - q.z0).toFixed(2),
        home: q.n ? +(q.home / q.n).toFixed(3) : 1,
        turnPerS: q.n ? +(q.turn * 180 / Math.PI / Math.max(0.01, secs)).toFixed(1) : 0,
        trips: q.trips || 0, vmin: +q.vmin.toFixed(1), trail: q.trail,
      })),
    };
  }, SECS);

  const moved = data.people.filter((q) => q.path > 0.2);
  // the drift and turn medians are read off the people the void left alone:
  // 45 units is the flee radius (fear 16-18) plus the contagion ring (25) plus
  // the width of the panic wave. Journeys and the traveller share count the
  // WHOLE crowd — being chased does not stop you having somewhere to be.
  const calm = moved.filter((q) => q.vmin > 45);
  const drift = calm.map((q) => (q.path > 0 ? q.net / q.path : 0));
  const rec = {
    world: WORLD, tag: TAG, seed: SEED, sampled: +data.secs.toFixed(1), people: data.people.length,
    moving: moved.length, still: +(1 - moved.length / Math.max(1, data.people.length)).toFixed(3),
    driftMedian: +med(drift).toFixed(3), driftP90: +[...drift].sort((a, c) => a - c)[Math.floor(0.9 * (drift.length - 1))]?.toFixed(3),
    homeMedian: +med(moved.map((q) => q.home)).toFixed(3),
    turnMedian: +med(calm.map((q) => q.turnPerS)).toFixed(1),
    calmPeople: calm.length, huntedPct: +(1 - calm.length / Math.max(1, moved.length)).toFixed(2),
    journeys: data.journeys, travellers: data.travellers,
    travellerPct: +(data.travellers / Math.max(1, moved.length)).toFixed(3),
  };
  console.log(`  ${data.people.length} people, ${moved.length} moving  ·  drift median ${rec.driftMedian} (p90 ${rec.driftP90})  ·  ${(rec.homeMedian * 100).toFixed(0)}% of the sample within 6u of where they were born  ·  turning ${rec.turnMedian}°/s (of the ${rec.calmPeople} the void never came near; ${(rec.huntedPct * 100).toFixed(0)}% were hunted)  ·  ${data.journeys} journey(s) by ${data.travellers} of ${moved.length} people (${(rec.travellerPct * 100).toFixed(0)}%)`);

  // THE PICTURE. Every trail, on a top-down plan, so the walk is visible.
  const S = 900, R = 260;   // world units across the frame
  const img = new PNG({ width: S, height: S });
  for (let i = 0; i < img.data.length; i += 4) { img.data[i] = 14; img.data[i + 1] = 12; img.data[i + 2] = 22; img.data[i + 3] = 255; }
  const put = (wx, wz, r, g, bl) => { const x = Math.round((wx / R + 1) * S / 2), y = Math.round((wz / R + 1) * S / 2); if (x < 0 || y < 0 || x >= S || y >= S) return; const i = (y * S + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = bl; };
  data.people.forEach((q, i) => {
    const hue = (i * 37) % 360, c = [(Math.cos(hue / 57.3) * 90 + 150) | 0, (Math.cos((hue - 120) / 57.3) * 90 + 150) | 0, (Math.cos((hue + 120) / 57.3) * 90 + 150) | 0];
    for (const [x, z] of q.trail) put(x, z, c[0], c[1], c[2]);
    if (q.trail.length) { const [sx, sz] = q.trail[0]; for (let d = -1; d <= 1; d++) { put(sx + d * 0.6, sz, 255, 255, 255); put(sx, sz + d * 0.6, 255, 255, 255); } }
  });
  writeFileSync(`${OUT}/${WORLD}_paths_${TAG}.png`, PNG.sync.write(img));
  writeFileSync(`${OUT}/${WORLD}_${TAG}.json`, JSON.stringify(rec, null, 1));
  await b.close();
  // THE BAR, pre-registered before the fix exists: in a 30-second sample at
  // least a third of the moving people should complete a journey — leave,
  // arrive, stay — and the median drift should read as travel (0.30+) rather
  // than as jitter. Both are properties of movement itself, not of tagging.
  if (rec.travellerPct < 0.33 || rec.driftMedian < 0.30) {
    fails++;
    console.log(`  FAIL-LINE ${WORLD}: ${(rec.travellerPct * 100).toFixed(0)}% of moving people completed a journey, drift median ${rec.driftMedian} — nobody is going anywhere`);
  }
}
if (fails) process.exitCode = 1;
console.log(fails ? `FAIL — purpose: ${fails} world(s) where the crowd has no destination` : `PASS — purpose: every world's crowd arrives somewhere`);
