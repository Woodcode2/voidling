// THE HERO AGAINST THE FIVE RIVALS, ON THE SAME PIXELS.
//
//   node qa/_gh_fam.mjs <world> [port]
//
// Same silhouette-by-difference method as _gh_hero.mjs: for each void, one
// frame with it visible and one with it hidden. The mask is exact, so the
// question "is the hero's outline as distinctive as the family's" gets a
// number (circularity, and the fraction of the silhouette that lies outside
// the body sphere — i.e. how much of it is horn, crown, snout or mane).
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4242';
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
await p.click('#btnPlay', { timeout: 300000, force: true }); await p.waitForTimeout(2500);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`, { timeout: 300000, force: true });
await p.evaluate(() => { window.__realRender = window.__renderer.render.bind(window.__renderer); });
const draw = (on) => p.evaluate((v) => { window.__renderer.render = v ? window.__realRender : () => {}; }, on);
await draw(false);
// all five siblings are seated by ~54 s (rivals.ts:446 slots), so the
// portrait pass happens after that or half the family is not in the scene yet
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 62, null, { timeout: 900000 });
await p.evaluate(() => window.__pinQuality(0));
// THE FREEZE — see _gh_hero.mjs. Two frames that differ only by one object.
await p.evaluate(() => {
  window.__rafReal = window.requestAnimationFrame.bind(window);
  window.__frozen = false; window.__rq = [];
  window.requestAnimationFrame = (cb) => {
    if (window.__frozen) { window.__rq.push(cb); return -1; }
    return window.__rafReal(cb);
  };
  window.__freeze = () => { window.__frozen = true; };
  window.__thaw = () => { window.__frozen = false; window.__rq.splice(0).forEach((cb) => window.__rafReal(cb)); };
});
const frames = (n) => p.evaluate((k) => new Promise((res) => {
  let i = 0; const step = () => { if (++i >= k) return res(1); window.__rafReal(step); };
  window.__rafReal(step);
}), n);

await p.evaluate(() => {
  let hero = null; const others = [];
  window.__scene.traverse((o) => {
    if (!o.isMesh || !o.material?.uniforms?.uAbyss) return;
    if (o.geometry?.parameters?.widthSegments === 96) hero = o; else others.push(o);
  });
  window.__heroBody = hero; window.__rivalBodies = others;
  window.__heroGroup = hero.parent.parent;
  window.__rivalGroups = [...new Set(others.map((o) => o.parent))];
});

// ── THE EYE-THROUGH-WALLS CENSUS ───────────────────────────────────────────
// Every rival eye mesh is depthTest:false (rivals.ts:277-283), so it paints
// over whatever was drawn before it regardless of depth. Sampled on the MATCH
// clock with the draw stubbed: a hand-rolled segment/bounding-sphere test from
// the camera to the rival's eye plane.
const census = await p.evaluate(async () => {
  const cam = window.__cam;
  const props = [];
  window.__scene.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.geometry) return;
    if (o.material?.uniforms?.uAbyss) return;
    if (o.material?.transparent) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const bs = o.geometry.boundingSphere; if (!bs || !isFinite(bs.radius)) return;
    o.updateWorldMatrix(true, false);
    const e = o.matrixWorld.elements;
    const sc = Math.max(Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10]));
    const c = bs.center;
    const wx = e[0] * c.x + e[4] * c.y + e[8] * c.z + e[12];
    const wy = e[1] * c.x + e[5] * c.y + e[9] * c.z + e[13];
    const wz = e[2] * c.x + e[6] * c.y + e[10] * c.z + e[14];
    const r = bs.radius * sc;
    if (r > 60 || r < 0.4) return;
    props.push([wx, wy, wz, r]);
  });
  const samples = [];
  const wait = (k) => new Promise((res) => { let i = 0; const s = () => { if (++i >= k) return res(1); requestAnimationFrame(s); }; requestAnimationFrame(s); });
  for (let s = 0; s < 30; s++) {
    await wait(20);
    let vis = 0, blocked = 0;
    for (const rb of window.__rivalBodies) {
      const g = rb.parent; if (!g?.visible) continue;
      g.updateWorldMatrix(true, false);
      const e = g.matrixWorld.elements;
      const scl = Math.hypot(e[0], e[1], e[2]);
      const cx = e[12], cy = e[13], cz = e[14];
      const dx = cam.position.x - cx, dy = cam.position.y - cy, dz = cam.position.z - cz;
      const L = Math.hypot(dx, dy, dz) || 1;
      const ex = cx + dx / L * scl, ey = cy + dy / L * scl, ez = cz + dz / L * scl;
      const sp = new (cam.position.constructor)(ex, ey, ez).project(cam);
      if (sp.z > 1 || Math.abs(sp.x) > 1 || Math.abs(sp.y) > 1) continue;   // off screen
      vis++;
      const sx = cam.position.x, sy = cam.position.y, sz = cam.position.z;
      const vx = ex - sx, vy = ey - sy, vz = ez - sz;
      const vl2 = vx * vx + vy * vy + vz * vz;
      for (const [px, py, pz, pr] of props) {
        const wxx = px - sx, wyy = py - sy, wzz = pz - sz;
        const tt = (wxx * vx + wyy * vy + wzz * vz) / vl2;
        if (tt <= 0.02 || tt >= 0.98) continue;
        const qx = sx + vx * tt - px, qy = sy + vy * tt - py, qz = sz + vz * tt - pz;
        if (qx * qx + qy * qy + qz * qz < pr * pr * 0.36) { blocked++; break; }
      }
    }
    samples.push({ t: +window.__matchState().t.toFixed(1), visible: vis, blocked });
  }
  return { props: props.length, samples };
});
const tot = census.samples.reduce((a, s) => a + s.visible, 0);
const bad = census.samples.reduce((a, s) => a + s.blocked, 0);
console.log(`# EYE-THROUGH-WALLS (${WORLD}): ${census.props} opaque props in range`);
console.log(`# ${bad}/${tot} on-screen rival sightings had a prop CORE between camera and eye plane = ${((bad / Math.max(1, tot)) * 100).toFixed(1)}%`);

