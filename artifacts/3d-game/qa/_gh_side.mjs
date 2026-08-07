// HERO NEXT TO FAMILY, IN ONE FRAME.
//
//   node qa/_gh_side.mjs <world> [port]
//
// _gh_fam.mjs found the family is almost never in shot — 11 on-screen rival
// sightings in 150 chances on Maple, 12 in 150 on Lantern — so a like-for-like
// comparison has to be staged. This warps the hero onto a joined rival and
// shoots one frame with both in it, plus a strip of the hero wearing each of
// the five family palettes through __setSkin.
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
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 70, null, { timeout: 900000 });
await p.evaluate(() => { window.__pinQuality(0); window.__setMood('cruise'); });
await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins,#rank,#growBar,#toast,#combo{opacity:0!important}' });
const frames = (n) => p.evaluate((k) => new Promise((res) => {
  let i = 0; const s = () => { if (++i >= k) return res(1); requestAnimationFrame(s); }; requestAnimationFrame(s);
}), n);
await p.evaluate(() => {
  let hero = null; const others = [];
  window.__scene.traverse((o) => {
    if (o.isMesh && o.material?.uniforms?.uAbyss) {
      if (o.geometry?.parameters?.widthSegments === 96) hero = o; else others.push(o);
    }
  });
  window.__heroBody = hero; window.__heroGroup = hero.parent.parent;
  window.__rivalGroups = [...new Set(others.map((o) => o.parent))];
});

const R = 6;
for (let attempt = 0; attempt < 40; attempt++) {
  await p.evaluate((r) => window.__setVoidR(r), R);
  const ok = await p.evaluate(() => {
    // stand the hero two of his own radii from the biggest visible sibling
    let best = null, bs = 0;
    window.__rivalGroups.forEach((g) => {
      if (!g.visible) return;
      g.updateWorldMatrix(true, false);
      const s = Math.hypot(g.matrixWorld.elements[0], g.matrixWorld.elements[1], g.matrixWorld.elements[2]);
      if (s > bs) { bs = s; best = g; }
    });
    if (!best) return null;
    const e = best.matrixWorld.elements;
    window.__warpVoid(e[12] + 11, e[14] + 3);
    return { rivalR: +bs.toFixed(2) };
  });
  if (ok) { console.log(`# staged next to a rival of r=${ok.rivalR}`); break; }
  await frames(20);
}
// settle the camera on the hero's new size
let err = 1, n = 0;
while (err > 0.006 && n++ < 200) {
  await frames(8);
  err = await p.evaluate((rr) => {
    window.__setVoidR(rr);
    const c = window.__cam.position;
    const steep = Math.min(1, Math.max(0, (rr - 2.5) / 5.5));
    const ox = 0.62 + (0.45 - 0.62) * steep, oy = 0.92 + (1.4 - 0.92) * steep;
    const camDist = c.y / (oy / Math.hypot(ox, oy, ox));
    const target = Math.min(340, Math.max(26, 38 * Math.pow(rr / 0.9, 0.82)));
    return Math.abs(camDist - target) / target;
  }, R);
}
await draw(true); await frames(4);
fs.writeFileSync(`qa-out/gh/${WORLD}-side.png`, await p.screenshot({ timeout: 180000 }));
console.log(`qa-out/gh/${WORLD}-side.png`);

