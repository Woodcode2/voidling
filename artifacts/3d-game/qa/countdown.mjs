// THE FINAL-TEN NUMERAL: A CONTOUR ON ANY GROUND, AND OFF THE HERO'S FACE
//
//   node qa/countdown.mjs [port] [world] [--views=430x932,390x844,360x780] [--r=N]
//
// Studio round 4, Job 7: "give #count span an 8 px -webkit-text-stroke with
// paint-order: stroke fill. Place it in the free band below the void, measured
// on the HUD frame. It cannot go under the timer (#news is there) or above the
// head (#form is there)." Gate: at ?len=15, clock 7, a stroke of at least 4 px
// and less than 10% overlap with the hero box.
//
// WHY THE PLACEMENT IS A MEASUREMENT AND NOT A NUMBER IN A BRIEF. The free band
// runs from the hero's projected face box down to the growth card's top edge.
// The first comes out of the camera law at that moment of that match — the
// void's projected radius, the follow lag, the pitch — and the second out of
// Fredoka's line metrics and the safe-area floor. Neither can be read from
// source, and both move with the viewport. So this reads both edges off the
// live page and PRINTS the placement: the `top` that centres the numeral's
// own box in the band, as px and as % of the viewport, per viewport, plus the
// equivalent `bottom` — because the band hangs off the bottom HUD, a bottom
// offset may hold across heights where a percentage does not.
//
// THE HERO BOX IS THE GAME'S OWN: __formBox() returns the face box bubbles.ts
// builds from one projection per frame — the same box every crowd bubble
// dodges and the form callout clears. The numeral's box is its UNTRANSFORMED
// layout box (the #count row's rect plus the span's offsets), which is the box
// countPop holds at scale 1.0 between 18% and 70% of each pop: sampling the
// transformed rect would read whichever instant of a 0.92 s wall-clock spring
// the probe happened to land on, under a renderer that paints about once a
// second.
//
// THE BARS, at every viewport
//   (a) #count span's computed -webkit-text-stroke-width is at least 4px
//   (b) the numeral's box covers less than 10% of the hero's face box
//
// Today, after the stroke landed and before the placement has: (a) passes and
// (b) is expected to fail. The number to write into index.html's #count rule
// is the one this prints under "place".
import { chromium } from 'playwright';

const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = POS[0] || '4177';
const WORLD = POS[1] || 'maple';
const flag = (k) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
const VIEWS = (flag('views') || '430x932,390x844,360x780').split(',').map((v) => v.split('x').map(Number));
const R = flag('r') ? Number(flag('r')) : null;

const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`threw: ${(e && e.message) || e}`));
process.on('unhandledRejection', (e) => die(`rejected: ${(e && e.message) || e}`));
if (VIEWS.some(([w, h]) => !(w > 0 && h > 0))) die(`cannot read --views=${flag('views')} — want WxH,WxH`);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

let bad = 0, bars = 0;
const bar = (ok, id, msg) => { bars++; console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };
console.log(`\n  COUNTDOWN — ${WORLD} on :${PORT}, ?len=15 at clock 7${R ? `, void radius set to ${R}` : ''}\n`);
const places = [];

