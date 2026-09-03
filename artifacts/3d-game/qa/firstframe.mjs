// THE FIRST FRAME — the evidence pack for Stream D (brief §2D).
//
// Nobody has art-directed the establishing shot because everyone believed it
// used the gameplay camera. It does not: for COPY.introLen match-seconds the
// camera dives from camDist 300 to 38 while its subject slides from the world's
// hero landmark to the void (prototype3d.ts, "THE ESTABLISHING SHOT"). This
// probe photographs that swing in every world, as the player sees it (the DOM
// title card and all) and as the canvas alone, plus the two screens that come
// before it — the boot loader and the menu splash — and measures the contrast
// of the "THE CUTE" line against the real pixels behind its glyphs.
//
//   SEED=7 node qa/firstframe.mjs [port] [worlds...]
//
// Output: qa/out/firstframe/<world>_<moment>.png (page) and _canvas twins,
// qa/out/firstframe/<world>.json with every number printed. It is an evidence
// pack, not a gate: the only bar it applies is WCAG's 3:1 (large text) and
// 4.5:1 (body text) to the splash lines, and it prints a bare PASS/FAIL for
// those so the gate can carry it later.
//
// Every frame is a CANVAS or PAGE screenshot — never a render target (the
// NoToneMapping trap). Moments are in MATCH seconds off __matchState().t.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

// Flags (the gate spawns argv, not env): --splash = the two screens only, at
// every viewport in --views=WxH@d,... ; asserts the splash lines' contrast and
// that the loader does not print the game's name twice.
const FLAGS = process.argv.slice(2).filter((a) => a.startsWith('--'));
const ARGS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = ARGS[0] || '4177';
const WORLDS = ARGS.slice(1).length ? ARGS.slice(1) : ['maple', 'pirate', 'gameday', 'lantern', 'powder'];
const VIEWS_FLAG = (FLAGS.find((f) => f.startsWith('--views=')) || '').slice(8);
// --first: the FIRST-EVER run — voidPlayed unset, so firstRun/teachDrag are true
// and the DRAG pill, the welcome and the banner fire. The default pack shoots
// a returning player (the choreography review's finding 5: the frame §2D asks
// about had never been photographed). Frames are tagged _first.
const FIRST = FLAGS.includes('--first');
const FTAG = FIRST ? '_first' : '';
const SEED = process.env.SEED ? Number(process.env.SEED) : null;
const OUT = 'qa/out/firstframe';
// VIEW=430x932@2 (default; the lookbook's phone) — the owner's 2026-08-29
// screenshot is 440x956@3. SPLASH_ONLY=1 shoots the loader and the menu only.
const SPLASH_ONLY = process.env.SPLASH_ONLY === '1' || FLAGS.includes('--splash');
const VIEWS = (VIEWS_FLAG || process.env.VIEW || '430x932@2').split(',').map((v) => { const m = v.match(/(\d+)x(\d+)@([\d.]+)/); return { width: +m[1], height: +m[2], dpr: +m[3], tag: (VIEWS_FLAG || process.env.VIEW) ? `_${m[1]}x${m[2]}` : '' }; });
let VP = VIEWS[0], VTAG = VP.tag;
mkdirSync(OUT, { recursive: true });
// COPY.introLen per world, copied from prototype3d.ts WORLD_COPY (the table is
// not on the debug surface). A wrong number here shows up as the "u" column
// disagreeing with the picture, which is why both are printed.
const INTRO_LEN = { maple: 2.2, pirate: 2.2, gameday: 3.4, lantern: 3.6, powder: 3.5 };

const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const q = (arr, k) => arr.length ? arr[Math.floor(k * (arr.length - 1))] : 0;