// …and the hero wearing each family palette, so the SHADER can be judged
// across the five without the rival face rig in the way.
const SK = await p.evaluate(() => ['classic', 'univoid', 'rexling', 'kingvoid', 'drako', 'shadowninja']);
const strips = [];
for (const id of SK) {
  const applied = await p.evaluate((sid) => {
    // palette.ts SKINS, reachable through the shop UI's own data if exposed;
    // otherwise the five legendaries are hard-coded here from palette.ts:164-176
    const S = {
      classic: { id: 'classic', abyss: 0x050308, inner: 0x241055, mid: 0x5f2ab4, rim: 0xcb99ff, glow: 0xb98cff },
      univoid: { id: 'univoid', abyss: 0x342647, inner: 0xa890c8, mid: 0xe4d6f4, rim: 0xfff4ff, glow: 0xffc9e8, acc: 'unicorn', char: { eyes: 'star', gloss: 1.4, pattern: 'fur', patCol: 0xffe4ff } },
      rexling: { id: 'rexling', abyss: 0x123018, inner: 0x2f8038, mid: 0x55b850, rim: 0x8ef07a, glow: 0xb8ff8a, acc: 'dino', char: { eyes: 'fierce', gloss: 0.5, pattern: 'scales', patCol: 0x2a6a30 } },
      kingvoid: { id: 'kingvoid', abyss: 0x0d0618, inner: 0x2e1552, mid: 0x4a2378, rim: 0xffd25a, glow: 0xffe8a0, acc: 'king', char: { eyes: 'glow', gloss: 1.2, pattern: 'starfield', patCol: 0xffd25a } },
      drako: { id: 'drako', abyss: 0x0a2030, inner: 0x14536a, mid: 0x2394a8, rim: 0x5ee8d8, glow: 0xffb054, acc: 'dragon', char: { eyes: 'fierce', gloss: 0.9, pattern: 'scales', patCol: 0x1e6a7a } },
      shadowninja: { id: 'shadowninja', abyss: 0x0a0612, inner: 0x241640, mid: 0x3a2a5e, rim: 0xff4d5e, glow: 0xff7a8a, acc: 'ninja', char: { eyes: 'fierce', gloss: 0.4, pattern: 'stitch', patCol: 0x4a2a5e } },
    };
    window.__setSkin(S[sid]);
    return sid;
  }, id);
  await frames(4);
  const g = await p.evaluate(() => {
    const cam = window.__cam, o = window.__heroGroup;
    o.updateWorldMatrix(true, false);
    const e = o.matrixWorld.elements;
    const V = cam.position.constructor;
    const wp = new V(e[12], e[13], e[14]);
    const camD = cam.position.distanceTo(wp);
    const vs = window.__voidState();
    const pxR = (window.innerHeight / (2 * camD * Math.tan(cam.fov * Math.PI / 360))) * vs.r;
    const sp = wp.clone().project(cam);
    return { pxR, sx: (sp.x * 0.5 + 0.5) * 430, sy: (-sp.y * 0.5 + 0.5) * 932 };
  });
  const S = Math.round(Math.min(300, g.pxR * 3.4));
  const clip = { x: Math.round(Math.max(0, Math.min(430 - S, g.sx - S / 2))),
    y: Math.round(Math.max(0, Math.min(932 - S, g.sy - S / 2))), width: S, height: S };
  strips.push([applied, (await p.screenshot({ clip, timeout: 180000 })).toString('base64')]);
  console.log('  skin', applied, 'pxR', g.pxR.toFixed(1));
}
await p.close();
const t = await b.newPage({ viewport: { width: 1400, height: 400 } });
const sheet = await t.evaluate(async (strips) => {
  const S = 300;
  const c = document.createElement('canvas');
  c.width = strips.length * S; c.height = S + 40;
  const x = c.getContext('2d');
  x.fillStyle = '#12101a'; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < strips.length; i++) {
    const im = new Image(); im.src = 'data:image/png;base64,' + strips[i][1]; await im.decode();
    x.drawImage(im, i * S, 40, S, S);
    x.fillStyle = '#fff'; x.font = 'bold 22px system-ui';
    x.fillText(strips[i][0], i * S + 10, 28);
  }
  return c.toDataURL('image/png');
}, strips);
fs.writeFileSync(`qa-out/gh/${WORLD}-skins.png`, Buffer.from(sheet.split(',')[1], 'base64'));
console.log(`qa-out/gh/${WORLD}-skins.png`);
await b.close();