for (const [W, H] of VIEWS) {
  const p = await b.newPage({ viewport: { width: W, height: H } });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidFirstNom', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { /* private mode */ } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&len=15`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  const hooks = await p.evaluate(() => ['__formBox', '__matchState', '__setVoidR'].filter((h) => typeof window[h] !== 'function'));
  if (hooks.length) die(`this build has no ${hooks.join(', ')} — it cannot say where the hero is`);
  if (R) {
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 1, null, { timeout: 600000 });
    await p.evaluate((r) => window.__setVoidR(r), R);
  }
  // clock 7 on the MATCH clock, which is the one the countdown reads
  await p.waitForFunction(() => { const m = window.__matchState?.(); return m && m.t > 0 && m.clock <= 7; }, null, { timeout: 900000, polling: 100 });
  const s = await p.evaluate(() => {
    const row = document.getElementById('count'), span = row?.querySelector('span');
    const g = document.getElementById('growth'), news = document.getElementById('news');
    if (!row || !span) return { missing: true };
    const rr = row.getBoundingClientRect();
    const cs = getComputedStyle(span);
    const box = { left: rr.left + span.offsetLeft, top: rr.top + span.offsetTop, w: span.offsetWidth, h: span.offsetHeight };
    box.right = box.left + box.w; box.bottom = box.top + box.h;
    const hero = window.__formBox();
    const gr = g && getComputedStyle(g).display !== 'none' ? g.getBoundingClientRect() : null;
    const nr = news ? news.getBoundingClientRect() : null;
    return {
      text: span.textContent, clock: window.__matchState().clock,
      stroke: parseFloat(cs.webkitTextStrokeWidth) || 0, paint: cs.paintOrder, fs: parseFloat(cs.fontSize),
      rowTop: rr.top, box, hero,
      growthTop: gr ? gr.top : null, newsBottom: nr && nr.height ? nr.bottom : null,
    };
  });
  await p.close();
  if (s.missing) die('#count span is not in the page');
  if (!s.hero?.on) die(`at ${W}x${H} the hero box is off (__formBox().on false) — nothing to overlap, so (b) would pass on absence`);
  if (s.growthTop == null) die(`at ${W}x${H} the growth card is not on screen — the band's floor cannot be read`);

  const h = s.hero, x = s.box;
  const iw = Math.max(0, Math.min(x.right, h.right) - Math.max(x.left, h.left));
  const ih = Math.max(0, Math.min(x.bottom, h.bottom) - Math.max(x.top, h.top));
  const heroA = (h.right - h.left) * (h.bottom - h.top);
  const ofHero = heroA > 0 ? (iw * ih) / heroA : 0;
  const ofNum = x.w * x.h > 0 ? (iw * ih) / (x.w * x.h) : 0;
  const bandTop = h.bottom, bandBot = s.growthTop, band = bandBot - bandTop;
  const top = bandTop + (band - x.h) / 2;
  const place = { W, H, top, pct: (top / H) * 100, bottom: H - (top + x.h), fits: band >= x.h, band, need: x.h };
  places.push(place);

  console.log(`  ${W}x${H}  numeral "${s.text}" at clock ${s.clock.toFixed(2)}: font ${s.fs}px, box ${Math.round(x.w)}x${Math.round(x.h)} at top ${Math.round(x.top)} (row top ${Math.round(s.rowTop)} = ${((s.rowTop / H) * 100).toFixed(1)}%)`);
  console.log(`  ·    hero face box ${Math.round(h.left)}..${Math.round(h.right)} x ${Math.round(h.top)}..${Math.round(h.bottom)} (centre ${Math.round(h.cx)},${Math.round(h.cy)}, radius ${Math.round(h.rx)}px)`);
  console.log(`  ·    free band below him: ${Math.round(bandTop)} → ${Math.round(bandBot)} (growth card top) = ${Math.round(band)}px; #news box bottom ${s.newsBottom == null ? '(collapsed)' : Math.round(s.newsBottom)}`);
  console.log(`  ·    place: top ${Math.round(top)}px = ${place.pct.toFixed(1)}% · or bottom ${Math.round(place.bottom)}px${place.fits ? '' : `  — the band is ${Math.round(band)}px and the numeral needs ${Math.round(x.h)}px: it does NOT fit below him at this size`}`);
  bar(s.stroke >= 4, 'a', `${W}x${H}: stroke ${s.stroke}px, paint-order "${s.paint}" (want ≥ 4px)`);
  bar(ofHero < 0.10, 'b', `${W}x${H}: the numeral covers ${(ofHero * 100).toFixed(1)}% of his face box (${(ofNum * 100).toFixed(1)}% of its own box is on him; want < 10%)`);
  console.log('');
}
await b.close();

if (places.length > 1) {
  const pcts = places.map((q) => q.pct), bots = places.map((q) => q.bottom);
  const spread = (a) => Math.max(...a) - Math.min(...a);
  console.log(`  ·    across ${places.length} viewports the centred top is ${pcts.map((v) => v.toFixed(1) + '%').join(' / ')} (spread ${spread(pcts).toFixed(1)} pts), `
    + `the centred bottom ${bots.map((v) => Math.round(v) + 'px').join(' / ')} (spread ${Math.round(spread(bots))}px) — write whichever holds still`);
}
console.log(bad ? `\nFAIL — ${bad} of ${bars} bar(s)` : `\nPASS — ${bars} bar(s)`);
process.exit(bad ? 1 : 0);