// ── FAMILY PORTRAITS, silhouette by difference ─────────────────────────────
await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins,#rank,#growBar,#toast,#combo{opacity:0!important}' });
const subjects = await p.evaluate(() => {
  const out = [];
  window.__heroGroup.userData.tag = 'HERO';
  out.push('HERO');
  window.__rivalGroups.forEach((g, i) => { g.userData.tag = 'R' + i; out.push('R' + i); });
  window.__subjects = [window.__heroGroup, ...window.__rivalGroups];
  return out;
});
const shots = [];
for (let i = 0; i < subjects.length; i++) {
  const g = await p.evaluate((k) => {
    const o = window.__subjects[k];
    if (!o.visible) return null;
    const cam = window.__cam;
    o.updateWorldMatrix(true, false);
    const e = o.matrixWorld.elements;
    const scl = Math.hypot(e[0], e[1], e[2]);
    const V = cam.position.constructor;
    const wp = new V(e[12], e[13], e[14]);
    const camD = cam.position.distanceTo(wp);
    const pxR = (window.innerHeight / (2 * camD * Math.tan(cam.fov * Math.PI / 360))) * scl;
    const sp = wp.clone().project(cam);
    const body = window.__scene && null;
    void body;
    return { scl: +scl.toFixed(2), camD: +camD.toFixed(1), pxR: +pxR.toFixed(1),
      sx: (sp.x * 0.5 + 0.5) * window.innerWidth, sy: (-sp.y * 0.5 + 0.5) * window.innerHeight,
      onScreen: sp.z < 1 && Math.abs(sp.x) < 0.95 && Math.abs(sp.y) < 0.95 };
  }, i);
  if (!g || !g.onScreen) { console.log(`  ${subjects[i]}: not on screen / hidden`); continue; }
  await draw(true); await frames(3);
  const S = Math.max(60, Math.min(400, Math.round(g.pxR * 3.4)));
  const clip = { x: Math.round(Math.max(0, Math.min(430 - S, g.sx - S / 2))),
    y: Math.round(Math.max(0, Math.min(932 - S, g.sy - S / 2))), width: S, height: S };
  await p.evaluate(() => { window.__freeze(); window.__renderer.render(window.__scene, window.__cam); });
  const a = await p.screenshot({ clip, timeout: 180000 });
  await p.evaluate((k) => {
    window.__subjects[k].visible = false;
    window.__renderer.render(window.__scene, window.__cam);
  }, i);
  const bg = await p.screenshot({ clip, timeout: 180000 });
  await p.evaluate((k) => {
    window.__subjects[k].visible = true;
    window.__renderer.render(window.__scene, window.__cam);
    window.__thaw();
  }, i);
  fs.writeFileSync(`qa-out/gh/${WORLD}-fam-${subjects[i]}.png`, a);
  shots.push({ tag: subjects[i], g, a: a.toString('base64'), bg: bg.toString('base64') });
  console.log(`  ${subjects[i]} r=${g.scl} pxR=${g.pxR}`);
}
await draw(false);
await p.close();

