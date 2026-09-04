// TEMP VERIFICATION PROBE (governor round 4) — is a speech bubble ever painted
// BEHIND the growth bar, and if it is, can you read it through the bar?
//
//   node qa/_growthbubble.mjs [port] [worlds...]
//
// Reads the LIVE page: computed z-index of .vb and #growth, #growth's real
// rect, and per-frame overlap of every visible .vb against it, sampled on the
// MATCH clock (the software renderer runs it ~14x slow — qa/_clockrate.mjs).
// Nothing here is transcribed from source; if #growth is missing it throws.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const WORLDS = process.argv.slice(3).length ? process.argv.slice(3) : ['maple', 'gameday'];
const START_AT = 8, SPAN = 14, SAMPLE_MS = 150;

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForSelector('#btnPlay', { state: 'visible', timeout: 400000 });
  await p.evaluate(() => document.getElementById('btnPlay').click());
  await p.waitForSelector(`#worldRow .wCard[data-world="${wid}"]`, { state: 'visible', timeout: 400000 });
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`).click(), wid);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

  // layering + geometry, read from the live DOM
  const facts = await p.evaluate(() => {
    const g = document.getElementById('growth');
    if (!g) throw new Error('#growth not found — the call site moved');
    const vb = document.querySelector('.vb');
    if (!vb) throw new Error('.vb not found — bubbles.ts did not inject its pool');
    const gs = getComputedStyle(g), vs = getComputedStyle(vb);
    const r = g.getBoundingClientRect();
    return { growthZ: gs.zIndex, vbZ: vs.zIndex, growthBg: gs.backgroundImage.slice(0, 90),
      backdrop: gs.backdropFilter, rect: { t: r.top, b: r.bottom, l: r.left, rr: r.right, h: r.height },
      vh: innerHeight, disp: gs.display };
  });
  console.log(`\n[${wid}] .vb z-index=${facts.vbZ}   #growth z-index=${facts.growthZ}   display=${facts.disp}`);
  console.log(`        #growth rect  top=${facts.rect.t.toFixed(0)} bottom=${facts.rect.b.toFixed(0)} `
    + `left=${facts.rect.l.toFixed(0)} right=${facts.rect.rr.toFixed(0)} h=${facts.rect.h.toFixed(0)}  (viewport h=${facts.vh})`);
  console.log(`        backdrop-filter: ${facts.backdrop}`);

  // drive with the same nearest-edible autopilot the other bubble probes use
  await p.evaluate(() => {
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => {
      const vs = window.__voidState();
      let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz;
        if (d < bd) { bd = d; best = { dx, dz }; }
      }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await p.waitForFunction((t) => (window.__matchState?.().t ?? 0) > t, START_AT, { timeout: 900000, polling: 250 });
  const until = await p.evaluate(() => window.__matchState().t) + SPAN;
  let n = 0, anyB = 0, hit = 0, worst = 0, worstText = '', lowest = 0;
  for (;;) {
    if (await p.evaluate(() => window.__matchState().t) >= until) break;
    const s = await p.evaluate(() => {
      const g = document.getElementById('growth');
      const gr = g.getBoundingClientRect();
      let bubbles = 0, cover = 0, text = '', low = 0;
      for (const el of document.querySelectorAll('.vb')) {
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.15) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2) continue;
        bubbles++;
        low = Math.max(low, r.bottom);
        const w = Math.min(r.right, gr.right) - Math.max(r.left, gr.left);
        const h = Math.min(r.bottom, gr.bottom) - Math.max(r.top, gr.top);
        const f = (w > 0 && h > 0) ? (w * h) / Math.max(1, r.width * r.height) : 0;
        if (f > cover) { cover = f; text = (el.textContent || '').trim().slice(0, 44); }
      }
      return { bubbles, cover, text, low };
    });
    if (s) { n++; if (s.bubbles) anyB++; if (s.cover > 0.01) hit++;
      if (s.cover > worst) { worst = s.cover; worstText = s.text; }
      lowest = Math.max(lowest, s.low); }
    await p.waitForTimeout(SAMPLE_MS);
  }
  console.log(`        sampled ${n} frames over ${SPAN} MATCH s: bubble on screen ${anyB}/${n} (${(anyB/n*100).toFixed(1)}%)  `
    + `OVERLAPPING #growth ${hit}/${n} (${(hit/n*100).toFixed(2)}%)  worst ${(worst*100).toFixed(0)}%${worstText?` ("${worstText}")`:''}`);
  console.log(`        lowest bubble bottom edge seen: ${lowest.toFixed(0)}px  (#growth top is ${facts.rect.t.toFixed(0)}px)`);

  // ── THE LEGIBILITY HALF, forced. Park a real .vb dead centre of the bar and
  // screenshot it: this asks the CSS question directly rather than waiting for
  // play to produce the case. Not in the slot pool, so update() never moves it.
  await p.evaluate(() => {
    const g = document.getElementById('growth').getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'vb show'; el.id = 'ZZforced';
    el.textContent = 'Winners stay on. House rules.';
    document.body.appendChild(el);
    el.style.left = `${g.left + g.width / 2}px`;
    el.style.top = `${g.top + g.height * 0.9}px`;
  });
  await p.waitForTimeout(500);
  const fr = await p.evaluate(() => { const e=document.getElementById('ZZforced'); const r=e.getBoundingClientRect();
    return {t:r.top,b:r.bottom,l:r.left,rr:r.right,z:getComputedStyle(e).zIndex,op:getComputedStyle(e).opacity}; });
  console.log(`        forced .vb rect top=${fr.t.toFixed(0)} bottom=${fr.b.toFixed(0)} left=${fr.l.toFixed(0)} right=${fr.rr.toFixed(0)} z=${fr.z} opacity=${fr.op}`);
  await p.screenshot({ path: `/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/forced-${wid}.png` });
  await p.evaluate(() => { document.getElementById('growth').style.visibility='hidden'; });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/forced-${wid}-nobar.png` });
  console.log(`        forced-case screenshots written for ${wid}`);
  await p.close();
}
await b.close();
