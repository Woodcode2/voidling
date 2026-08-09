// IS THE HERO ACTUALLY PURPLE, AND IS THERE WHITE ON HIS FACE?
//
// The owner, on a screenshot of the live build at "VOIDLING 2m":
//   "After our voids purple faded."
//   "That white smile has to go. The white part I'm not a fan of."
//   "And there's a ring around him."
//
// All three are colour claims, so all three are measurable and none of them
// should be settled by looking.
//
// The first version of this file DID settle it by looking, and got it wrong in
// the way these things are always wrong: it hunted the void by walking out from
// the centre of the frame until the pixels stopped being a grey it had painted
// the world with. The world did not go grey, the match had never been started
// so the camera was still in its wide pre-match framing, the disc was never
// found — and it printed "saturation holds at every size sampled" over ZERO
// rows. A probe that passes on no data is worse than no probe.
//
// So: start the match like a player does, then find the void by PROJECTING its
// known world position through the camera rather than guessing where it landed,
// and take the pixels out of a render target instead of off a WebGL canvas that
// has already been cleared. If the disc cannot be found this exits non-zero.
//
//   saturation   mean HSV S over the inner body disc. "Faded" is a low number.
//   hue          mean hue in degrees, weighted by saturation. Purple is ~270.
//   white px     fraction of body pixels with S < 0.18 and V > 0.80 — bright
//                AND colourless, which is what "looks cheap" measures.
//   ring         mean saturation in a ground annulus outside the silhouette,
//                where a violet hoop would show up against Maple's greens.
//
//   node qa/heroface.mjs [port] [radii]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '4173';
const RADII = (process.argv[3] || '1.25,2.5,6,12').split(',').map(Number);
const OUT = 'qa/out/heroface';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { }
});
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
}));
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1400);
await p.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]')?.click());
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
// START IT. Without a pointer the match sits at 3:00 and the camera never drops
// into its play framing — which is the whole regime being measured.
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  cv.dispatchEvent(new PointerEvent('pointerdown', {
    pointerId: 1, clientX: innerWidth / 2, clientY: innerHeight / 2, bubbles: true }));
});
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2.5, null, { timeout: 400000 });
// ── AND HIDE THE JOYSTICK, WHICH IS THIS PROBE'S OWN THUMB ─────────────────
// The pointerdown above lands at the centre of the screen, the follow camera
// keeps the void at the centre of the screen, and #joy is a 128px ring drawn at
// the touch point. So every frame this probe has ever captured had a hard ring
// sitting exactly on the character — and because the stick only hides on
// pointerup, which a probe never sends, it never went away.
//
// I burned three shader changes hunting that ring inside the void: the rim's
// additive stacking, the rim stop clamp, and the rim colour. It is a DOM
// element. It is not in the scene, so a raycast cannot hit it and readPixels on
// the WebGL buffer cannot see it. The owner diagnosed it from the pictures —
// "I suspect it's like the cursor when you move but you're just idle?" — which
// is exactly what it was.
//
// The input is still held (the camera framing depends on it); only the overlay
// is hidden, so what gets photographed is the game, not the instrument.
await p.addStyleTag({ content: '#joy,#joyNub{display:none !important}' });