const an = await b.newPage({ viewport: { width: 800, height: 600 } });
const stats = await an.evaluate(async (rows) => {
  const dec = async (b64) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
    return { d: x.getImageData(0, 0, im.width, im.height).data, w: im.width, h: im.height };
  };
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (r, g, bl) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
  const out = [];
  for (const row of rows) {
    const A = await dec(row.a), B = await dec(row.bg);
    const w = A.w, h = A.h, n = w * h;
    const m0 = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const j = i * 4;
      if (Math.max(Math.abs(A.d[j] - B.d[j]), Math.abs(A.d[j + 1] - B.d[j + 1]), Math.abs(A.d[j + 2] - B.d[j + 2])) > 18) m0[i] = 1;
    }
    const lab = new Int32Array(n).fill(-1); const st = new Int32Array(n);
    let bc = -1, bn = 0, cc = 0;
    for (let s = 0; s < n; s++) {
      if (!m0[s] || lab[s] >= 0) continue;
      let sp = 0, cnt = 0; st[sp++] = s; lab[s] = cc;
      while (sp) {
        const i = st[--sp]; cnt++; const x = i % w, y = (i / w) | 0;
        if (x > 0 && m0[i - 1] && lab[i - 1] < 0) { lab[i - 1] = cc; st[sp++] = i - 1; }
        if (x < w - 1 && m0[i + 1] && lab[i + 1] < 0) { lab[i + 1] = cc; st[sp++] = i + 1; }
        if (y > 0 && m0[i - w] && lab[i - w] < 0) { lab[i - w] = cc; st[sp++] = i - w; }
        if (y < h - 1 && m0[i + w] && lab[i + w] < 0) { lab[i + w] = cc; st[sp++] = i + w; }
      }
      if (cnt > bn) { bn = cnt; bc = cc; } cc++;
    }
    const M = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (lab[i] === bc) M[i] = 1;
    let sx = 0, sy = 0, per = 0;
    for (let i = 0; i < n; i++) {
      if (!M[i]) continue; const x = i % w, y = (i / w) | 0; sx += x; sy += y;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || !M[i - 1] || !M[i + 1] || !M[i - w] || !M[i + w]) per++;
    }
    const area = bn, ox = sx / area, oy = sy / area;
    const rays = [];
    for (let k = 0; k < 180; k++) {
      const th = (k / 180) * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th);
      let rr = 0;
      for (let t = 0; t < Math.max(w, h); t += 0.5) {
        const px = Math.round(ox + cs * t), py = Math.round(oy + sn * t);
        if (px < 0 || py < 0 || px >= w || py >= h) break;
        if (!M[py * w + px]) break; rr = t;
      }
      rays.push(rr);
    }
    const rMean = rays.reduce((a2, v) => a2 + v, 0) / rays.length;
    const rSd = Math.sqrt(rays.reduce((a2, v) => a2 + (v - rMean) ** 2, 0) / rays.length);
    // how much of the silhouette lies OUTSIDE the body sphere: pxR is the
    // sphere's own screen radius, so anything past it is horn / crown / mane
    const sphereR = row.g.pxR * 3;   // device px
    let beyond = 0;
    for (let i = 0; i < n; i++) {
      if (!M[i]) continue; const x = i % w, y = (i / w) | 0;
      if (Math.hypot(x - ox, y - oy) > sphereR * 1.02) beyond++;
    }
    let sclN = 0, bodyL = 0, bodyN = 0;
    for (let i = 0; i < n; i++) {
      if (!M[i]) continue; const j = i * 4, r = A.d[j], g2 = A.d[j + 1], bl = A.d[j + 2];
      const L = lum(r, g2, bl); const mx = Math.max(r, g2, bl), mn = Math.min(r, g2, bl);
      if (L > 0.55 && (mx ? (mx - mn) / mx : 0) < 0.30) sclN++;
      bodyL += L; bodyN++;
    }
    out.push({ tag: row.tag, r: row.g.scl, pxR: row.g.pxR,
      circularity: +((4 * Math.PI * area) / (per * per)).toFixed(4),
      raySdPct: +((rSd / rMean) * 100).toFixed(2),
      beyondSpherePct: +((beyond / area) * 100).toFixed(2),
      scleraPctOfDisc: +((sclN / area) * 100).toFixed(2),
      bodyMeanL: +(bodyL / bodyN).toFixed(4) });
  }
  return out;
}, shots);
await b.close();
console.log(JSON.stringify({ world: WORLD, eyeCensus: { blocked: bad, sightings: tot }, family: stats }, null, 1));
