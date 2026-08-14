// ══════════════════════════════════════════════════════════════════════════
//  EVOADDS — WHICH objects arrive on the frame that stalls
// ══════════════════════════════════════════════════════════════════════════
//
//  The chain so far: qa/hitch.mjs found the worst frame (first evolution),
//  qa/evohitch.mjs said the hot call was the one that blocks on shader links,
//  qa/shaderstall.mjs proved 8 of the 9 post-boot programs link on that single
//  frame. Two fixes then failed — renderer.compile() at boot, and reveal-all +
//  compile — which together prove the materials are not merely hidden at boot:
//  they do not EXIST yet. Something builds them at evolution.
//
//  This names that something. It wraps Object3D.add and Material creation
//  after boot, then reports everything constructed or parented on the stalling
//  frames. The answer is a list of object/material types with their geometry,
//  which is what a precompile has to reproduce at boot to be worth shipping.
//
//  Reads window.__THREE (the game already exposes it for QA), so nothing in
//  the engine changes and nothing ships.
//
//    node qa/evoadds.mjs
//
import { chromium } from 'playwright';

const URL = process.env.HITCH_URL || 'http://localhost:4177/';
const UNTIL = Number(process.env.ADDS_UNTIL || 16);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
const page = await ctx.newPage();
// A PROBE THAT HANGS TELLS YOU NOTHING. The first run of this file sat for
// fifty minutes at idle load with an empty log — the page had thrown, the
// match clock stopped advancing, and waitForFunction simply waited out its
// timeout. Any instrument that can stall must say why.
page.on('pageerror', (e) => console.log('PAGE ERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR: ' + m.text().slice(0, 200)); });

// count links per frame exactly as qa/shaderstall.mjs does, so the two agree
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

await page.goto(URL);
await page.waitForFunction(() => window.__matchState && window.__matchState().t > 1, undefined, { timeout: 180000 });

// patch AFTER boot: everything that exists now is warm, so anything recorded
// from here is by definition a late arrival — which is the whole question
await page.evaluate(() => {
  const T = window.__THREE, S = window.__shaderStats;
  const adds = [];
  window.__addRec = adds;
  const describe = (o) => {
    const m = o.material;
    const mat = Array.isArray(m) ? m.map((x) => x.type).join('+') : (m ? m.type : '-');
    const custom = Array.isArray(m) ? m.some((x) => x.isShaderMaterial) : !!(m && m.isShaderMaterial);
    return `${o.type}/${mat}${custom ? '(custom)' : ''}${o.name ? ' "' + o.name + '"' : ''}`;
  };
  // RECORD, NEVER INTERFERE. three.js calls add() from inside its own
  // internals, and the first version of this patch could throw from describe()
  // — which does not show up as a probe error, it shows up as a dead game and
  // an instrument that waits forever. Cap the log too: an unbounded array on a
  // hot path is its own way of killing the thing being measured.
  const origAdd = T.Object3D.prototype.add;
  T.Object3D.prototype.add = function (...objs) {
    try {
      for (const o of objs) {
        if (o && o.isObject3D && adds.length < 4000) {
          adds.push({ frame: S.frame, what: describe(o), parent: this.name || this.type });
        }
      }
    } catch { /* recording must never break the thing being recorded */ }
    return origAdd.apply(this, objs);
  };
});

await page.evaluate(() => {
  const S = window.__shaderStats;
  const rec = { d: [], r: [], links: [] };
  window.__rec = rec;
  let last = performance.now(), lastLinks = S.links;
  const tick = () => {
    const now = performance.now();
    rec.d.push(now - last); last = now;
    rec.r.push(window.__matchState ? +window.__matchState().r.toFixed(2) : 0);
    rec.links.push(S.links - lastLinks); lastLinks = S.links;
    S.frame++;
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

await page.waitForFunction((u) => window.__matchState && window.__matchState().t > u, UNTIL, { timeout: 480000 });

const out = await page.evaluate(() => {
  const { d, links } = window.__rec;
  const sorted = [...d].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  const linkFrames = [...new Set(window.__shaderStats.linkFrames)].filter((f) => f > 0);
  const adds = window.__addRec;
  // everything added on, or in the two frames before, a frame that linked
  const near = new Set();
  for (const lf of linkFrames) for (let f = lf - 2; f <= lf; f++) near.add(f);
  const tally = new Map();
  for (const a of adds) {
    if (!near.has(a.frame)) continue;
    const k = `f${a.frame}  ${a.what}  → parent ${a.parent}`;
    tally.set(k, (tally.get(k) || 0) + 1);
  }
  return {
    median: Math.round(med),
    linkFrames,
    totalAddsAfterBoot: adds.length,
    nearLinks: [...tally.entries()].map(([k, n]) => `${n}x  ${k}`).slice(0, 30),
    allLate: [...new Set(adds.map((a) => a.what))].slice(0, 20),
  };
});

console.log(`median ${out.median}ms | frames that linked: ${JSON.stringify(out.linkFrames)}`);
console.log(`objects added after boot: ${out.totalAddsAfterBoot}`);
console.log('── added ON or JUST BEFORE a linking frame ──');
for (const l of out.nearLinks) console.log('  ' + l);
console.log('── every distinct late-added object type ──');
for (const l of out.allLate) console.log('  ' + l);
await browser.close();