// CONTRAST AGAINST THE REAL PIXELS. Two clipped shots of the element's box —
// with the text, and with it visibility:hidden — differ exactly where the
// glyphs (and their text-shadow glow) paint. The glyph core is the bright part
// of that difference (Y > 140), the glow is left out on purpose: a child reads
// the letters, not the halo. Per glyph pixel: contrast between what the eye
// gets (shot A) and what sits behind it (shot B).
async function contrast(p, sel, label) {
  const box = await p.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, text: el.textContent.trim(), color: getComputedStyle(el).color, size: getComputedStyle(el).fontSize }; }, sel);
  if (!box || box.w < 2) return { label, missing: true };
  const clip = { x: Math.max(0, box.x - 4), y: Math.max(0, box.y - 4), width: box.w + 8, height: box.h + 8 };
  const A = PNG.sync.read(await p.screenshot({ clip }));
  await p.evaluate((s) => { document.querySelector(s).style.visibility = 'hidden'; }, sel);
  const B = PNG.sync.read(await p.screenshot({ clip }));
  await p.evaluate((s) => { document.querySelector(s).style.visibility = ''; }, sel);
  const rs = []; let bgR = 0, bgG = 0, bgB = 0, n = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    const d = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]);
    const ya = 0.2126 * A.data[i] + 0.7152 * A.data[i + 1] + 0.0722 * A.data[i + 2];
    if (d < 24 || ya < 140) continue;
    rs.push(ratio(lum(A.data[i], A.data[i + 1], A.data[i + 2]), lum(B.data[i], B.data[i + 1], B.data[i + 2])));
    bgR += B.data[i]; bgG += B.data[i + 1]; bgB += B.data[i + 2]; n++;
  }
  rs.sort((a, b) => a - b);
  const r = { label, text: box.text, css: box.color, size: box.size, glyphPx: n, p10: +q(rs, 0.1).toFixed(2), median: +q(rs, 0.5).toFixed(2), under3: n ? +(100 * rs.filter((v) => v < 3).length / n).toFixed(0) : 0, under45: n ? +(100 * rs.filter((v) => v < 4.5).length / n).toFixed(0) : 0, behind: n ? [Math.round(bgR / n), Math.round(bgG / n), Math.round(bgB / n)] : null };
  console.log(`  contrast ${label.padEnd(14)} "${box.text}" ${box.size} ${box.color}  glyph px ${n}  p10 ${r.p10}:1  median ${r.median}:1  under 3:1 ${r.under3}%  under 4.5:1 ${r.under45}%  behind ${r.behind}`);
  return r;
}

// WHAT IS TALKING AT THIS MOMENT — the channel census the choreography team
// asked for, read off the live DOM at the page shot: the card's computed
// opacity (a wall-clock CSS animation), the hand, the guide pill, the banner,
// the crowd's bubbles (.vb.show), the timer and the size label.
const census = (p) => p.evaluate(() => {
  const op = (id) => { const e = document.getElementById(id); return e ? +(+getComputedStyle(e).opacity).toFixed(2) : null; };
  const ms = window.__matchState?.();
  return { card: op('titlecard'), hand: !!document.querySelector('#hand.show'), guide: !!document.querySelector('#guide.show'), banner: op('banner'),
    bubbles: document.querySelectorAll('.vb.show').length, timer: document.getElementById('timer')?.textContent.trim(), size: document.querySelector('#growth')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 40),
    intro: document.body.classList.contains('intro'), clock: ms ? +ms.clock.toFixed(1) : null, hudOp: op('timer') };
});
const shotPair = async (p, name, ms) => {
  await p.screenshot({ path: `${OUT}/${name}.png` });
  const t1 = await p.evaluate(() => window.__matchState?.().t ?? 0);
  const ch = await census(p);
  // the canvas twin: hide everything that is not the canvas, shoot, restore
  await p.evaluate(() => { const cv = document.querySelector('canvas'); for (const el of Array.from(document.body.children)) if (el !== cv && !el.contains(cv)) { el.dataset.ffHid = el.style.display; el.style.display = 'none'; } });
  await p.screenshot({ path: `${OUT}/${name}_canvas.png` });
  await p.evaluate(() => { for (const el of Array.from(document.body.children)) if (el.dataset.ffHid !== undefined) { el.style.display = el.dataset.ffHid; delete el.dataset.ffHid; } });
  const t2 = await p.evaluate(() => window.__matchState?.().t ?? 0);
  const rec = { moment: name, ...ms, tPage: +t1.toFixed(2), tCanvas: +t2.toFixed(2), ...ch };
  console.log(`  shot ${name.padEnd(24)} page t=${rec.tPage}  canvas t=${rec.tCanvas}${ms.u !== undefined ? `  u=${ms.u}` : ''}  card ${ch.card}  hand ${ch.hand ? 1 : 0}  guide ${ch.guide ? 1 : 0}  banner ${ch.banner}  bubbles ${ch.bubbles}  timer ${ch.timer}  hud ${ch.hudOp}  clock ${ch.clock}`);
  return rec;
};

