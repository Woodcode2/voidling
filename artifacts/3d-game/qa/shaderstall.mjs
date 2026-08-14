// ══════════════════════════════════════════════════════════════════════════
//  SHADERSTALL — does a shader compile land on the frames that stutter?
// ══════════════════════════════════════════════════════════════════════════
//
//  qa/evohitch.mjs profiled the evolution window and found the top JS self
//  time was getProgramParameter — the WebGL call that BLOCKS while a shader
//  program links — with frame spikes at radius 1.0 (opening) and 1.09 (the
//  first evolution). That is a strong hypothesis and nothing more: a profile
//  says "this function was hot", not "this function caused that frame".
//
//  So this wraps the live WebGL context before the game ever draws, counts
//  linkProgram per frame, and prints the frames where links and spikes
//  coincide. If evolution stutters because a material is compiled the first
//  time it is drawn, the link count on that frame is non-zero and the case is
//  closed. If the spike frames link nothing, the hypothesis is dead and the
//  cost is elsewhere — which is the outcome this probe exists to allow.
//
//    node qa/shaderstall.mjs
//
import { chromium } from 'playwright';

const URL = process.env.HITCH_URL || 'http://localhost:4177/';
const UNTIL = Number(process.env.STALL_UNTIL || 16);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });
const page = await ctx.newPage();

// WRAP BEFORE THE PAGE RUNS. getContext is patched in an init script so the
// game's own renderer hands back an instrumented context — no engine changes,
// nothing shipped, and it cannot miss a compile that happens during boot.
await page.addInitScript(() => {
  const S = { frame: 0, links: 0, perFrame: [], events: [] };
  window.__shaderStats = S;
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const gl = orig.call(this, type, ...rest);
    if (gl && (type === 'webgl2' || type === 'webgl') && !gl.__wrapped) {
      gl.__wrapped = true;
      const link = gl.linkProgram.bind(gl);
      // NAME THE PROGRAM, do not just count it. three.js stamps every shader
      // with `#define SHADER_NAME <MaterialName>` plus the define block that
      // makes this variant distinct, so the source itself says which material
      // compiled and why it is a separate program. Without this the probe can
      // prove a stall exists and never say what to precompile — which is
      // exactly how a plausible fix (renderer.compile at boot) got built and
      // shipped nothing: the materials were not in the scene to be compiled.
      gl.linkProgram = (p) => {
        S.links++;
        let name = '?', defs = '';
        try {
          for (const sh of gl.getAttachedShaders(p) || []) {
            const src = gl.getShaderSource(sh) || '';
            const m = src.match(/#define SHADER_NAME ([^\n]+)/);
            if (m) name = m[1].trim();
            if (!defs) {
              defs = (src.match(/#define \w+/g) || [])
                .map((d) => d.replace('#define ', ''))
                .filter((d) => d !== 'SHADER_NAME' && !/^(GL|PI|EPSILON|RECIPROCAL)/.test(d))
                .slice(0, 8).join(',');
            }
          }
        } catch { /* a driver that will not introspect still counts */ }
        S.events.push({ frame: S.frame, name, defs });
        return link(p);
      };
    }
    return gl;
  };
});

await page.goto(URL);
await page.waitForFunction(() => window.__matchState && window.__matchState().t > 1, undefined, { timeout: 180000 });

await page.evaluate(() => {
  const S = window.__shaderStats;
  const rec = { d: [], r: [], links: [] };
  window.__stallRec = rec;
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

// identical drive to qa/hitch.mjs
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

await page.waitForFunction((u) => window.__matchState && window.__matchState().t > u, UNTIL, { timeout: 900000 });

const out = await page.evaluate(() => {
  const { d, r, links } = window.__stallRec;
  const sorted = [...d].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  const rows = [];
  for (let i = 0; i < d.length; i++) {
    const spike = d[i] > med * 2.5;
    if (spike || links[i] > 0) rows.push({ i, ms: Math.round(d[i]), r: r[i], links: links[i], spike });
  }
  const spikes = rows.filter((x) => x.spike);
  return {
    median: Math.round(med),
    totalLinks: window.__shaderStats.links,
    lateProgs: window.__shaderStats.events.filter((e) => e && e.frame > 0)
      .map((e) => `f${e.frame} ${e.name} [${e.defs}]`),
    linksAfterBoot: links.reduce((a, b) => a + b, 0),
    spikeCount: spikes.length,
    spikesWithLinks: spikes.filter((x) => x.links > 0).length,
    rows: rows.slice(0, 25),
  };
});

console.log(`median ${out.median}ms | programs linked total ${out.totalLinks}, after boot ${out.linksAfterBoot}`);
console.log(`spikes ${out.spikeCount}, of which linked a shader: ${out.spikesWithLinks}`);
console.log('frame  delta   radius  links  spike');
for (const x of out.rows) {
  console.log(`${String(x.i).padStart(5)} ${String(x.ms).padStart(6)}ms ${String(x.r).padStart(7)} ${String(x.links).padStart(6)}  ${x.spike ? 'SPIKE' : ''}`);
}
if (out.lateProgs?.length) {
  console.log('── programs linked AFTER the first frame (the ones to precompile) ──');
  for (const l of out.lateProgs) console.log('  ' + l);
}
console.log(out.spikesWithLinks > 0
  ? 'VERDICT: shader linking lands on stuttering frames — precompile is worth building'
  : 'VERDICT: spikes link no shaders — the compile hypothesis is REFUTED, look elsewhere');
await browser.close();
