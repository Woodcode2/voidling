// ══════════════════════════════════════════════════════════════════════════
//  EVOMAT — which MATERIALS change on the frame that stalls
// ══════════════════════════════════════════════════════════════════════════
//
//  The chain, in order, each step killing the previous guess:
//   qa/hitch.mjs      worst frame of every run is the first evolution (~1.5s)
//   qa/evohitch.mjs   the hot JS call there is getProgramParameter — a shader
//                     link, which blocks
//   qa/shaderstall.mjs 8 of the 9 post-boot program links land on that ONE
//                     frame. Two precompile fixes then failed.
//   qa/evoadds.mjs    ZERO objects are added to the scene after boot — so the
//                     objects already exist and nothing is being constructed
//
//  Which leaves one mechanism: a material already in the scene CHANGES, and
//  the new state needs a new program. three.js keys a program on the
//  material's parameters (map present, instancing, fog, vertex colours,
//  defines, …), so assigning a texture mid-match is a different program from
//  the same material without one — and no boot-time compile can build a
//  variant the material does not have yet. That is exactly why
//  renderer.compile() and reveal-all+compile both changed nothing.
//
//  So this walks every material each frame and records what changed: version
//  bumps (needsUpdate), a map appearing, blending/transparency flips, define
//  edits. Whatever it prints for the linking frame is the thing a fix has to
//  reproduce once, behind the boot cover.
//
//    node qa/evomat.mjs
//
import { chromium } from 'playwright';

const URL = process.env.HITCH_URL || 'http://localhost:4177/';
const UNTIL = Number(process.env.MAT_UNTIL || 19);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR: ' + e.message));

await page.addInitScript(() => {
  const S = { frame: 0, links: 0, linkFrames: [] };
  window.__shaderStats = S;
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const gl = orig.call(this, type, ...rest);
    if (gl && (type === 'webgl2' || type === 'webgl') && !gl.__wrapped) {
      gl.__wrapped = true;
      const link = gl.linkProgram.bind(gl);
      gl.linkProgram = (p) => { S.links++; S.linkFrames.push(S.frame); return link(p); };
    }
    return gl;
  };
});

const resp = await page.goto(URL).catch((e) => { throw new Error(`server unreachable at ${URL}: ${e.message}`); });
if (!resp || !resp.ok()) throw new Error(`server returned ${resp ? resp.status() : 'nothing'} — start the preview first`);
await page.waitForFunction(() => !!document.querySelector('canvas'), undefined, { timeout: 60000 })
  .catch(() => { throw new Error('no canvas after 60s — page loaded but the game never started'); });
await page.waitForFunction(() => window.__matchState && window.__matchState().t > 1, undefined, { timeout: 180000 });