let fails = 0;
const RUNS = SPLASH_ONLY ? VIEWS.map((v) => ({ WORLD: WORLDS[0], v })) : WORLDS.map((WORLD) => ({ WORLD, v: VIEWS[0] }));
for (const { WORLD, v } of RUNS) {
  VP = v; VTAG = v.tag;
  console.log(`== ${WORLD} ${VP.width}x${VP.height}@${VP.dpr}${SPLASH_ONLY ? ' (splash only)' : ` (introLen ${INTRO_LEN[WORLD]}s)`}`);
  const rec = { world: WORLD, introLen: INTRO_LEN[WORLD], seed: SEED, view: VP, shots: [], contrast: [] };
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: VP.width, height: VP.height }, deviceScaleFactor: VP.dpr });
  p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(({ seed, first }) => {
    try { localStorage.clear(); if (!first) { localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); } localStorage.setItem('voidDailyLast', new Date().toDateString()); localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder'); } catch { }
    if (seed !== null) { let s = seed >>> 0; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  }, { seed: SEED, first: FIRST });
  // 1. THE BOOT LOADER — the literal first frame of the app. Static markup with
  //    class="boot", painted before the module runs; shoot it the instant the
  //    document commits, then again once the module has filled .lName.
  await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'commit', timeout: 300000 });
  await p.waitForSelector('#loadScr', { state: 'attached', timeout: 300000 });
  await p.screenshot({ path: `${OUT}/${WORLD}_boot0${VTAG}.png` });
  await p.waitForFunction(() => document.querySelector('#loadScr .lName')?.textContent.trim().length > 1, null, { timeout: 300000 }).catch(() => { });
  await p.screenshot({ path: `${OUT}/${WORLD}_boot${VTAG}.png` });
  const bootName = await p.evaluate(() => document.querySelector('#loadScr .lName')?.textContent.trim());
  const bootTip = await p.evaluate(() => document.querySelector('#loadScr .lTip')?.textContent.trim());
  console.log(`  boot loader: lName "${bootName}"  tip "${bootTip}"`);
  rec.bootName = bootName;
  const logoText = await p.evaluate(() => document.querySelector('#loadScr .lLogo')?.textContent.replace(/\s+/g, ' ').trim());
  rec.doubled = !!bootName && !!logoText && bootName.replace(/\s+/g, '').toUpperCase() === logoText.replace(/\s+/g, '').toUpperCase();
  if (rec.doubled) { fails++; console.log(`  FAIL-LINE ${WORLD} ${VP.width}x${VP.height}: the loader prints the game's name twice — .lLogo "${logoText}" and .lName "${bootName}"`); }
  // hold the loader on screen while its lines are measured — on a fast local
  // load it can clear between two screenshots and the lines come back "missing"
  await p.evaluate(() => document.querySelector('#loadScr')?.classList.add('show'));
  rec.contrast.push(await contrast(p, '#loadScr .lLogo i', 'boot THE CUTE'));
  rec.contrast.push(await contrast(p, '#loadScr .lName', 'boot lName'));
  await p.evaluate(() => document.querySelector('#loadScr')?.classList.remove('show'));
  // 2. THE MENU SPLASH — key art on its feathered layer, the logo over it.
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.waitForFunction(() => !document.querySelector('#loadScr.show, #loadScr.boot'), null, { timeout: 300000 }).catch(() => { });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/${WORLD}_menu${VTAG}.png` });
  rec.contrast.push(await contrast(p, '#menu .logo i', 'menu THE CUTE'));
  rec.contrast.push(await contrast(p, '#menu .logo', 'menu logo'));
  rec.contrast.push(await contrast(p, '#menu .tag', 'menu tag'));
  if (SPLASH_ONLY) { await b.close(); writeFileSync(`${OUT}/${WORLD}${VTAG}.json`, JSON.stringify(rec, null, 1)); for (const c of rec.contrast) { if (c.missing) continue; const large = parseFloat(c.size) >= 18.66; const bar = large ? 3 : 4.5; if (c.p10 < bar) { fails++; console.log(`  FAIL-LINE ${WORLD} ${VP.width}x${VP.height} ${c.label}: p10 ${c.p10}:1 under the ${bar}:1 bar`); } } continue; }
  // 3. PLAY → the picker → the world card → the intro. Loaded with ?w=<world>
  //    so the card click starts the match in THIS document: the plain path
  //    reloads the page on the card (the tap-gate note in the brief) and the
  //    first sample after a reload came back at t=19 — the whole swing missed.
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  // a first-ever launch may go straight into the world (goingStraightIn); a
  // returning player gets the menu, PLAY, the picker and the card
  const onMenu = await p.evaluate(() => { const m = document.getElementById('menu'); return !!m && getComputedStyle(m).display !== 'none' && (window.__matchState?.().t ?? 0) === 0; });
  if (onMenu) {
    await p.evaluate(() => document.getElementById('btnPlay')?.click());
    await p.waitForTimeout(1400);
    await p.screenshot({ path: `${OUT}/${WORLD}_picker${FTAG}.png` });
    await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), WORLD);
  } else console.log('  straight in: no menu (first-ever path)');
  const t0 = await p.evaluate(() => window.__matchState?.().t ?? -1);
  console.log(`  after the card: t=${t0.toFixed(2)}`);
  const L = INTRO_LEN[WORLD];
  // wait on the page's own frames, not on a polling interval: resolve the
  // first rAF whose match time has reached tt
  const waitT = (tt) => p.evaluate((tt) => new Promise((res) => { const f = () => { const t = window.__matchState?.().t ?? 0; if (t >= tt) res(t); else requestAnimationFrame(f); }; f(); }), tt);
  const moments = FIRST
    ? [['u100', 0.06], ['u75', L * 0.25], ['u50', L * 0.5], ['u25', L * 0.75], ['u0', L], ['p05', L + 0.5], ['settled', L + 1.0], ['p2', L + 2.0], ['p3', L + 3.0], ['p4', L + 4.0]]
    : [['u100', 0.06], ['u75', L * 0.25], ['u50', L * 0.5], ['u25', L * 0.75], ['u0', L], ['settled', L + 1.0]];
  for (const [name, t] of moments) {
    await waitT(t);
    const u = +Math.max(0, Math.min(1, 1 - t / L)).toFixed(2);
    rec.shots.push(await shotPair(p, `${WORLD}_${name}${FTAG}`, { u, tWanted: +t.toFixed(2) }));
  }
  await b.close();
  writeFileSync(`${OUT}/${WORLD}${FTAG}.json`, JSON.stringify(rec, null, 1));
  for (const c of rec.contrast) { if (c.missing) continue; const large = parseFloat(c.size) >= 18.66 || (/CUTE|ENDER/.test(c.text) && parseFloat(c.size) >= 14); const bar = large ? 3 : 4.5; if (c.p10 < bar) { fails++; console.log(`  FAIL-LINE ${WORLD} ${c.label}: p10 ${c.p10}:1 under the ${bar}:1 bar (${large ? 'large' : 'body'} text)`); } }
}
if (fails) process.exitCode = 1;
console.log(fails ? `FAIL — firstframe: ${fails} splash line(s) under their WCAG bar against the real pixels behind the glyphs` : `PASS — firstframe: every splash line clears its WCAG bar against the real pixels behind the glyphs; frames in ${OUT}/`);
