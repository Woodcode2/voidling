// qa/shaderwarm.mjs — EVERY SHADER BEFORE THE MATCH, NOT ON FIRST SIGHT.
//
// The owner's recording of 2026-09-25 (Skylark, Safari, iPhone 17 Pro Max): one
// 950 ms freeze at 14.59 s — the canvas stops on a "+49" bite while the DOM
// progress bar keeps animating, which is the signature of a stall inside the
// WebGL work and not in the page — and right after it, things appear that had
// not been on screen before: sparkles round the void, then a rival entering the
// frame. WebKit compiles and links a WebGL program the first time a material is
// DRAWN, and three asks for the program's uniforms on that first draw, which
// waits for the link to finish. On a phone that is hundreds of milliseconds per
// program, on the main thread, in the middle of play. Before this probe nothing
// in src called renderer.compile, compileAsync or initTexture.
//
// So this probe counts the thing itself. An init script wraps the WebGL2 (and
// WebGL1) context's linkProgram — plus shaderSource/attachShader so each link
// can be NAMED by the SHADER_TYPE line three writes into every program — and the
// big texture uploads (texImage2D / texSubImage2D / texStorage2D of 256x256 or
// more), and stamps every call with __matchState() at the moment it happened.
// Then it plays a real match on each world through the game's own hooks: the
// descent, a steered drive, a NOMS chain long enough for the pill, the crown and
// the cash-in, a rival walked in who charges, nibbles and is eaten, two evolve
// ceremonies, every form's size, the beat schedule, a tour of the island at a
// size that sees most of it, and the end card with its party.
//
//   node qa/shaderwarm.mjs [port] [world ...]        (default: 4177 skylark maple)
//
// THE BAR: 0 programs linked after the match's first playable frame, on every
// world run. "First playable frame" is the first stamp that reads match time
// t > 0 — the first frame after the touch that starts the match — and it is
// latched, so the end card (where the game resets t to 0) still counts as after.
//
// TIME: every wait is on the GAME's clock (tClock / match t), never the wall —
// under this software renderer the match clock runs ~14x slower than real time
// (GOVERNOR.md rule 4). Wall time is used for one thing only: the load-side
// cost, i.e. how long from navigation until PLAY is live, and how long from the
// tap on PLAY until the first playable frame, so a warm-up that moves work to
// the loading screen shows up as a number here instead of disappearing.
//
// The quality ladder is PINNED at rung 0 (bloom + shadows — the rung a fast
// phone runs) for the counted run: under swiftshader the adapter demotes within
// seconds, and a demotion across the bloom rung re-keys every program in the
// game (render-target vs screen tone mapping), which is a real cost but a
// different question. It is asked separately at the end and printed, not barred.
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const ARGS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = ARGS[0] || '4177';
const WORLDS = ARGS.slice(1).length ? ARGS.slice(1) : ['skylark', 'maple'];
const VERBOSE = process.argv.includes('--verbose');

