// DOES "BIG MOTION" ACTUALLY STOP THE MOTION?
//
//   node qa/_calmleak.mjs [port] [world]
//
// body.calm is the in-app toggle a parent can find, and index.html's own note
// says it was written so that switch "governs the SAME set of animations the OS
// preference does". It is an EXPLICIT selector list, so every animation has to
// be named in it by hand — and that is exactly how one gets missed.
//
// THE ONE THAT WAS MISSED, AND WHY IT HID. The growth bar's travelling sheen is
// authored on `#growth .gFill::after`. The calm list named `#growth .gFill` —
// the element. A pseudo-element is its OWN animation box, so `animation: none`
// on the parent never reached it, and the sheen ran at full speed for a child
// whose parent had turned motion off. It hid because the OS query DOES catch
// it: that block carries a `*, *::before, *::after` catch-all which flattens
// every duration to 0.01ms, so anyone testing with the OS preference saw a
// still bar and concluded the feature worked.
//
// So this sweeps ELEMENTS AND BOTH PSEUDO-ELEMENTS, and it checks the in-app
// toggle SEPARATELY from the OS query. Checking only the OS path is what let
// this through.
//
// AND IT GRADES MOTION, NOT ANIMATION NAMES. The first version of this probe
// flagged any running animation, and that is wrong in a way that would have
// caused real damage: #evolve.show and #news.show are not decorated elements,
// their animations ARE their visibility — both sit at opacity 0 in their base
// rule, both run `forwards`, and nothing ever removes `.show` on a timer, so
// the final keyframe at opacity 0 is what takes the card off screen. Silencing
// them to satisfy a name-based probe would leave a child with BIG MOTION off
// never seeing an evolution. What the toggle is actually about is things
// MOVING, so this samples each element's on-screen box and transform twice,
// 420ms apart, and flags what has moved or changed size. A pure fade passes,
// which is correct; a scale or a slide does not.
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
/** HUD roots that are on screen during ordinary play */
const ROOTS = ['growth', 'timer', 'goal', 'coins', 'banner', 'evolve', 'news', 'quests'];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const sweep = async (mode) => {
  const p = await b.newPage({ viewport: { width: 430, height: 932 },
    ...(mode === 'os' ? { reducedMotion: 'reduce' } : {}) });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidFirstNom', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await enterMatch(p, WORLD);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 600000 });
  if (mode === 'calm') await p.evaluate(() => document.body.classList.add('calm'));
  // FORCE THE CEREMONIES ON. #evolve's burst and rays live on `#evolve.show::before`
  // and `::after`, so a sweep taken while no evolution is playing reports them as
  // absent rather than as silenced — a probe that passes because the thing it grades
  // is not on screen. Same for the news card's shine. Both are shown by hand here.
  await p.evaluate(() => {
    const ev = document.getElementById('evolve');
    if (ev) { ev.innerHTML = '<div class="big">GOBBLIN</div><div class="sm">EVOLVED</div>'; ev.classList.add('show'); }
    const nw = document.getElementById('news');
    if (nw) { nw.classList.add('show'); nw.textContent = 'THE BUGLE'; }
  });
  await p.waitForTimeout(1200);
  const sample = () => p.evaluate((roots) => {
    const out = {};
    const read = (el, path) => {
      for (const pe of ['', '::before', '::after']) {
        const cs = getComputedStyle(el, pe || undefined);
        if (pe && (cs.content === 'none' || !cs.content)) continue;
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = pe ? null : el.getBoundingClientRect();
        out[path + pe] = {
          tf: cs.transform, bg: cs.backgroundPosition,
          x: r ? Math.round(r.x * 100) / 100 : null, y: r ? Math.round(r.y * 100) / 100 : null,
          w: r ? Math.round(r.width * 100) / 100 : null, h: r ? Math.round(r.height * 100) / 100 : null,
          anim: cs.animationName,
        };
      }
      for (const c of el.children) read(c, `${path}>${c.className || c.tagName}`);
    };
    for (const id of roots) { const el = document.getElementById(id); if (el) read(el, '#' + id); }
    return out;
  }, ROOTS);

  const a = await sample();
  await p.waitForTimeout(420);
  const c = await sample();
  const found = [];
  for (const k of Object.keys(a)) {
    if (!c[k]) continue;
    const p0 = a[k], p1 = c[k];
    const moved = [];
    if (p0.tf !== p1.tf) moved.push(`transform ${p0.tf} -> ${p1.tf}`);
    if (p0.bg !== p1.bg) moved.push(`background-position ${p0.bg} -> ${p1.bg}`);
    if (p0.x !== null && (Math.abs(p1.x - p0.x) > 0.5 || Math.abs(p1.y - p0.y) > 0.5))
      moved.push(`moved ${(p1.x - p0.x).toFixed(1)},${(p1.y - p0.y).toFixed(1)}px`);
    if (p0.w !== null && (Math.abs(p1.w - p0.w) > 0.5 || Math.abs(p1.h - p0.h) > 0.5))
      moved.push(`resized ${(p1.w - p0.w).toFixed(1)}x${(p1.h - p0.h).toFixed(1)}px`);
    if (moved.length) found.push(`${k} [${p1.anim}] ${moved.join('; ')}`);
  }
  await p.close();
  return found;
};

const calm = await sweep('calm');
const os = await sweep('os');
await b.close();

console.log(`BIG MOTION off (body.calm): ${calm.length ? calm.join('\n                            ') : '(nothing moved)'}`);
console.log(`OS reduced-motion:          ${os.length ? os.join('\n                            ') : '(nothing moved)'}`);
console.log('');
const bad = [];
if (calm.length) bad.push(`the in-app BIG MOTION toggle left ${calm.length} thing(s) MOVING: ${calm.join(', ')}`);
if (os.length) bad.push(`OS reduced-motion left ${os.length} thing(s) MOVING: ${os.join(', ')}`);
if (bad.length) { for (const m of bad) console.log(`FAIL — ${m}`); process.exit(1); }
console.log('PASS — under both the in-app toggle and the OS preference nothing in the HUD moves, pseudo-elements included; fades still play, which is what the toggle is for');
