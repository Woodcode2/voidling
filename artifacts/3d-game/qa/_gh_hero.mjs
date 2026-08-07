// GRAPHICS-HERO. Shoots the void at five radii in one world, at DPR 3, with the
// quality ladder pinned, and MEASURES the character rather than admiring it.
//
//   node qa/_gh_hero.mjs <world> [port]
//
// Two frames per radius: one with the void group visible, one with it hidden.
// The diff is an exact silhouette mask — no chroma keying, no guessing where
// the ground ends. Everything else (circularity, rim width, eye diameter, face
// contrast, silhouette contrast against the world it is standing on) is
// measured inside that mask.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4242';
const RADII = [1.2, 3, 6, 9, 12];
fs.mkdirSync('qa-out/gh', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1500);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
// TRAP 1, applied hard. At deviceScaleFactor 3 the swiftshader draw is the
// whole frame budget, and every wait in this probe is a wait on FRAMES (the
// match clock is dt-clamped, and camDist is exponentially smoothed at 1.6/s of
// sim time, i.e. ~50 frames). Stubbing the draw makes the sim and the camera
// advance at their proper rate; it is restored for the pixels themselves.
await p.evaluate(() => { window.__realRender = window.__renderer.render.bind(window.__renderer); });
const draw = (on) => p.evaluate((v) => {
  window.__renderer.render = v ? window.__realRender : () => {};
}, on);
await draw(false);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 900000 });

await p.evaluate(() => window.__pinQuality(0));
const q = await p.evaluate(() => window.__quality());
console.log(`# ${WORLD}  quality pinned:`, JSON.stringify(q));

// the lighting rig, for the "one character across four rigs" question
const rig = await p.evaluate(() => {
  const out = { lights: [], fog: null, tone: null, exposure: null, bg: null };
  window.__scene.traverse((o) => {
    if (!o.isLight) return;
    out.lights.push({ type: o.type, color: '#' + o.color.getHexString(),
      intensity: +o.intensity.toFixed(3),
      pos: o.position ? [o.position.x, o.position.y, o.position.z].map((v) => +v.toFixed(1)) : null });
  });
  const f = window.__scene.fog;
  if (f) out.fog = { color: '#' + f.color.getHexString(), near: +f.near?.toFixed(1), far: +f.far?.toFixed(1) };
  out.tone = window.__renderer.toneMapping; out.exposure = window.__renderer.toneMappingExposure;
  out.bg = window.__scene.background?.isColor ? '#' + window.__scene.background.getHexString() : String(window.__scene.background?.type || null);
  return out;
});
console.log('# rig', JSON.stringify(rig));

await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins,#rank,#growBar,#toast,#combo{opacity:0!important}' });
// hold him still and neutral so every radius is the same pose
await p.evaluate(() => window.__setMood('cruise'));

const frames = (n) => p.evaluate((k) => new Promise((res) => {
  let i = 0; const step = () => { if (++i >= k) return res(1); requestAnimationFrame(step); };
  requestAnimationFrame(step);
}), n);

// locate the hero body mesh + its group once
await p.evaluate(() => {
  const vs = window.__voidState();
  let best = null, bd = 1e9;
  window.__scene.traverse((o) => {
    if (!o.isMesh || !o.material?.uniforms?.uAbyss) return;
    o.updateWorldMatrix(true, false);
    const e = o.matrixWorld.elements;
    const d = (e[12] - vs.x) ** 2 + (e[14] - vs.z) ** 2;
    if (d < bd) { bd = d; best = o; }
  });
  window.__heroBody = best;
  window.__heroGroup = best?.parent?.parent || null;
});