const rgb2hsv = (r, g, bl) => {
  r /= 255; g /= 255; bl /= 255;
  const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = 60 * (((g - bl) / d) % 6);
    else if (mx === g) h = 60 * ((bl - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx];
};

console.log('    r    pxR    saturation    hue      white px    ring sat   OLD sat   belly sd  stars/1k px');
const rows = [];
const sample = (forceOld) => p.evaluate((forceOld) => {
    const THREE = window.__THREE, ren = window.__renderer, sc = window.__scene, cam = window.__cam;
    const vs = window.__voidState();
    // where is he, in pixels? Project his centre and derive his on-screen
    // radius the same way the shader does, so the sample is his BODY and not
    // whatever happens to be behind him.
    const wp = new THREE.Vector3(vs.x, vs.r, vs.z);
    const sp = wp.clone().project(cam);
    const dpr = ren.getPixelRatio();
    const W = Math.floor(ren.domElement.width), H = Math.floor(ren.domElement.height);
    const cx = (sp.x * 0.5 + 0.5) * W, cy = (1 - (sp.y * 0.5 + 0.5)) * H;
    const camD = Math.max(1, cam.position.distanceTo(wp));
    const pxR = (window.innerHeight / (2 * camD * Math.tan(cam.fov * Math.PI / 360))) * vs.r * dpr;
    // ── THE CONTROL ────────────────────────────────────────────────────────
    // Proving the number is good is not the same as proving the change caused
    // it. The shader derives its rim stop as clamp(1 - 2/uPxR, 0.62, 0.88), and
    // the OLD code derived it as mix(0.86, 0.50, small) with
    // small = clamp((64 - pxRcss)/40, 0, 1). So the old stop can be reproduced
    // EXACTLY on this same build and this same frame by feeding uPxR the value
    // that solves 1 - 2/uPxR = oldStop. Same geometry, same lighting, same
    // ground, one variable.
    // Patch EVERY material carrying uPxR, not the first one found: the rivals
    // wear the same shader and are in the same scene, so "the first match" was
    // patching a sibling and reporting that the change did nothing.
    // forceOld is either null (leave the shader alone) or a CSS pixel radius to
    // simulate. Simulating matters because the camera frames the hero at a
    // roughly constant size in play, so the regime the owner reported — a void
    // only ~28 CSS px across the radius — cannot be reached just by shrinking
    // him. Feeding uPxR directly reproduces either law at any size.
    const restore = [];
    if (forceOld) {
      const { cssR, law } = forceOld;
      let fake;
      if (law === 'old') {
        const small = Math.min(1, Math.max(0, (64 - cssR) / 40));
        const oldStop = 0.86 + (0.50 - 0.86) * small;
        fake = 2 / Math.max(0.001, 1 - oldStop);
      } else {
        fake = cssR * dpr;                    // the new law, at that size
      }
      sc.traverse((o) => {
        const mt = o.material;
        if (mt && mt.uniforms && mt.uniforms.uPxR) {
          restore.push({ m: mt, v: mt.uniforms.uPxR.value });
          mt.uniforms.uPxR.value = fake;
        }
      });
    }
    // read the frame out of a render target: the drawing buffer itself is not
    // preserved, so drawImage off the canvas comes back blank or stale.
    const rt = new THREE.WebGLRenderTarget(W, H);
    const prev = ren.getRenderTarget();
    ren.setRenderTarget(rt); ren.render(sc, cam);
    const buf = new Uint8Array(W * H * 4);
    ren.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    ren.setRenderTarget(prev); rt.dispose();
    for (const r of restore) r.m.uniforms.uPxR.value = r.v;
    // readRenderTargetPixels is bottom-up
    const at = (x, y) => { const yy = H - 1 - y; const i = ((yy * W) + x) * 4; return [buf[i], buf[i + 1], buf[i + 2]]; };
    const body = [], ring = [];
    const R = Math.max(2, pxR);
    for (let y = Math.round(cy - R); y <= cy + R; y++) {
      for (let x = Math.round(cx - R); x <= cx + R; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const d = Math.hypot(x - cx, y - cy);
        // THE WHOLE DISC, not the inner 72%. An earlier version sampled inside
        // the silhouette to get "the body colour" and thereby excluded the
        // exact annulus the rim law governs — it reported a 2% difference
        // between the old law and the new one and would have talked me out of
        // a fix that is plainly visible. What the owner sees is the whole ball.
        if (d < R * 0.97) body.push(at(x, y));
      }
    }
    // ── CAN YOU SEE STARS IN HIM? ─────────────────────────────────────────
    // The owner: "It was the right purple where you could see stars in him
    // too." The interior galaxy is three refracted star shells, and the specks
    // are sized in OBJECT space — so they shrink with him on screen and there
    // is a size below which they are sub-pixel and simply cannot be seen.
    // Worked out from the shell constants, the outer shell's specks fall under
    // a 1px radius once his on-screen DIAMETER drops below about 55px.
    //
    // Measuring it: the galaxy is high-frequency bright speckle on a smooth
    // body, so it shows up as LOCAL VARIANCE. A body with visible stars has a
    // markedly higher standard deviation of luminance than one without, and
    // counting pixels that are much brighter than their own neighbourhood
    // counts the specks themselves. Sampled in the BELLY, because the `inside`
    // mask puts the galaxy at full strength there and near its floor elsewhere.
    const belly = [];
    const byPos = new Map();
    for (let y = Math.round(cy - R); y <= cy + R; y++) {
      for (let x = Math.round(cx - R); x <= cx + R; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const dx = (x - cx) / R, dy = (y - cy) / R;
        // the pit sits low on the disc; sample the region the shader lights
        if (Math.hypot(dx, dy + 0.30) < 0.52) {
          const px = at(x, y);
          const L = 0.2126 * px[0] + 0.7152 * px[1] + 0.0722 * px[2];
          belly.push(L); byPos.set(`${x},${y}`, L);
        }
      }
    }
    let starN = 0;
    for (const [k, L] of byPos) {
      const [x, y] = k.split(',').map(Number);
      let sum = 0, cnt = 0;
      for (let j = -3; j <= 3; j += 3) for (let i2 = -3; i2 <= 3; i2 += 3) {
        const n = byPos.get(`${x + i2},${y + j}`);
        if (n !== undefined && (i2 || j)) { sum += n; cnt++; }
      }
      if (cnt >= 4 && L > sum / cnt + 18) starN++;
    }
    const bMean = belly.reduce((a, v) => a + v, 0) / Math.max(1, belly.length);
    const bSd = Math.sqrt(belly.reduce((a, v) => a + (v - bMean) ** 2, 0) / Math.max(1, belly.length));
    // the ground just outside him, below the waist where the floor actually is
    for (let a = 0; a < 360; a += 4) {
      for (const k of [1.2, 1.4, 1.6]) {
        const x = Math.round(cx + Math.cos(a * Math.PI / 180) * R * k);
        const y = Math.round(cy + Math.sin(a * Math.PI / 180) * R * k * 0.6 + R * 0.55);
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        ring.push(at(x, y));
      }
    }
    return { cx, cy, pxR, W, H, body, ring, r: vs.r, bSd, starN, bellyN: belly.length };
}, forceOld);

const stats = (m) => {
  if (!m.body.length) return null;
  let sS = 0, nW = 0, sx = 0, sy = 0;
  for (const px of m.body) {
    const [h, s, v] = rgb2hsv(px[0], px[1], px[2]);
    sS += s; sx += Math.cos(h * Math.PI / 180) * s; sy += Math.sin(h * Math.PI / 180) * s;
    if (s < 0.18 && v > 0.80) nW++;
  }
  const n = m.body.length;
  let hueM = Math.atan2(sy, sx) * 180 / Math.PI; if (hueM < 0) hueM += 360;
  let rs = 0;
  for (const px of m.ring) rs += rgb2hsv(px[0], px[1], px[2])[1];
  return { satM: sS / n, hueM, whitePct: nW / n * 100, ringSat: rs / Math.max(1, m.ring.length),
    bSd: m.bSd, starN: m.starN, starDens: m.starN / Math.max(1, m.bellyN) * 1000 };
};
const sampleAt = async (f) => { const m = await sample(f); const s = stats(m); return s ? s.satM : null; };

for (const rr of RADII) {
  await p.evaluate((v) => window.__setVoidR(v), rr);
  // 3.4s, not 2.2 and certainly not 0.9: jumping the radius fires the EVOLUTION
  // BURST, whose torus sits at 1.42x the body. An earlier pass raised this to
  // 2.2s believing that cleared it. IT DOES NOT — at 2.2s the burst is still
  // visible as a hard bright ring, and I then spent three separate code changes
  // hunting a ring that existed only in this file's screenshots. Measured
  // against an ablation probe that waited 2.5s and saw a clean character, the
  // effect needs about three seconds to reach opacity zero. If a future render
  // shows a ring around him, SUSPECT THIS NUMBER BEFORE SUSPECTING THE GAME.
  await p.waitForTimeout(3400);
  const m = await sample(null);
  const old = await sample({ cssR: m.pxR / 2, law: 'old' });   // same frame, old law
  const half = Math.max(60, m.pxR * 2.2);
  await p.screenshot({ path: `${OUT}/r${rr}.png`, clip: {
    x: Math.max(0, m.cx / 2 - half / 2), y: Math.max(0, m.cy / 2 - half / 2),
    width: Math.min(430, half), height: Math.min(932, half) } });
  const s = stats(m), so = stats(old);
  if (!s) { console.log(`  r=${rr}  DISC NOT FOUND (px ${m.cx.toFixed(0)},${m.cy.toFixed(0)})`); continue; }
  rows.push({ rr, pxR: m.pxR, ...s, oldSat: so ? so.satM : null });
  console.log(`${String(rr).padStart(6)} ${m.pxR.toFixed(0).padStart(5)}`
    + `        ${s.satM.toFixed(3)}   ${s.hueM.toFixed(0).padStart(4)}deg`
    + `      ${s.whitePct.toFixed(1).padStart(5)}%      ${s.ringSat.toFixed(3)}`
    + `    ${so ? so.satM.toFixed(3) : '  —  '}`
    + `     ${s.bSd.toFixed(1).padStart(5)}      ${s.starDens.toFixed(1).padStart(5)}`);
}
// ── THE LAW ITSELF, AT THE SIZES THE PLAYER ACTUALLY SEES ──────────────────
// One camera framing, one frame, one variable: the rim law. The owner's
// screenshot was a void about 28 CSS px in radius, which the follow camera
// never produces in this probe, so it is fed to the shader directly.
await p.evaluate(() => window.__setVoidR(6));
await p.waitForTimeout(2200);
console.log('\n══ THE RIM LAW, SWEPT BY ON-SCREEN SIZE (same frame, same everything else)');
console.log('  cssR     OLD sat    NEW sat    delta      old stop  new stop');
const sweep = [];
for (const cssR of [20, 28, 40, 52, 80]) {
  const a = await p.evaluate((c) => {
    const s = Math.min(1, Math.max(0, (64 - c) / 40));
    return 0.86 + (0.50 - 0.86) * s;
  }, cssR);
  const nStop = Math.min(0.88, Math.max(0.62, 1 - 2 / (cssR * 2)));
  const mo = await sampleAt({ cssR, law: 'old' });
  const mn = await sampleAt({ cssR, law: 'new' });
  if (!mo || !mn) continue;
  sweep.push({ cssR, o: mo, n: mn });
  console.log(`${String(cssR).padStart(6)}      ${mo.toFixed(3)}      ${mn.toFixed(3)}`
    + `    ${(mn - mo >= 0 ? '+' : '') + (mn - mo).toFixed(3)}       ${a.toFixed(3)}     ${nStop.toFixed(3)}`);
}

await b.close();

if (!rows.length) {
  console.log('\nFAIL — the void was never found at any radius. Nothing was measured.');
  process.exit(1);
}
console.log('\n══ READ IT LIKE THIS');
console.log('  saturation  bodyMid 0x5f2ab4 is S = 0.77 and bodyRim 0xcb99ff is S = 0.40.');
console.log('              The disc is a blend, so the bar is ~0.45: under that and the');
console.log('              rim has eaten the body, which is the "faded" that was reported.');
console.log('  hue         purple is ~270deg. Drifting past ~285 is lavender/pink.');
console.log('  white px    bright AND colourless. This is what "cheap" measures.');
console.log('  ring sat    Maple\'s ground is green; a violet hoop raises this.');
const faded = rows.filter((x) => x.satM < 0.45);
console.log(faded.length
  ? `\nFADED at r = ${faded.map((x) => x.rr).join(', ')}`
  : '\nPASS — saturation holds at every size sampled.');
console.log(`  frames in ${OUT}/`);
process.exit(faded.length ? 1 : 0);
