// THE TOP OF THE LADDER MUST BE EARNED, AND MUST BE REACHABLE.
//
// R_CAP moved 12 -> 18 and a seventh form, VOID TITAN, sits at r=13.5. The
// growth law (lawCap) tops out near 12 on a perfect run, so the last six units
// exist only on feastR — headroom bought by SWALLOWING RIVALS, 1.25 each,
// scaled by the size of the meal.
//
// That makes two failure modes, and this probe has to catch both:
//
//   TOO EASY   if ordinary play drifts past 13.5, the new form is decoration
//              in exactly the way the old ceiling was — qa/difficulty.mjs found
//              a driver picking random headings finishing at r=12.5, i.e. the
//              previous top rung was being handed to nobody in particular.
//   TOO HARD   if a hunter who eats the whole family still cannot cross 13.5,
//              the form is a rumour and the mechanic teaches nothing.
//
// Two drivers, same match:
//   graze   never chases a rival — eats props only. Must NOT reach TITAN.
//   hunter  chases the nearest rival it can actually swallow, and eats props
//           in between. Should reach it, or at least clearly out-grow graze.
//
//   node qa/titan.mjs [world] [port]
import { chromium } from 'playwright';

const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const run = async (mode) => {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('voidPlayed', '1');
      localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
    } catch { }
  });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
  }));
  await p.evaluate(() => document.getElementById('btnPlay')?.click());
  await p.waitForTimeout(1400);
  await p.evaluate((w) => {
    const c = document.querySelector(`#worldRow .wCard[data-world="${w}"]`)
      || document.querySelector('#worldRow .wCard[data-world]');
    c?.click();
  }, WORLD);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => { }; });

  await p.evaluate((mode) => {
    window.__peakR = 0;
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    let held = null, heldT = -1;
    const tick = () => {
      const ms = window.__matchState?.();
      if (!ms) { requestAnimationFrame(tick); return; }
      const vs = window.__voidState();
      if (vs.r > window.__peakR) window.__peakR = vs.r;

      if (ms.t - heldT > 0.25) {
        heldT = ms.t;
        held = null;
        // HUNTER: go for a rival we can actually swallow. EAT_RATIO is 1.11, so
        // a rival is food when its radius is at or under ours times that.
        if (mode === 'hunter') {
          let bd = 1e9;
          for (const rv of (ms.rivals || [])) {
            if (!rv.joined || rv.r > vs.r * 1.11) continue;
            const dx = rv.x - vs.x, dz = rv.z - vs.z;
            const d = dx * dx + dz * dz;
            if (d < bd) { bd = d; held = { dx, dz }; }
          }
        }
        // …otherwise (and for graze always) take the nearest prop
        if (!held) {
          let bd = 1e9;
          for (const e of window.__edibles) {
            if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
            const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
            const d = dx * dx + dz * dz;
            if (d < bd) { bd = d; held = { dx, dz }; }
          }
        }
      }
      if (held) {
        const a = Math.atan2(held.dz, held.dx);
        dispatchEvent(new PointerEvent('pointermove', {
          pointerId: 1, clientX: cx + Math.cos(a) * 110, clientY: cy + Math.sin(a) * 110, bubbles: true,
        }));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, mode);

  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 900000 });
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const ms = window.__matchState?.() || {};
    return {
      peakR: Math.round(window.__peakR * 100) / 100,
      score: Math.round(ms.score ?? 0),
      form: document.getElementById('endHd')?.textContent?.trim(),
      stats: [...document.querySelectorAll('#endStats .es')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
    };
  });
  await p.close();
  return r;
};

const TITAN_R = 13.5;
const fail = [];
const out = {};
for (const mode of ['graze', 'hunter']) {
  out[mode] = await run(mode);
  console.log(`${mode.padEnd(7)} peak r ${String(out[mode].peakR).padStart(6)}`
    + `   score ${String(out[mode].score).padStart(7)}`
    + `   ${out[mode].peakR >= TITAN_R ? 'REACHED VOID TITAN' : 'below TITAN'}`);
}
await b.close();

console.log(`\n══ IS THE TOP OF THE LADDER EARNED? (TITAN at r=${TITAN_R})`);
if (out.graze.peakR >= TITAN_R) {
  fail.push(`graze reached ${out.graze.peakR} without hunting anything`);
  console.log(`  FAIL  a run that never chased a rival reached ${out.graze.peakR}.`);
  console.log('        The new form is decoration, exactly like the old ceiling.');
} else {
  console.log(`  ok    props-only tops out at ${out.graze.peakR}, short of ${TITAN_R}`);
}
const gain = out.hunter.peakR - out.graze.peakR;
console.log(`  hunting is worth ${gain > 0 ? '+' : ''}${gain.toFixed(2)} radius over grazing`);
if (out.hunter.peakR < TITAN_R && gain < 1.0) {
  fail.push('hunting rivals barely moves the ceiling');
  console.log('  FAIL  eating the family is not measurably better than ignoring it.');
} else if (out.hunter.peakR < TITAN_R) {
  console.log('  note  the hunter did not cross it this run — feastR is working but');
  console.log('        it may need more rivals eaten, or a larger grant per meal.');
} else {
  console.log('  ok    hunting the family gets there, and only hunting does');
}
console.log(fail.length ? `\nFAIL (${fail.length}): ${fail.join(' | ')}` : '\nthe ceiling is earned');
process.exit(fail.length ? 1 : 0);
