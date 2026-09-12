// ── WHAT FORM DOES THE MENU SHOW, AND WHO EARNED IT? ────────────────────────
//
// docs/DIORAMA-BRIEF.md §11.2 left one question open: the diorama needs the
// void BIGGER (a block-filling frame puts a form-safe void at ~30px) and the
// game couples size to form, so making him big changes the creature.
//
// Before touching that coupling, this establishes what the coupling does TODAY,
// which nobody has ever measured:
//
//   1. menuVoidR(dist) = clamp(dist/18, 1.8, 3.8) and FORM_MIN = [0, 1.6, 2.5,
//      3.6, …]. Those two lines together mean THE MENU'S CREATURE IS A FUNCTION
//      OF CAMERA DISTANCE. A world staged closer than 64.8 units shows one
//      creature and a world staged further shows another. This prints it.
//
//   2. The per-frame evolution check (prototype3d.ts:12578) is NOT gated on
//      menuMode or on `started`. curStage starts at 0, the menu sets radius to
//      2.8-3.8, so on the first menu frame `ns > curStage` is true and
//      `ns > bestStage` is true — which is the ceremony branch: audio.evolve(),
//      camPunch(5), camDist *= 1.07, fx.ring, buzz(45), track('evolve'),
//      townReacts. On the MENU. __stages().ceremonies counts it.
//
//   3. His on-screen height in px, by the engine's own pixel-radius formula,
//      so §11.2's arithmetic has six real samples under it instead of one.
//
//   node qa/_menuform.mjs [port]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLDS = ['maple', 'pirate', 'gameday', 'lantern', 'powder', 'skylark'];
// prototype3d.ts:4755 verbatim. The first run of this probe invented a 'SPECK'
// at index 0 and printed every form name one rung too low — the FAIL verdicts
// were right, the creature names under them were not.
const FORMS = ['VOIDLING', 'MUNCHKIN', 'GOBBLIN', 'CHOMPOSAURUS', 'COLOSSUS', 'WORLD ENDER', 'VOID TITAN'];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [];
for (const w of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => console.log('  [pageerror] ' + e.message.split('\n')[0]));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear();
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark');
  } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
  // four seconds of menu — long enough that any first-frame ceremony has fired
  // and the camera's own 1.07x distance pop has eased home
  await p.waitForTimeout(4000);
  const r = await p.evaluate(() => {
    // HIS HEIGHT IN PIXELS, projected through the live camera off a real Box3 —
    // not r x some factor. See qa/_diovoid.mjs: a scale factor read off an
    // assumed unit mesh is how five runs of that probe printed a tautology.
    const T = window.__THREE, cam = window.__cam, g = window.__voidGroup();
    // HOW BIG A SPHERE IS ON SCREEN IS AN ANGLE, NOT A BOUNDING BOX.
    //
    // The first two runs of this probe projected the eight corners of his
    // Box3 and reported the spread. That is wrong for a ball, and wrong by a
    // lot: a cube of edge 2R viewed down a diagonal projects to a silhouette
    // up to sqrt(3) wider than the ball inscribed in it, and the near corners
    // sit R*sqrt(3) closer to the camera than the centre, so perspective
    // widens it again. It printed 289 px for a body that is 180.
    //
    // void3d.ts:2118 already computes the right thing, for the LOD ladder:
    //   pxR = (innerHeight / (2 * camD * tan(fov/2))) * dispR
    // Same formula here, against the body's own WORLD scale rather than
    // against voidling.radius — dispR is a spring, so the two differ while he
    // is growing, and bob.scale is the only place the truth lives.
    let bob = null, bodyMat = null;
    g.traverse((o) => { const q = o.geometry && o.geometry.parameters;
      if (q && q.radius === 1 && q.widthSegments === 96 && q.heightSegments === 72) {
        bob = o.parent; bodyMat = o.material; } });
    if (!bob) return { error: 'body sphere not found' };
    bob.updateWorldMatrix(true, false);
    const sc = new T.Vector3(), ctr = new T.Vector3(), q0 = new T.Quaternion();
    bob.matrixWorld.decompose(ctr, q0, sc);
    const D = ctr.distanceTo(cam.position);
    const k = 932 / (2 * D * Math.tan(cam.fov * Math.PI / 360));
    const ms = window.__menuState(), st = window.__stages();
    // WHAT THE RIG IS WEARING, not what his radius implies. The whole point of
    // the fix is that those two come apart on the menu, so a probe that keeps
    // asking stageFor(r) is asking the question the fix removed.
    return { dist: ms.menuDist, r: ms.voidR, cur: st.cur, best: st.best, cer: st.ceremonies,
      // WHAT HE IS WEARING is the body shader's own uStage uniform — set by
      // setStage() and read by nothing else. No new hook: the uniform IS the
      // dressing, so this cannot drift from what a child sees.
      vstage: bodyMat.uniforms.uStage.value,
      camD: +D.toFixed(1), fov: cam.fov,
      // his world radius, horizontal and vertical: the breathe/squash pair
      wRx: +sc.x.toFixed(2), wRy: +sc.y.toFixed(2),
      pxW: +(2 * sc.x * k).toFixed(1), pxH: +(2 * sc.y * k).toFixed(1) };
  });
  rows.push({ w, ...r });
  await p.close();
}
await b.close();

const FM = [0, 1.6, 2.5, 3.6, 5.5, 8.0, 13.5];
const stageFor = (r) => { let s = 0; for (let i = 0; i < FM.length; i++) if (r >= FM[i]) s = i; return s; };
console.log('\nworld     dist  camD    r   wR    form(from r)  worn  body px(w x h)  ceremonies');
for (const q of rows) console.log(
  `${q.w.padEnd(9)} ${String(q.dist).padStart(4)} ${String(q.camD).padStart(5)} ${String(q.r).padStart(4)} ${String(q.wRy).padStart(4)}  ${(FORMS[stageFor(q.r)] || '?').padEnd(13)} ${String(q.vstage).padStart(3)} ${String(q.pxW).padStart(6)} x ${String(q.pxH).padStart(5)} ${String(q.cer).padStart(11)}`);

const worn = new Set(rows.map((q) => q.vstage));
const implied = new Set(rows.map((q) => stageFor(q.r)));
console.log(`\nA. distinct VISUAL stages WORN across six worlds: ${worn.size} (${[...worn].join(', ')})`);
console.log(`   distinct stages his RADIUS would imply:        ${implied.size} (${[...implied].map((s) => FORMS[s]).join(', ')})`);
console.log(worn.size > 1
  ? 'FAIL — the menu shows a DIFFERENT CREATURE per world, decided by camera distance'
  : 'PASS — one creature on every world');
const cer = rows.filter((q) => q.cer > 0);
console.log(`\nB. worlds firing an evolution ceremony on the menu: ${cer.length} of ${rows.length}`);
console.log(cer.length
  ? 'FAIL — the menu fires the EVOLVED ceremony for a form nobody played for'
  : 'PASS — no ceremony on the menu');
const px = rows.map((q) => q.pxH);
console.log(`\nC. his BODY's on-screen height today: ${Math.min(...px)}-${Math.max(...px)} px of 932`);
console.log('   D. the px-per-world-unit at the menu camera, which is what §11.2 needs:');
for (const q of rows) console.log(
  `      ${q.w.padEnd(9)} ${(q.pxH / (2 * q.wRy)).toFixed(2)} px/unit at camD ${q.camD}`);
