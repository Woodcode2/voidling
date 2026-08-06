// SCRATCH — HOW MANY WORDS MUST A CHILD READ, AND AT WHAT READING AGE.
//
// Walks the real DOM at each stage of a cold first run and harvests every
// string that is actually VISIBLE (computed style, non-zero box, opacity), then
// scores it with Flesch-Kincaid grade + Flesch reading ease. Emoji and pure
// numbers are excluded from the word count; they are not reading.
//
//   node qa/_readload.mjs
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('./qa-out/first60/', { recursive: true });

function syllables(w) {
  w = w.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}
function score(text) {
  const sentences = (text.match(/[.!?·—]+|\n/g) || []).length || 1;
  const words = text.split(/\s+/).filter(w => /[a-zA-Z]/.test(w));
  const syl = words.reduce((a, w) => a + syllables(w), 0);
  if (!words.length) return { words: 0 };
  const W = words.length, S = sentences;
  return {
    words: W, sent: S, syl,
    fk: +(0.39 * (W / S) + 11.8 * (syl / W) - 15.59).toFixed(1),
    ease: +(206.835 - 1.015 * (W / S) - 84.6 * (syl / W)).toFixed(0),
    long: words.filter(w => syllables(w) >= 3).length,
  };
}

const HARVEST = () => {
  const out = [];
  const seen = new Set();
  const walk = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    if (r.bottom < 0 || r.top > innerHeight) return;
    for (const n of el.childNodes) {
      if (n.nodeType === 3) {
        const t = n.textContent.replace(/\s+/g, ' ').trim();
        if (t && !seen.has(t)) { seen.add(t); out.push({ t, px: +cs.fontSize.replace('px', ''), id: el.id || el.className?.toString?.().slice(0, 20) || el.tagName }); }
      } else if (n.nodeType === 1) walk(n);
    }
  };
  walk(document.body);
  return out;
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear(); } catch {} });
await p.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded', timeout: 300000 });

const stages = [];
// STAGE 1 — the boot cover, the literal first thing on screen
stages.push({ name: 'BOOT COVER', items: await p.evaluate(HARVEST) });
await p.waitForFunction(() => !!window.__matchState, null, { timeout: 400000 });
// STAGE 2 — the match goes live (title card up)
await p.waitForFunction(() => (window.__matchState().t ?? 0) > 0.05, null, { timeout: 500000 });
stages.push({ name: 'MATCH LIVE / TITLE CARD', items: await p.evaluate(HARVEST) });
// STAGE 3 — controls live, first instruction
await p.waitForFunction(() => window.__matchState().t > 3.2, null, { timeout: 500000 });
stages.push({ name: 'CONTROLS LIVE (t≈3.5)', items: await p.evaluate(HARVEST) });
// STAGE 4 — first headline
await p.waitForFunction(() => window.__matchState().t > 9, null, { timeout: 500000 });
stages.push({ name: 'FIRST HEADLINE (t≈9)', items: await p.evaluate(HARVEST) });
// STAGE 5 — settled HUD
await p.waitForFunction(() => window.__matchState().t > 30, null, { timeout: 600000 });
stages.push({ name: 'SETTLED (t≈30)', items: await p.evaluate(HARVEST) });

let total = '';
for (const s of stages) {
  console.log(`\n══ ${s.name} ══`);
  for (const i of s.items) console.log(`  ${String(Math.round(i.px)).padStart(3)}px  [${i.id}]  ${i.t}`);
  const txt = s.items.map(i => i.t).join('. ');
  total += txt + '. ';
  console.log('  →', JSON.stringify(score(txt)));
}
console.log('\n══ WHOLE FIRST RUN, CUMULATIVE ══');
console.log(JSON.stringify(score(total), null, 1));
writeFileSync('./qa-out/first60/readload.json', JSON.stringify(stages, null, 1));
await b.close();