const results = [];
for (const R of RADII) {
  await p.evaluate((r) => window.__setVoidR(r), R);
  // WAIT ON THE CAMERA, NOT ON THE CLOCK. camDist is exponentially smoothed at
  // 1.6/s of SIM time and dt is clamped to 0.05, so a settle takes ~50 frames —
  // which under swiftshader is nowhere near a fixed wall-clock number.
  let prev = 0, stable = 0, polls = 0;
  await draw(false);
  while (stable < 4 && polls < 400) {
    await frames(8);
    const d = await p.evaluate(() => {
      const vs = window.__voidState(), c = window.__cam.position;
      return Math.hypot(c.x - vs.x, c.y, c.z - vs.z);
    });
    if (prev && Math.abs(d - prev) / d < 0.002) stable++; else stable = 0;
    prev = d; polls++;
  }
  await draw(true);
  await frames(4);

  const geom = await p.evaluate(() => {
    const vs = window.__voidState();
    const cam = window.__cam;
    const V = window.__cam.position.constructor;
    const g = window.__heroGroup;
    const wp = new V(); g.getWorldPosition(wp);
    const camD = cam.position.distanceTo(wp);
    const pxR = (window.innerHeight / (2 * camD * Math.tan(cam.fov * Math.PI / 360))) * vs.r;
    const sp = wp.clone().project(cam);
    return { r: vs.r, camD: +camD.toFixed(2), pxR: +pxR.toFixed(1),
      sx: (sp.x * 0.5 + 0.5) * window.innerWidth, sy: (-sp.y * 0.5 + 0.5) * window.innerHeight,
      uSmall: +window.__heroBody.material.uniforms.uSmall.value.toFixed(3),
      uStage: +window.__heroBody.material.uniforms.uStage.value.toFixed(2),
      fov: cam.fov, iw: window.innerWidth, ih: window.innerHeight };
  });

  // crop box, CSS px, centred a little above the void (the face rides high)
  const S = Math.max(60, Math.min(400, Math.round(geom.pxR * 3.2)));
  const cx = Math.max(S / 2, Math.min(geom.iw - S / 2, geom.sx));
  const cy = Math.max(S / 2, Math.min(geom.ih - S / 2, geom.sy));
  const clip = { x: Math.round(cx - S / 2), y: Math.round(cy - S / 2), width: S, height: S };

  const a = await p.screenshot({ clip });
  await p.evaluate(() => { window.__heroGroup.visible = false; });
  await frames(3);
  const bkg = await p.screenshot({ clip });
  await p.evaluate(() => { window.__heroGroup.visible = true; });
  await frames(2);

  fs.writeFileSync(`qa-out/gh/${WORLD}-r${R}.png`, a);
  results.push({ R, geom, S, a: a.toString('base64'), bg: bkg.toString('base64') });
  console.log(`  r=${R}  camD=${geom.camD}  pxR=${geom.pxR} CSS px (diam ${(geom.pxR * 2).toFixed(0)})  uSmall=${geom.uSmall}  crop=${S}`);
}
await p.close();

