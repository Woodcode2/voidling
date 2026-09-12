// LOOK AT THE END CARD. Two shots: a dot won and a dot missed.
//
// GOVERNOR rule 5 — verify from the front. Part (d) of qa/levels.mjs asserts the
// end card's STRUCTURE (which pip, which glyph, which word, which button), and a
// structure can be perfectly correct and still look wrong: a 96px pip on a card
// that was laid out for a line of type, a here-ring clipped by a parent's
// overflow, five dots that collide at 360px. Nothing in the probe can see that.
//
//   node qa/_endshot.mjs [port] [world]
//
// Writes qa/out/endshot/*.png. A diagnostic, not a gate step — the gate's job is
// bars that fail, and "does this look right" is a judgement.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
const OUT = 'qa/out/endshot';
mkdirSync(OUT, { recursive: true });

const VIEWS = [[430, 932, 'phone'], [360, 780, 'small'], [834, 1194, 'tablet']];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

/** Crank the match on a virtualised clock with the paint stubbed, then let the
 *  REAL renderer back in for the screenshot — the card is DOM, but the dimmed
 *  world behind it is not, and a shot of a black canvas would be a shot of the
 *  wrong thing. */
const play = async (goal, win, view) => {
  const [w, h, name] = view;
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  } catch { } });
  // a short clock on a miss so the buzzer is cheap; a long one on a win because
  // the win is driven and the clock is irrelevant
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&g=${goal}&len=${win ? 60 : 10}`,
    { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0, null, { timeout: 600000 })
    .catch(() => { });

  const real = await p.evaluate(() => {
    const r = window.__renderer, c = window.__composer?.();
    window.__realRender = r.render.bind(r);
    window.__realComp = c ? c.render.bind(c) : null;
    r.render = () => { };
    if (c) c.render = () => { };
    const raw = window.requestAnimationFrame.bind(window);
    const rawNow = performance.now.bind(performance);
    window.__virt = rawNow();
    performance.now = () => window.__virt;
    window.__q = [];
    window.requestAnimationFrame = (cb) => { window.__q.push(cb); return window.__q.length; };
    raw(() => { });
    return true;
  });
  void real;
  await p.waitForFunction(() => (window.__q || []).length >= 1, null, { timeout: 120000 }).catch(() => { });

  const res = await p.evaluate(([n, step, doWin]) => {
    for (let i = 0; i < n; i++) {
      const due = window.__q; window.__q = [];
      if (!due.length) return { broke: true, i };
      window.__virt += step;
      for (const cb of due) cb(window.__virt);
      if (doWin) window.__setScore(window.__levelSpec().eat + 1);
      if (document.getElementById('end')?.classList.contains('show')) {
        for (let k = 0; k < 30; k++) {
          const d2 = window.__q; window.__q = [];
          window.__virt += step;
          for (const cb of d2) cb(window.__virt);
        }
        const ms = window.__matchState();
        return { clock: +ms.clock.toFixed(2),
          hd: document.querySelector('#endHd .pipHW')?.textContent ?? '',
          pips: [...document.querySelectorAll('#endPips .pip')].map((e) => (e.className.match(/s-(\w+)/) || [])[1]).join('·'),
          cap: document.getElementById('endPipsCap')?.textContent ?? '' };
      }
    }
    return { timeout: true };
  }, [60 * 200, 1000 / 60, win]);

  // hand the renderer back and let the real clock run a few frames, so the
  // world behind the dimmed card is actually drawn
  await p.evaluate(() => {
    const r = window.__renderer, c = window.__composer?.();
    if (window.__realRender) r.render = window.__realRender;
    if (window.__realComp && c) c.render = window.__realComp;
    performance.now = performance.now.bind(performance);
  });
  await p.waitForTimeout(2500);
  const tag = `${WORLD}-g${goal}-${win ? 'win' : 'miss'}-${name}`;
  await p.screenshot({ path: `${OUT}/${tag}.png`, timeout: 180000 });
  // …and the card on its own, so the pips can be looked at closely
  const card = await p.$('#end');
  if (card) await card.screenshot({ path: `${OUT}/${tag}-card.png`, timeout: 180000 }).catch(() => { });
  console.log(`  ${tag.padEnd(34)} clock ${String(res.clock ?? '—').padStart(6)}  "${res.hd}"  ${res.pips}  ${res.cap}`);
  await p.close();
};

console.log(`\n  END CARD — ${WORLD}\n`);
for (const v of VIEWS) {
  await play(1, true, v);
  await play(1, false, v);
}
await b.close();
console.log(`\n  shots in ${OUT}/\n`);
