// DOES THE RESULTS CARD OPEN ON THE MATCH THAT UNLOCKS A WORLD?
//
// endMatch()'s rivals branch ends with `endEl.classList.add('show')`. Sixty
// lines above it, inside `if (opened) { … }`, sits a bare `return` whose comment
// says "the skin nudge waits for a match that did not just open a world" — but
// a `return` there leaves endMatch entirely, and the line that SHOWS the card is
// below it. If that reading is right, the single biggest reward in the game
// announces itself on a screen nobody ever sees.
//
// Measured rather than argued: seed a profile with only Maple open, finish a
// match on Maple (which calls completeWorld and therefore opens Pirate Bay),
// and watch #end.
//
//   node qa/_unlockcard.mjs [port]
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const run = async (seedUnlocked, label) => {
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript((u) => { try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', u);
  } catch { } }, seedUnlocked);
  await p.goto(`http://127.0.0.1:${PORT}/?w=maple&len=8`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0, null, { timeout: 600000 }).catch(() => { });
  await p.evaluate(() => {
    const r = window.__renderer; if (r) r.render = () => { };
    try { const c = window.__composer?.(); if (c) c.render = () => { }; } catch { }
    const raw = window.requestAnimationFrame.bind(window);
    const rawNow = performance.now.bind(performance);
    window.__virt = rawNow(); performance.now = () => window.__virt;
    window.__q = []; window.requestAnimationFrame = (cb) => { window.__q.push(cb); return window.__q.length; };
    raw(() => { });
  });
  await p.waitForFunction(() => (window.__q || []).length >= 1, null, { timeout: 120000 }).catch(() => { });
  const r = await p.evaluate(([n, step]) => {
    for (let i = 0; i < n; i++) {
      const due = window.__q; window.__q = [];
      if (!due.length) return { broke: true, i };
      window.__virt += step;
      for (const cb of due) cb(window.__virt);
      const ms = window.__matchState();
      if (ms.clock < -2.5) break;   // well past the buzzer and the 2s outro
    }
    return {
      shown: !!document.getElementById('end')?.classList.contains('show'),
      clock: +window.__matchState().clock.toFixed(2),
      unlocked: localStorage.getItem('voidUnlocked') || '',
      nextHtml: (document.getElementById('endNext')?.textContent || '').slice(0, 60),
    };
  }, [60 * 30, 1000 / 60]);
  await p.close();
  console.log(`  ${label.padEnd(34)} #end shown: ${String(r.shown).padEnd(5)}  clock ${String(r.clock).padStart(6)}  unlocked "${r.unlocked}"  endNext "${r.nextHtml}"`);
  return r;
};

console.log('\n  THE UNLOCK MATCH\n');
const a = await run('maple', 'maple only -> unlocks pirate');
const c = await run('maple,pirate,gameday,lantern,powder,skylark', 'everything already open (control)');
await b.close();
console.log('');
if (!a.shown && c.shown) console.log('FAIL — the results card does NOT open on the match that unlocks a world, and does on every other match. The biggest reward in the game is announced on a screen nobody sees.');
else if (!a.shown && !c.shown) console.log('FAIL — the card did not open on EITHER run; this probe is measuring something else.');
else console.log('PASS — the results card opens on the unlock match.');