// ── ANALYSIS ────────────────────────────────────────────────────────────────
const an = await b.newPage({ viewport: { width: 900, height: 600 } });
const stats = await an.evaluate(async (rows) => {
  const dec = async (b64) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(im, 0, 0);
    return { d: x.getImageData(0, 0, im.width, im.height).data, w: im.width, h: im.height };
  };
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (r, g, bl) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
  const wcag = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  const out = [];
  for (const row of rows) {
    const A = await dec(row.a), B = await dec(row.bg);
    const w = A.w, h = A.h, n = w * h;
    const mask = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const j = i * 4;
      const dr = Math.abs(A.d[j] - B.d[j]), dg = Math.abs(A.d[j + 1] - B.d[j + 1]), db = Math.abs(A.d[j + 2] - B.d[j + 2]);
      if (Math.max(dr, dg, db) > 18) mask[i] = 1;
    }
    // largest connected component — throws away moving props / rivals in the crop
    const lab = new Int32Array(n).fill(-1);
    let bestC = -1, bestN = 0, comps = 0;
    const st = new Int32Array(n);
    for (let s = 0; s < n; s++) {
      if (!mask[s] || lab[s] >= 0) continue;
      let sp = 0, cnt = 0; st[sp++] = s; lab[s] = comps;
      while (sp) {
        const i = st[--sp]; cnt++;
        const x = i % w, y = (i / w) | 0;
        if (x > 0 && mask[i - 1] && lab[i - 1] < 0) { lab[i - 1] = comps; st[sp++] = i - 1; }
        if (x < w - 1 && mask[i + 1] && lab[i + 1] < 0) { lab[i + 1] = comps; st[sp++] = i + 1; }
        if (y > 0 && mask[i - w] && lab[i - w] < 0) { lab[i - w] = comps; st[sp++] = i - w; }
        if (y < h - 1 && mask[i + w] && lab[i + w] < 0) { lab[i + w] = comps; st[sp++] = i + w; }
      }
      if (cnt > bestN) { bestN = cnt; bestC = comps; }
      comps++;
    }
    const M = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (lab[i] === bestC) M[i] = 1;
    // centroid, perimeter, radial extent
    let sx = 0, sy = 0, per = 0, minx = w, maxx = 0, miny = h, maxy = 0;
    for (let i = 0; i < n; i++) {
      if (!M[i]) continue;
      const x = i % w, y = (i / w) | 0;
      sx += x; sy += y;
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1 ||
          !M[i - 1] || !M[i + 1] || !M[i - w] || !M[i + w]) per++;
    }
    const area = bestN, ox = sx / area, oy = sy / area;
    const circ = (4 * Math.PI * area) / (per * per);
    // radial profile of the true silhouette radius: 180 rays from the centroid
    const rays = [];
    for (let k = 0; k < 180; k++) {
      const th = (k / 180) * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th);
      let rr = 0;
      for (let t = 0; t < Math.max(w, h); t += 0.5) {
        const px = Math.round(ox + cs * t), py = Math.round(oy + sn * t);
        if (px < 0 || py < 0 || px >= w || py >= h) break;
        if (!M[py * w + px]) break;
        rr = t;
      }
      rays.push(rr);
    }
    const rMean = rays.reduce((a2, v) => a2 + v, 0) / rays.length;
    const rMin = Math.min(...rays), rMax = Math.max(...rays);
    const rSd = Math.sqrt(rays.reduce((a2, v) => a2 + (v - rMean) ** 2, 0) / rays.length);
    // per-pixel colour stats inside
    let bodyL = 0, bodyN = 0;
    const bins = new Array(12).fill(0), binN = new Array(12).fill(0);
    let sclN = 0, sclL = 0, pupN = 0, pupL = 0, mouthN = 0, tongueN = 0, brightN = 0;
    const sclMask = new Uint8Array(n);
    let maxL = 0;
    for (let i = 0; i < n; i++) {
      if (!M[i]) continue;
      const j = i * 4, r = A.d[j], g = A.d[j + 1], bl = A.d[j + 2];
      const L = lum(r, g, bl);
      const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
      const sat = mx ? (mx - mn) / mx : 0;
      bodyL += L; bodyN++;
      if (L > maxL) maxL = L;
      const x = i % w, y = (i / w) | 0;
      const rr = Math.hypot(x - ox, y - oy) / rMean;
      const bi = Math.min(11, Math.floor(rr * 12));
      bins[bi] += L; binN[bi]++;
      // sclera: bright + low saturation
      if (L > 0.55 && sat < 0.30) { sclN++; sclL += L; sclMask[i] = 1; brightN++; }
      // pupil: very dark and blue-violet
      if (L < 0.035 && bl >= r) { pupN++; pupL += L; }
      // tongue pink 0xff6f91
      if (r > 170 && g < 150 && bl > 90 && bl < 200 && r - g > 60) tongueN++;
      // mouth plum 0x4a1a68
      if (r > 40 && r < 110 && g < 60 && bl > 70 && bl < 150 && bl - g > 40) mouthN++;
    }
    const prof = bins.map((v, i2) => (binN[i2] ? +(v / binN[i2]).toFixed(4) : null));
    // the RIM: fraction of the disc radius over which the outermost bins sit
    // above the body mean, and how many device px that is
    const bodyMean = bodyL / bodyN;
    // background ring just outside the silhouette (from the void-free frame)
    let bgL = 0, bgN = 0;
    for (let i = 0; i < n; i++) {
      if (M[i]) continue;
      const x = i % w, y = (i / w) | 0;
      const rr = Math.hypot(x - ox, y - oy);
      if (rr > rMean * 1.02 && rr < rMean * 1.30) {
        const j = i * 4; bgL += lum(B.d[j], B.d[j + 1], B.d[j + 2]); bgN++;
      }
    }
    // …and the void's own outermost ring, for the edge contrast
    let edgeL = 0, edgeN = 0;
    for (let i = 0; i < n; i++) {
      if (!M[i]) continue;
      const x = i % w, y = (i / w) | 0;
      const rr = Math.hypot(x - ox, y - oy);
      if (rr > rMean * 0.80) { const j = i * 4; edgeL += lum(A.d[j], A.d[j + 1], A.d[j + 2]); edgeN++; }
    }
    // eye components (from sclera mask), keep the two biggest
    const el = new Int32Array(n).fill(-1); const es = [];
    let ec = 0;
    for (let s = 0; s < n; s++) {
      if (!sclMask[s] || el[s] >= 0) continue;
      let sp = 0, cnt = 0, ex = 0, ey = 0, xm = w, xM = 0, ym = h, yM = 0;
      st[sp++] = s; el[s] = ec;
      while (sp) {
        const i = st[--sp]; cnt++;
        const x = i % w, y = (i / w) | 0; ex += x; ey += y;
        if (x < xm) xm = x; if (x > xM) xM = x; if (y < ym) ym = y; if (y > yM) yM = y;
        if (x > 0 && sclMask[i - 1] && el[i - 1] < 0) { el[i - 1] = ec; st[sp++] = i - 1; }
        if (x < w - 1 && sclMask[i + 1] && el[i + 1] < 0) { el[i + 1] = ec; st[sp++] = i + 1; }
        if (y > 0 && sclMask[i - w] && el[i - w] < 0) { el[i - w] = ec; st[sp++] = i - w; }
        if (y < h - 1 && sclMask[i + w] && el[i + w] < 0) { el[i + w] = ec; st[sp++] = i + w; }
      }
      es.push({ n: cnt, cx: ex / cnt, cy: ey / cnt, bw: xM - xm + 1, bh: yM - ym + 1 });
      ec++;
    }
    es.sort((a2, b2) => b2.n - a2.n);
    const eye = es.slice(0, 2);
    // body luminance in an annulus around each eye, for the eye/body contrast
    let ringL = 0, ringN = 0;
    for (const e of eye) {
      const rad = Math.sqrt(e.n / Math.PI);
      for (let i = 0; i < n; i++) {
        if (!M[i] || sclMask[i]) continue;
        const x = i % w, y = (i / w) | 0;
        const d2 = Math.hypot(x - e.cx, y - e.cy);
        if (d2 > rad * 1.3 && d2 < rad * 2.4) { const j = i * 4; ringL += lum(A.d[j], A.d[j + 1], A.d[j + 2]); ringN++; }
      }
    }
    out.push({
      R: row.R, pxR: row.geom.pxR, camD: row.geom.camD, uSmall: row.geom.uSmall, uStage: row.geom.uStage,
      crop: row.S, dpr: 3,
      areaPx: area, silDiamCssPx: +((2 * rMean) / 3).toFixed(1),
      circularity: +circ.toFixed(4),
      rayMin: +(rMin / 3).toFixed(1), rayMax: +(rMax / 3).toFixed(1), raySdPct: +((rSd / rMean) * 100).toFixed(2),
      bboxAspect: +((maxx - minx + 1) / (maxy - miny + 1)).toFixed(3),
      radialProfile: prof,
      bodyMeanL: +bodyMean.toFixed(4), maxL: +maxL.toFixed(4),
      edgeMeanL: +(edgeL / Math.max(1, edgeN)).toFixed(4),
      bgMeanL: +(bgL / Math.max(1, bgN)).toFixed(4),
      edgeVsBg: +wcag(edgeL / Math.max(1, edgeN), bgL / Math.max(1, bgN)).toFixed(2),
      scleraPx: sclN, scleraPctOfDisc: +((sclN / area) * 100).toFixed(2),
      pupilPx: pupN, mouthPlumPx: mouthN, tonguePx: tongueN,
      eyes: eye.map((e) => ({ px: e.n, cssDiam: +((2 * Math.sqrt(e.n / Math.PI)) / 3).toFixed(2), bw: +(e.bw / 3).toFixed(2), bh: +(e.bh / 3).toFixed(2) })),
      eyeVsBody: ringN && sclN ? +wcag(sclL / sclN, ringL / ringN).toFixed(2) : null,
    });
  }
  return out;
}, results);
await b.close();

console.log('\n' + JSON.stringify({ world: WORLD, rig, rows: stats }, null, 1));