// ── THE HOOK ────────────────────────────────────────────────────────────────
// Serialised into the page. Everything it records goes on window.__sw; the GL
// program objects themselves stay in a closure array so the report can map them
// back to three's WebGLProgram (and from there to the materials using them).
const HOOK = () => {
  const L = { ev: [], play: null, playT: null, act: 'boot', dropped: 0 };
  window.__sw = L;
  const SRC = new WeakMap(), ATT = new WeakMap(), PROGS = [];
  window.__swProg = (i) => PROGS[i];
  const DEFS = ['USE_INSTANCING', 'USE_INSTANCING_COLOR', 'USE_SHADOWMAP', 'USE_MAP', 'USE_SKINNING',
    'USE_COLOR', 'USE_COLOR_ALPHA', 'OPAQUE', 'TONE_MAPPING', 'USE_FOG', 'DEPTH_PACKING', 'FLAT_SHADED',
    'USE_ALPHATEST', 'DOUBLE_SIDED', 'FLIP_SIDED', 'USE_SIZEATTENUATION', 'USE_EMISSIVEMAP', 'USE_NORMALMAP',
    'USE_ALPHAMAP', 'USE_MORPHTARGETS', 'USE_BATCHING'];
  const stamp = () => {
    let t = null, armed = null, tClock = null;
    try {
      const ms = window.__matchState ? window.__matchState() : null;
      if (ms) { t = ms.t; armed = !!ms.armed; tClock = ms.tClock; }
    } catch { /* the API is not up yet */ }
    if (t > 0 && L.play === null) { L.play = performance.now(); L.playT = t; }
    return { w: performance.now(), t, tc: tClock, armed, post: L.play !== null, act: L.act,
      end: !!document.getElementById('end')?.classList.contains('show') };
  };
  const push = (e) => { if (L.ev.length < 20000) L.ev.push(e); else L.dropped++; };
  const dimsOf = (s) => (s ? [s.width || s.videoWidth || s.displayWidth || 0, s.height || s.videoHeight || s.displayHeight || 0] : [0, 0]);
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C) continue;
    const P = C.prototype;
    const ss = P.shaderSource;
    P.shaderSource = function (sh, src) { SRC.set(sh, src); return ss.call(this, sh, src); };
    const at = P.attachShader;
    P.attachShader = function (pr, sh) {
      let a = ATT.get(pr); if (!a) { a = []; ATT.set(pr, a); }
      a.push(sh); return at.call(this, pr, sh);
    };
    const lp = P.linkProgram;
    P.linkProgram = function (pr) {
      const s = stamp();
      const src = (ATT.get(pr) || []).map((sh) => SRC.get(sh) || '').join('\n');
      const type = (src.match(/#define SHADER_TYPE (\S+)/) || [])[1] || 'raw';
      const name = ((src.match(/#define SHADER_NAME ([^\n]*)/) || [])[1] || '').trim();
      const defs = DEFS.filter((d) => new RegExp(`#define ${d}\\b`).test(src));
      // THE LIGHTS AT THE MOMENT OF THE LINK. Their count is part of every
      // program's key — lit or not — and three writes it into the source as a
      // bare number, not a #define, so it cannot be read off the text. A light
      // switching on (Skylark's burner) re-keys the whole world, and this is
      // where that shows. The scene's lights are found once, then counted.
      try {
        if (!L.lights && window.__scene) { L.lights = []; window.__scene.traverse((o) => { if (o.isLight) L.lights.push(o); }); }
        if (L.lights) {
          const pl = L.lights.filter((l) => l.isPointLight && l.visible).length;
          if (pl) defs.push(`pointLights=${pl}`);
        }
        if (window.__renderer && !window.__renderer.shadowMap.enabled) defs.push('shadowMap OFF');
      } catch { /* not up yet */ }
      PROGS.push(pr);
      push({ k: 'link', ...s, type, name, defs, i: PROGS.length - 1 });
      return lp.call(this, pr);
    };
    const wrapTex = (fn, dims) => {
      const o = P[fn]; if (!o) return;
      P[fn] = function (...a) {
        const [tw, th, alloc] = dims(a);
        if (tw >= 256 && th >= 256) push({ k: 'tex', fn, tw, th, alloc, ...stamp() });
        return o.apply(this, a);
      };
    };
    // texImage2D: (target, level, ifmt, w, h, border, fmt, type, data[, off]) or (target, level, ifmt, fmt, type, source)
    wrapTex('texImage2D', (a) => (a.length >= 8 ? [a[3], a[4], a[8] == null] : [...dimsOf(a[5]), false]));
    wrapTex('texSubImage2D', (a) => (a.length >= 8 ? [a[4], a[5], false] : [...dimsOf(a[6]), false]));
    wrapTex('texStorage2D', (a) => [a[3], a[4], true]);
    wrapTex('compressedTexImage2D', (a) => [a[3], a[4], false]);
  }
};

// a 1x1 opaque PNG: the poster stand-in (see the route below)
const STAND_IN_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

const die = (msg) => { console.log(`  FAIL — ${msg}`); process.exitCode = 1; };

async function runWorld(browser, world) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  // THE MENU IS A PAINTING ON THE PHONE. Every world's menu hangs a poster from
  // /assets/hf/, which vercel.json proxies to a CDN this sandbox cannot reach —
  // so here the poster 404s and the live 3D menu is drawn instead, compiling
  // programs on a screen that on his iPhone draws nothing at all (posterUp stops
  // the render outright). A stand-in image for anything under /assets/hf/ that
  // the server cannot serve puts the probe on the phone's path. Files the build
  // does vendor (the sky, the void's starfield) are served as they are.
  await p.route('**/assets/hf/**', async (r) => {
    const res = await r.fetch().catch(() => null);
    if (res && res.ok()) return r.fulfill({ response: res });
    return r.fulfill({ status: 200, contentType: 'image/png', body: STAND_IN_PNG });
  });
  await p.addInitScript(HOOK);
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidFirstNom', '1'); localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { /* private mode */ } });

  const w0 = Date.now();
  // ?manual=1: THE PHONE'S OPENING, NOT THE HARNESS'S. Under webdriver the game
  // starts its own match in the same task as PLAY (AUTO_START), so the armed
  // idle — the high establishing view a child looks at before her first touch —
  // is never drawn. On the phone it is, and then the touch starts the descent.
  // The probe touches, like opening.mjs.
  await p.goto(`http://127.0.0.1:${PORT}/?w=${world}&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 600000, polling: 250 });
  const need = await p.evaluate(() => ['__matchState', '__eatNearest', '__rivalBeside', '__charge', '__bite',
    '__forceEvolve', '__stages', '__setVoidR', '__rushClock', '__warpVoid', '__pinQuality', '__renderer', '__scene']
    .filter((k) => !window[k]));
  if (need.length) { await ctx.close(); throw new Error(`this build has no ${need.join(', ')}`); }
  // PLAY IS LIVE when the boot cover is gone and the button can take a tap
  await p.waitForFunction(() => {
    const ls = document.getElementById('loadScr');
    const b = document.getElementById('btnPlay');
    return (!ls || !ls.classList.contains('show')) && !!b && b.offsetParent !== null;
  }, null, { timeout: 600000, polling: 100 });
  const bootMs = Date.now() - w0;
  // everything linked from here to the first playable frame is load-side work
  await p.evaluate(() => { window.__sw.act = 'menu'; window.__pinQuality(0); });
  const frames = (n) => p.evaluate((k) => new Promise((res) => {
    let i = 0; const f = () => (++i >= k ? res() : requestAnimationFrame(f)); requestAnimationFrame(f);
  }), n);
  await frames(6);
  const poster = await p.evaluate(() => document.body.classList.contains('poster'));
  const gate = await p.$('#tapGate.show');
  if (gate) { await p.click('#tapGate'); await p.waitForTimeout(350); }
  await p.evaluate(() => { window.__sw.act = 'armed'; window.__sw.tap = performance.now(); });
  await enterMatch(p, world);
  await p.waitForFunction(() => !!window.__matchState?.().armed, null, { timeout: 600000, polling: 50 });
  // the armed idle: two frames drawn, then how long the tap took to get there
  await frames(2);
  const tapToArmed = await p.evaluate(() => Math.round(performance.now() - window.__sw.tap));
  {
    const t0 = await p.evaluate(() => window.__matchState().tClock);
    await p.waitForFunction((a) => window.__matchState().tClock >= a, t0 + 0.6, { timeout: 600000, polling: 100 });
  }
  const warm = await p.evaluate(() => (typeof window.__shaderWarm === 'function' ? window.__shaderWarm() : null));

  // ── the touch, and the drive: steer at the nearest edible (smoke.mjs's path) ─
  await p.evaluate(() => { window.__sw.act = 'touch'; });
  await p.evaluate(() => {
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => {
      if (window.__sw.stopDrive) return;
      const vs = window.__voidState(); let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
      }
      if (best) {
        const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true }));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0, null, { timeout: 600000, polling: 50 });

  const act = (a) => p.evaluate((x) => { window.__sw.act = x; }, a);
  const tc = () => p.evaluate(() => window.__matchState().tClock);
  /** wait `s` seconds of the game's own clock */
  const waitClock = async (s, timeout = 900000) => {
    const t0 = await tc();
    await p.waitForFunction((a) => window.__matchState().tClock >= a, t0 + s, { timeout, polling: 100 });
  };
  const log = (s) => { if (VERBOSE) console.log(`    [${world}] ${s}`); };

  // 1. the descent, to the frame the controls go live and the shadows return
  await act('descent');
  await p.waitForFunction(() => { const m = window.__matchState(); return m.t > 0 && !(m.introT > 0); },
    null, { timeout: 900000, polling: 100 });
  await waitClock(1.0);
  log('descent done');

  // 2. a NOMS chain: fourteen bites on consecutive frames (pill at 5, crown at
  //    10), then let it lapse so the cash-in fires
  await act('noms');
  for (let i = 0; i < 14; i++) {
    await p.evaluate(() => window.__eatNearest(0));
    await frames(1);
  }
  const combo = await p.evaluate(() => window.__matchState().combo);
  await waitClock(2.4);
  log(`noms: chain reached ${combo}`);

  // 3. a rival: walked in, charges, nibbles, is eaten
  await act('rival');
  let who = null;
  for (let i = 0; i < 120 && !who; i++) {
    who = await p.evaluate(() => window.__rivalBeside(undefined, 2.4, 0.6));
    if (!who) await frames(1);
  }
  if (who) {
    await waitClock(1.0);
    await p.evaluate((n) => window.__charge(n), who.name);
    await waitClock(0.8);
    await p.evaluate(() => window.__bite(false));
    await waitClock(0.8);
    let killed = false;
    for (let i = 0; i < 8 && !killed; i++) {
      const e0 = await p.evaluate(() => window.__matchState().ev.eaten);
      await p.evaluate((n) => window.__rivalBeside(n, 0.5, 0.6), who.name);
      await frames(1);
      killed = (await p.evaluate(() => window.__matchState().ev.eaten)) > e0;
    }
    await waitClock(1.5);
    log(`rival ${who.name}: ${killed ? 'eaten' : 'NOT eaten'}`);
  } else log('no rival could be walked in');

  // 4. two evolve ceremonies through the real stage check
  await act('evolve');
  for (let k = 0; k < 2; k++) {
    const c0 = await p.evaluate(() => window.__stages().ceremonies);
    await p.evaluate(() => window.__forceEvolve());
    await p.waitForFunction((c) => window.__stages().ceremonies > c, c0, { timeout: 600000, polling: 100 }).catch(() => {});
    await waitClock(1.6);
  }
  log(`ceremonies: ${await p.evaluate(() => window.__stages().ceremonies)}`);

  // 5. the beat schedule: wind the clock through the match. BEFORE the forms,
  //    at the size the match reached by itself: at r 14 a dot-1 level is won
  //    on the spot within seconds, and a won match plays no more beats.
  await act('beats');
  for (const c of [150, 125, 100, 75, 50, 25]) {
    await p.evaluate((x) => window.__rushClock(x), c);
    await waitClock(0.8);
  }

  // 6. every form's look, and the camera that comes with each size
  await act('forms');
  for (const r of [1.7, 2.6, 3.8, 5.8, 8.5, 14]) {
    await p.evaluate((x) => window.__setVoidR(x), r);
    await waitClock(0.5);
  }

  // 7. a tour: six far-apart edibles (farthest-point sampling), at r 14
  await act('tour');
  const stops = await p.evaluate(() => {
    const pts = window.__edibles.filter((e) => e.mesh).map((e) => ({ x: e.mesh.position.x, z: e.mesh.position.z }));
    if (!pts.length) return [];
    const out = [pts[0]];
    while (out.length < 6) {
      let best = null, bd = -1;
      for (const q of pts) {
        let m = Infinity; for (const o of out) m = Math.min(m, (q.x - o.x) ** 2 + (q.z - o.z) ** 2);
        if (m > bd) { bd = m; best = q; }
      }
      out.push(best);
    }
    return out;
  });
  for (const s of stops) {
    await p.evaluate(([x, z]) => window.__warpVoid(x, z), [s.x, s.z]);
    await waitClock(0.35);
  }

  // 8. the whistle, the end card and its party (a level can also be won on the
  //    spot, in which case the card is already up and this only waits)
  const early = await p.evaluate(() => document.getElementById('end')?.classList.contains('show'));
  log(`end card already up before the whistle: ${early}`);
  await act('end');
  await p.evaluate(() => window.__rushClock(0.05));
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null,
    { timeout: 900000, polling: 100 });
  await waitClock(3.0);
  await p.evaluate(() => { window.__sw.stopDrive = true; });

  // ── collect ────────────────────────────────────────────────────────────────
  const res = await p.evaluate(() => {
    const L = window.__sw, r = window.__renderer;
    const progs = r.info.programs || [];
    const byGl = new Map(progs.map((pp) => [pp.program, pp]));
    // which materials (and on which objects) use each three program
    const users = new Map();
    window.__scene.traverse((o) => {
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) {
        const pr = r.properties.get(m);
        if (!pr || !pr.programs) continue;
        for (const prog of pr.programs.values()) {
          if (!users.has(prog)) users.set(prog, new Set());
          const s = users.get(prog);
          if (s.size < 3) s.add(`${m.type}${m.name ? ` "${m.name}"` : ''} on ${o.name || o.type}${o.parent?.name ? ` < ${o.parent.name}` : ''}`);
        }
      }
    });
    const links = L.ev.filter((e) => e.k === 'link').map((e) => {
      const pp = byGl.get(window.__swProg(e.i));
      return { ...e, who: pp && users.has(pp) ? [...users.get(pp)] : [], pid: pp ? pp.id : null };
    });
    const tex = L.ev.filter((e) => e.k === 'tex');
    return { links, tex, dropped: L.dropped, programs: progs.length };
  });
  // ── the ladder, asked separately: rung 0 -> 1 (pixel ratio and shadow map
  //    size), then 1 -> 2 (the bloom rung: render target -> screen). Printed,
  //    not barred — the ladder is its own question.
  const step = async (n) => {
    await p.evaluate((k) => { window.__sw.act = `ladder${k}`; window.__sw.mark = window.__sw.ev.length; window.__pinQuality(k); }, n);
    await frames(3);
    return p.evaluate(() => {
      const ev = window.__sw.ev.slice(window.__sw.mark);
      return { links: ev.filter((e) => e.k === 'link').length, allocs: ev.filter((e) => e.k === 'tex' && e.alloc).length };
    });
  };
  const ladder = { r1: await step(1), r2: await step(2) };
  await ctx.close();
  return { world, bootMs, tapToArmed, poster, warm, combo, who, errs, ladder, ...res };
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
console.log(`\n  SHADER WARM — every program linked before the first playable frame @ :${PORT}`);
let bad = 0;
const rows = [];
for (const world of WORLDS) {
  let r;
  try { r = await runWorld(browser, world); } catch (e) { die(`${world}: the run did not finish — ${String(e).slice(0, 200)}`); bad++; continue; }
  rows.push(r);
  const pre = r.links.filter((e) => !e.post), post = r.links.filter((e) => e.post);
  const byAct = {};
  for (const e of post) byAct[e.act] = (byAct[e.act] || 0) + 1;
  const preBy = {};
  for (const e of pre) preBy[e.act] = (preBy[e.act] || 0) + 1;
  const texPost = r.tex.filter((e) => e.post && !e.alloc);
  const allocPost = r.tex.filter((e) => e.post && e.alloc);
  console.log(`\n  ${world}`);
  console.log(`    load side (wall, swiftshader): PLAY live ${(r.bootMs / 1000).toFixed(1)} s after navigation; PLAY tap -> armed idle drawn ${r.tapToArmed} ms; menu ${r.poster ? 'a poster (the phone\'s path)' : 'LIVE 3D — not the phone\'s path'}`);
  console.log(r.warm ? `    warm-up: ${JSON.stringify(r.warm)}` : '    warm-up: none on this build');
  console.log(`    programs linked before the first playable frame: ${pre.length}  (${Object.entries(preBy).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  console.log(`    programs linked AFTER the first playable frame:  ${post.length}  ${post.length ? `(${Object.entries(byAct).map(([k, v]) => `${k} ${v}`).join(', ')})` : ''}`);
  if (VERBOSE) for (const e of pre) console.log(`      (before) ${e.act.padEnd(8)} ${e.type}${e.name ? ` "${e.name}"` : ''} [${e.defs.join(' ')}]${e.who.length ? `  <- ${e.who.join('; ')}` : ''}`);
  for (const e of post.slice(0, 60)) {
    console.log(`      t=${e.t === null ? '-' : e.t.toFixed(2)} ${e.end ? '[end card] ' : ''}${e.act.padEnd(8)} ${e.type}${e.name ? ` "${e.name}"` : ''} [${e.defs.join(' ')}]${e.who.length ? `  <- ${e.who.join('; ')}` : ''}`);
  }
  if (post.length > 60) console.log(`      … and ${post.length - 60} more`);
  console.log(`    big texture uploads after the first playable frame: ${texPost.length}${texPost.length ? ' — ' + texPost.slice(0, 8).map((e) => `${e.fn} ${e.tw}x${e.th} (${e.act}, t=${e.t === null ? '-' : e.t.toFixed(2)})`).join(', ') : ''}`);
  console.log(`    big texture allocations after it: ${allocPost.length}${allocPost.length ? ' — ' + allocPost.slice(0, 8).map((e) => `${e.fn} ${e.tw}x${e.th} (${e.act}, t=${e.t === null ? '-' : e.t.toFixed(2)})`).join(', ') : ''}`);
  console.log(`    the run: NOMS chain ${r.combo}, rival ${r.who ? r.who.name : 'none'}, programs alive at the end ${r.programs}${r.dropped ? `, ${r.dropped} events dropped` : ''}`);
  console.log(`    (not barred) the quality ladder mid-match: rung 0 -> 1 linked ${r.ladder.r1.links} programs and made ${r.ladder.r1.allocs} big allocations; 1 -> 2 (bloom off) linked ${r.ladder.r2.links}`);
  if (r.errs.length) console.log(`    page errors: ${r.errs.slice(0, 3).join(' | ')}`);
  if (post.length > 0) { console.log(`  FAIL — ${world}: ${post.length} program(s) linked after the match's first playable frame (bar 0)`); bad++; }
  else console.log(`  PASS — ${world}: 0 programs linked after the match's first playable frame (${pre.length} linked before it)`);
}
await browser.close();
if (rows.length === WORLDS.length && bad === 0) console.log(`\n  PASS — ${WORLDS.join(', ')}: no shader compiled on first sight during play`);
else { console.log(`\n  FAIL — ${bad} of ${WORLDS.length} world(s) compiled shaders during play or did not finish`); process.exitCode = 1; }
