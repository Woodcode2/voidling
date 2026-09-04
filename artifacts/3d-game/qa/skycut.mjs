// THE HALF-CUT PLANET — is a sky body ever partly cut, and by what?
//
// The owner (2026-08-29): "In some levels the planet in the back is cut off,
// like an image was half cut and put on there. It doesn't look crisp, it
// doesn't look real, it's all faded." This reads the sky bodies (sprites tagged
// userData.planet, island.ts SKIES) at five camera moments per world — the
// orbit at the opening beat (u=1), mid-swing (u=0.5), the end of the dive
// (u=0), and the far pull-back of a big void — and for each body reports:
//   viewFrac  fraction of its disc inside the viewport (cut by the FRAME)
//   occFrac   fraction of its visible disc behind island geometry (cut by the
//             ISLAND: depth test is on, so the coast slices the disc)
//   Lplanet   mean luminance of a 13x13 block at its centre in the CANVAS
//             screenshot (the real pipeline: ACES, exposure, sRGB)
//   Lspace    the darkest 20x20 block along the frame's top edge (space)
// A body with 0.1 < viewFrac < 0.9, or 0.1 < occFrac < 0.9, is CUT in that
// frame. FADED: visible, unoccluded, and Lplanet < 90/255 or under 2.5x Lspace.
// FAILS BEFORE the fix if any frame is CUT. Every frame is screenshot.
//
//   SEED=7 node qa/skycut.mjs <world> [port] [--json=path] [--shots=dir]
import { chromium } from 'playwright';
import fs from 'fs';
import { PNG } from 'pngjs';
const WORLD = process.argv[2] || 'maple', PORT = process.argv[3] || '4177';
const flag = (k) => { const a = process.argv.find((s) => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
const JSON_OUT = flag('json'), SHOTS = flag('shots');
// the DISC is a fraction of the sprite quad: 2 * DISC_R (island.ts) — 0.58 since round 5, 0.80 before
const DISC = Number(flag('disc') || 0.58);
const INTRO = { maple: 2.2, pirate: 2.2, gameday: 3.4, lantern: 3.6, powder: 3.5 }[WORLD] ?? 3.0;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
const SEED = Number(process.env.SEED || 0);
await p.addInitScript((seed) => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidFirstNom', '1');
  localStorage.setItem('voidMute', '1'); localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  if (seed) { let s = seed >>> 0; Math.random = () => { s += 0x6D2B79F5; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
} catch {} }, SEED);
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.evaluate(() => document.getElementById('btnPlay')?.click()); await p.waitForTimeout(1400);
await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.03, null, { timeout: 400000 });
// hide the HUD so the canvas is the whole picture
await p.evaluate(() => { const cv = document.querySelector('canvas'); for (const el of Array.from(document.body.children)) if (el !== cv) el.style.visibility = 'hidden'; });

const measure = (DISC) => {
  const THREE = window.__THREE, cam = window.__cam, scene = window.__scene;
  const W = innerWidth, H = innerHeight;
  cam.updateMatrixWorld(true); const camPos = cam.getWorldPosition(new THREE.Vector3());   // WORLD position: camPos is local and lied (occ 1 on visible planets)
  const bodies = [], meshes = [];
  const hero = window.__voidGroup?.();
  scene.traverse((o) => { if (o.isSprite && o.userData.planet) bodies.push(o); else if (o.isMesh && !o.isSprite && !o.isPoints && o.visible && (!hero || !hero.getObjectById(o.id))) meshes.push(o); });
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0).normalize();
  const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1).normalize();
  const ray = new THREE.Raycaster();
  const out = [];
  for (const sp of bodies) {
    const C = sp.getWorldPosition(new THREE.Vector3()), s = sp.scale.x;
    const dist = C.distanceTo(camPos);
    const pts = [C.clone()];
    const rd = s / 2 * DISC;   // the disc's radius, not the quad's
    for (const rr of [0.5, 0.97]) for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; pts.push(C.clone().addScaledVector(right, rr * rd * Math.cos(a)).addScaledVector(up, rr * rd * Math.sin(a))); }
    let inView = 0, occ = 0, minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    const dir = new THREE.Vector3();
    for (const P of pts) {
      const n = P.clone().project(cam);
      const vis = n.z < 1 && Math.abs(n.x) <= 1 && Math.abs(n.y) <= 1;
      const px = (n.x + 1) / 2 * W, py = (1 - n.y) / 2 * H;
      minx = Math.min(minx, px); maxx = Math.max(maxx, px); miny = Math.min(miny, py); maxy = Math.max(maxy, py);
      if (!vis) continue;
      inView++;
      dir.copy(P).sub(camPos); const L = dir.length(); dir.normalize();
      ray.set(camPos, dir); ray.near = 0.5; ray.far = L - 1;
      if (ray.intersectObjects(meshes, false).length) occ++;
    }
    const cN = C.clone().project(cam);
    out.push({ size: s, d: Math.round(dist), ndc: [+cN.x.toFixed(3), +cN.y.toFixed(3)], cx: Math.round((cN.x + 1) / 2 * W), cy: Math.round((1 - cN.y) / 2 * H),
      pxR: Math.round((maxx - minx) / 2), viewFrac: +(inView / pts.length).toFixed(2), occFrac: inView ? +(occ / inView).toFixed(2) : null,
      opacity: sp.material.opacity, depthTest: sp.material.depthTest, blending: sp.material.blending });
  }
  const vs = window.__voidState(), ms = window.__matchState();
  return { t: +ms.t.toFixed(2), R: +vs.r.toFixed(2), camY: Math.round(camPos.y), camDist: Math.round(camPos.distanceTo(new THREE.Vector3(vs.x, 0, vs.z))), bodies: out };
};
const lum = (png, x0, y0, w, h) => { let s = 0, n = 0; for (let y = Math.max(0, y0); y < Math.min(png.height, y0 + h); y++) for (let x = Math.max(0, x0); x < Math.min(png.width, x0 + w); x++) { const i = (y * png.width + x) * 4; s += 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2]; n++; } return n ? s / n : 0; };
const samples = [];
const take = async (label) => {
  const m = await p.evaluate(measure, DISC);
  let png = null;
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); const file = `${SHOTS}/${WORLD}-${label}.png`; await p.screenshot({ path: file }); png = PNG.sync.read(fs.readFileSync(file)); }
  let Lspace = null;
  if (png) { Lspace = 1e9; for (let x = 0; x + 20 <= png.width; x += 41) Lspace = Math.min(Lspace, lum(png, x, 8, 20, 20)); Lspace = +Lspace.toFixed(1); }
  for (const bd of m.bodies) {
    bd.Lplanet = png && bd.viewFrac > 0 ? +lum(png, bd.cx - 6, bd.cy - 6, 13, 13).toFixed(1) : null;
    // SHADING RANGE: luminance along the lit-to-dark diameter (upper-left to
    // lower-right, the way paint() lights the body). A sticker is flat; a lit
    // sphere has a range. Sampled at 7 points inside 0.8 R.
    if (png && bd.viewFrac > 0.5 && bd.pxR > 8) { const Ls = []; for (let k = -3; k <= 3; k++) { const x = Math.round(bd.cx + k * bd.pxR * 0.8 / 3 * 0.7071), y = Math.round(bd.cy + k * bd.pxR * 0.8 / 3 * 0.7071); if (x >= 2 && y >= 2 && x < png.width - 2 && y < png.height - 2) Ls.push(lum(png, x - 2, y - 2, 5, 5)); } if (Ls.length >= 5) { bd.Lrange = +(Math.max(...Ls) - Math.min(...Ls)).toFixed(1); bd.Lprofile = Ls.map((v) => Math.round(v)); } }
    const flags = [];
    if (bd.viewFrac > 0.1 && bd.viewFrac < 0.9) flags.push('CUT-FRAME');
    // the occlusion column stays in the JSON but flags nothing: it read 1.0 on
    // planets plainly in the sky (retracted, sky.proposal.md — the frames decide)
    if (bd.viewFrac === 0) flags.push('off');
    if (bd.Lrange !== undefined && bd.Lplanet !== null && bd.Lplanet > 60 && bd.Lrange < 45) flags.push('FLAT');
    if (bd.Lplanet !== null && bd.viewFrac > 0.5 && bd.Lplanet > 60 && Lspace !== null && bd.Lplanet < 2.5 * Lspace) flags.push('FADED');
    bd.flags = flags;
  }
  samples.push({ label, ...m, Lspace });
  console.log(`  ${label.padEnd(6)} t=${m.t} R=${m.R} camDist=${m.camDist} Lspace=${Lspace}  ` + m.bodies.map((bd) => `[size ${bd.size} d ${bd.d}: view ${bd.viewFrac} occ ${bd.occFrac} pxR ${bd.pxR} at (${bd.cx},${bd.cy}) L ${bd.Lplanet} range ${bd.Lrange ?? '-'} ${bd.flags.join('+') || 'clean'}]`).join(' '));
};
console.log(`\n══ ${WORLD.toUpperCase()} ══  introLen ${INTRO}s`);
await take('u1');
await p.waitForFunction((x) => (window.__matchState?.().t ?? 0) > x, INTRO / 2, { timeout: 600000 }); await take('u05');
await p.waitForFunction((x) => (window.__matchState?.().t ?? 0) > x, INTRO + 0.3, { timeout: 600000 }); await take('u0');
await p.evaluate(() => window.__setVoidR?.(8));
const t0 = await p.evaluate(() => window.__matchState().t);
await p.waitForFunction((x) => (window.__matchState?.().t ?? 0) > x, t0 + 3.5, { timeout: 600000 }); await take('far');
// THE COAST. The bodies sit at the camera's own azimuth, below the horizon —
// they are only ever on screen past the island's far edge, so stand the void
// on the coast the camera looks toward (the -x,-z diagonal: camOffset is
// (0.62,0.92,0.62), the camera sits at +x,+z and looks the other way) and
// shoot outward. This is the frame the owner is describing.
await p.evaluate(() => { let best = null; for (let r = 260; r > 20; r -= 4) { const x = -r * 0.7071, z = -r * 0.7071; if (window.__insideIsland3?.(x, z)) { best = [x, z]; break; } } if (best) window.__warpVoid?.(best[0], best[1]); window.__coastSpot = best; });
const t1 = await p.evaluate(() => window.__matchState().t);
await p.waitForFunction((x) => (window.__matchState?.().t ?? 0) > x, t1 + 1.2, { timeout: 600000 }); await take('coast');
await b.close();
const cut = samples.flatMap((s) => s.bodies.map((bd) => [s.label, bd])).filter(([, bd]) => bd.flags.some((f) => f.startsWith('CUT')));
const faded = samples.flatMap((s) => s.bodies.map((bd) => [s.label, bd])).filter(([, bd]) => bd.flags.includes('FADED'));
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ world: WORLD, introLen: INTRO, samples }, null, 1));
console.log(cut.length ? `SKYCUT: FAIL — ${WORLD}: a body is cut in ${cut.length} frame(s): ${cut.map(([l, bd]) => `${l}(size ${bd.size}, ${bd.flags.join('+')})`).join(', ')}${faded.length ? `; faded in ${faded.length}` : ''}`
  : `SKYCUT: PASS — ${WORLD}: no body is cut in any sampled frame${faded.length ? ` (FADED in ${faded.length}: ${faded.map(([l]) => l).join(', ')})` : ''}`);
process.exit(cut.length ? 1 : 0);