await page.evaluate(() => {
  const S = window.__shaderStats, scene = window.__scene;
  const changes = [];
  window.__matRec = changes;
  const seen = new Map();   // "material.uuid|objectKind" -> signature
  let versionChurn = 0;     // needsUpdate traffic, counted but NOT recorded
  const vseen = new Map();
  // THE SIGNATURE IS THE PROGRAM KEY, APPROXIMATED — and it contains ONLY
  // things three.js actually keys a program on.
  //
  // Two things are deliberately NOT in it, because the first run of this probe
  // put them in and filled its whole 500-entry budget with noise before the
  // evolution frame ever arrived:
  //  - m.version. A version bump (needsUpdate) makes the renderer re-derive
  //    the program PARAMETERS, but programs are cached by key, so identical
  //    parameters return the cached program and nothing links. Counted below
  //    as churn instead, because a material invalidating itself twice per
  //    frame is a real (separate) waste.
  //  - object-level flags keyed per material. A MeshBasicMaterial here is
  //    SHARED between an InstancedMesh and a plain Mesh, so a per-uuid record
  //    flip-flopped inst/- every single traversal. The key now includes the
  //    object kind, so the two uses are tracked apart instead of fighting.
  const sig = (m, o) => [
    m.map ? 'map' : '-',
    m.alphaMap ? 'aMap' : '-',
    m.envMap ? 'env' : '-',
    m.vertexColors ? 'vc' : '-',
    m.transparent ? 'tr' : '-',
    m.blending,
    m.side,
    m.flatShading ? 'flat' : '-',
    o && o.isInstancedMesh ? 'inst' : '-',
    o && o.isPoints ? 'pts' : '-',
    o && o.isSprite ? 'spr' : '-',
    m.defines ? Object.keys(m.defines).sort().join('|') : '',
    m.fog ? 'fog' : '-',
  ].join(',');
  const scan = () => {
    try {
      scene.traverse((o) => {
        const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
        for (const m of mats) {
          const kind = o.isInstancedMesh ? 'inst' : o.isPoints ? 'pts' : o.isSprite ? 'spr' : 'mesh';
          const key = m.uuid + '|' + kind;
          const s = sig(m, o);
          const prev = seen.get(key);
          if (prev === undefined) { seen.set(key, s); }
          else if (prev !== s && changes.length < 2000) {
            changes.push({
              frame: S.frame,
              what: `${o.type}/${m.type}${m.name ? ' "' + m.name + '"' : ''}${o.name ? ' obj:"' + o.name + '"' : ''}`,
              from: prev, to: s,
            });
            seen.set(key, s);
          }
          // needsUpdate churn, tracked apart from the program key
          const pv = vseen.get(key);
          if (pv !== undefined && pv !== m.version) versionChurn++;
          vseen.set(key, m.version);
        }
      });
    } catch { /* never break the game being measured */ }
  };
  window.__matScan = scan;
  window.__matChurn = () => versionChurn;
  scan();   // baseline
});

await page.evaluate(() => {
  const S = window.__shaderStats;
  const rec = { d: [], r: [] };
  window.__rec = rec;
  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    rec.d.push(now - last); last = now;
    rec.r.push(window.__matchState ? +window.__matchState().r.toFixed(2) : 0);
    S.frame++;
    window.__matScan();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await page.evaluate(() => {
  const cv = document.querySelector('canvas');
  const r = cv.getBoundingClientRect();
  const cx = r.width / 2, cy = r.height / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, clientX: cx, clientY: cy, bubbles: true }));
  let a = 0;
  setInterval(() => {
    a += 0.11;
    cv.dispatchEvent(new PointerEvent('pointermove', {
      pointerId: 9, clientX: cx + Math.cos(a) * 130, clientY: cy + Math.sin(a) * 130, bubbles: true,
    }));
  }, 40);
});

await page.waitForFunction((u) => window.__matchState && window.__matchState().t > u, UNTIL, { timeout: 600000 });

const out = await page.evaluate(() => {
  const linkFrames = [...new Set(window.__shaderStats.linkFrames)].filter((f) => f > 0);
  const near = new Set();
  for (const lf of linkFrames) for (let f = lf - 3; f <= lf + 1; f++) near.add(f);
  const ch = window.__matRec;
  return {
    linkFrames,
    totalChanges: ch.length,
    churn: window.__matChurn(),
    frames: window.__rec.d.length,
    atLinks: ch.filter((c) => near.has(c.frame)).slice(0, 25),
    sample: ch.slice(0, 10),
  };
});

console.log(`frames that linked: ${JSON.stringify(out.linkFrames)}`);
console.log(`material param changes: ${out.totalChanges} | needsUpdate churn: ${out.churn} over ${out.frames} frames`);
console.log('── material changes ON or JUST BEFORE a linking frame ──');
for (const c of out.atLinks) {
  console.log(`  f${c.frame}  ${c.what}`);
  console.log(`      from ${c.from}`);
  console.log(`      to   ${c.to}`);
}
if (!out.atLinks.length) {
  console.log('  (none — the link is NOT a material change; suspect a render-state or pass change:');
  console.log('   shadow-map depth variants, the bloom composer\'s own passes, or light-count changes)');
  console.log('── first few changes anywhere, for orientation ──');
  for (const c of out.sample) console.log(`  f${c.frame} ${c.what}`);
}
await browser.close();
