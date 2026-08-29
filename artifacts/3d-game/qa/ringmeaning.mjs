// DOES THE GROUND RING TELL THE TRUTH? — the danger-channel probe.
//
//   node qa/ringmeaning.mjs [port]        # authored + rendered
//   node qa/ringmeaning.mjs --authored    # authored only, no browser
//
// The ground disc under a void is the game's whole safe/dangerous channel and
// the only one a pre-reader can use (rivals.ts, the halo block: "green = you
// can eat them, red = RUN"). It has four MEANINGS and it also has a fifth
// state — the fair fight, where neither of you can eat the other — which falls
// back to the sibling's own colour. That fallback was taking its colour from a
// SHOP palette (`sk.rim`, palette.ts) that nobody had ever measured against
// the four cue colours, and the result was that JELLY, the harmless one a
// child is meant to chase, wore a ring ΔE 3.1 from the game's own "IT CAN EAT
// YOU" red — under the repo's own bar for two colours being the SAME colour.
//
// So this probe asks two questions of the five siblings' own colours:
//   MEANING   — can any of them be confused with a cue colour?  (the safety bug)
//   IDENTITY  — can any two of them be confused with each other? (why the
//               channel carries a name at all)
// and one of the casting:
//   COSTUME   — is FAMILY_SKIN still a bijection onto the skins that carry a 3D
//               accessory? One legendary each, none doubled, none dropped. That
//               is what makes a re-deal of the five strings cost zero triangles
//               and zero draw calls: the SET of meshes built is unchanged.
//
// ── WHERE THE BAR COMES FROM (it is derived, not guessed) ─────────────────
// FLOOR is read out of qa/formsep.mjs at run time — it is that probe's own
// MIN_DE, the repo's standing answer to "a child can see that this face is not
// that face" for two patches of ONE prop, adjacent, in the same instant.
//
// This comparison is harder than that one in three ways:
//
//   1. THE PIPELINE COMPRESSES.  The ring is a MeshBasicMaterial at opacity
//      0.85 laid over whatever ground is there, then ACES, then the grade's
//      toe, then the sRGB encode. That is measurable and the rendered pass
//      below measures it: RHO is rendered ΔE / authored ΔE for the real halo
//      of a real rival over real ground. MEASURED, Maple, 2026-08-29, over the
//      36 pairs among nine colours, on two independent shoots of two different
//      siblings' real halos over two patches of ground — ECHO's (879 mask px):
//      min 0.62, median 0.83; GRUMPS's (149 mask px): min 0.65, median 0.81,
//      max 1.15. Compression is NOT universal: one pair came back 15% wider on
//      screen than it is authored. The bar is derived from RHO_ASSUMED = 0.50, which is BELOW every
//      pair measured, because ground albedo moves the composite under an 0.85
//      alpha and this samples one patch of one world. The rendered pass FAILS
//      if the measured minimum ever drops under that assumption, so the bar
//      cannot rot into a snapshot of a pipeline that has moved.
//   2. IT IS A MEMORY MATCH, NOT A DISCRIMINATION.  The two colours are never
//      on screen together. A child sees one ring now and compares it against a
//      meaning learned minutes ago. That is a much coarser judgement than
//      telling two adjacent patches apart, and this is where the factor of 2
//      below comes from. It is a judgement and it is stated as one — it is not
//      measured and nothing in this repo measures it.
//   3. It is read at the edge of vision while steering. Not quantified. It can
//      only make the bar too generous, never too strict.
//
//   BAR = 2 x FLOOR / RHO_ASSUMED  =  2 x 6 / 0.50  =  24   (rounded up to 25)
//
// The same bar is used for IDENTITY, for one reason: a sibling's ring being
// mistakable for another sibling's is a smaller failure than a meaning being
// mistakable, but there is no second measurement to justify a second number,
// and inventing one would be the fabrication rule 3 exists for.
//
// ── WHAT THIS PROBE DOES NOT ESTABLISH ────────────────────────────────────
//  · It does not photograph a CHILD reading a ring. Every ΔE here is a
//    colorimetric distance, not a behavioural one.
//  · The rendered pass measures the ring of ONE rival, on ONE world (Maple),
//    over ONE patch of ground, at one camera distance. Ground albedo moves the
//    composite under a 0.85 alpha, so RHO has a spread this does not sample.
//    It samples the direction and the order of magnitude, which is what the
//    bar needs from it.
//  · The BODY of a rival is not measured. shadowninja's rim is #ff4d5e and its
//    glow sprite is #ff7a8a; whoever wears it has a red-lit body. That lives
//    in palette.ts, it is the SHOP's colour, and it is not the danger channel.
//  · CIE76. Not CIEDE2000 — because qa/formsep.mjs is CIE76 and the FLOOR is
//    borrowed from it, and two probes on two different ΔE conventions cannot
//    share a bar.
//
// ── THE MEASUREMENT TRAP, WRITTEN DOWN SO THE NEXT PROBE AVOIDS IT ────────
// three@0.185.1 forces NoToneMapping whenever the render destination is a
// WebGLRenderTarget. A probe that renders the ring into its own target sees no
// ACES, no toe, no exposure and no sRGB encode — a different pipeline from the
// player's, and RHO measured that way would be a fiction. The rendered pass
// SCREENSHOTS THE CANVAS and never renders anything itself.
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const ARGS = process.argv.slice(2);
const AUTHORED_ONLY = ARGS.includes('--authored');
const PORT = ARGS.find((a) => /^\d+$/.test(a)) || '4177';

// RHO the bar was derived from — see the header. The rendered pass re-measures
// it and fails if the real pipeline is harsher than this.
const RHO_ASSUMED = 0.50;

// ── ΔE, on qa/formsep.mjs's convention exactly ────────────────────────────
const srgb2lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const fl = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
function lab([r, g, b]) {
  const R = srgb2lin(r), G = srgb2lin(g), B = srgb2lin(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  return [116 * fl(Y) - 16, 500 * (fl(X) - fl(Y)), 200 * (fl(Y) - fl(Z))];
}
const rgbOf = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const dERGB = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
const dE = (a, b) => dERGB(rgbOf(a), rgbOf(b));
const hex = (h) => '#' + h.toString(16).padStart(6, '0');

// ── THE FLOOR, READ OFF THE PROBE THAT OWNS IT ────────────────────────────
const FORMSEP = readFileSync('qa/formsep.mjs', 'utf8');
const fm = FORMSEP.match(/const MIN_DE = (\d+(?:\.\d+)?);/);
if (!fm) throw new Error('qa/formsep.mjs no longer declares `const MIN_DE = …`. This probe borrows '
  + 'that constant as its floor and refuses to carry its own copy — fix the reference, do not inline a number.');
const FLOOR = Number(fm[1]);
const BAR = Math.ceil((2 * FLOOR) / RHO_ASSUMED / 5) * 5;   // 25

// ── THE SOURCE, PARSED. NEVER TRANSCRIBED ─────────────────────────────────
const SRC = readFileSync('src/proto3d/rivals.ts', 'utf8');
const PAL = readFileSync('src/proto3d/palette.ts', 'utf8');

// the halo block: from the material handle to the line that places the ring
const BLOCK = SRC.match(/const hm = rv\.halo\.material as THREE\.MeshBasicMaterial;([\s\S]*?)rv\.halo\.position\.set\(/);
if (!BLOCK) throw new Error('the halo block in rivals.ts no longer opens with '
  + '`const hm = rv.halo.material as THREE.MeshBasicMaterial;` and close before `rv.halo.position.set(` — '
  + 'this probe cannot report on a channel it cannot find.');

// every colour the ring can ever be, with the branch that chooses it. Labels
// are derived from the guard's own text, so a reordered block relabels itself
// instead of silently reporting the wrong meaning under the right name.
const calls = [];
{
  let cond = '';
  for (const line of BLOCK[1].split('\n')) {
    const t = line.trim();
    if (/^(\}\s*)?else\b|^if \(/.test(t)) cond = t;
    const m = t.match(/hm\.color\.setHex\(([^;]+)\);/);
    if (m) calls.push({ cond, arg: m[1].trim() });
  }
}
const LABEL = (c) => (
  /rv\.cst >= 1/.test(c) ? 'WIND-UP'
    : /!hunting/.test(c) ? 'PRIZE'
      : /pr > rv\.r \* [\d.]+\) hm/.test(c) ? 'SAFE'
        : /rv\.r > pr \* EAT_RATIO/.test(c) ? 'DANGER'
          : /^\}?\s*else\b(?!\s*if)/.test(c) ? 'NEUTRAL' : null);
for (const c of calls) c.label = LABEL(c.cond);
const labels = calls.map((c) => c.label);
if (calls.length !== 5 || new Set(labels).size !== 5 || labels.includes(null)) {
  throw new Error('the halo block now has ' + calls.length + ' colour branches labelled '
    + JSON.stringify(labels) + '. This probe knows four MEANINGS and one NEUTRAL fallback; '
    + 'a fifth meaning or a renamed guard needs a human, not a silent pass.');
}
const CUES = calls.filter((c) => c.label !== 'NEUTRAL').map((c) => {
  if (!/^0x[0-9a-fA-F]{6}$/.test(c.arg)) {
    throw new Error(`the ${c.label} branch no longer sets a literal hex (it sets \`${c.arg}\`). `
      + 'A meaning colour that is computed cannot be compared against anything here.');
  }
  return { label: c.label, hex: Number(c.arg) };
});
const NEUTRAL = calls.find((c) => c.label === 'NEUTRAL').arg;

// ── THE FIVE NAMES AND THE FIVE COSTUMES ──────────────────────────────────
const nm = SRC.match(/const NAMES = \[([^\]]+)\];/);
if (!nm) throw new Error('rivals.ts no longer declares `const NAMES = [...]`.');
const NAMES = [...nm[1].matchAll(/'(\w+)'/g)].map((m) => m[1]);

const fsBlock = SRC.match(/const FAMILY_SKIN: Record<string, string> = \{([\s\S]*?)\};/);
if (!fsBlock) throw new Error('rivals.ts no longer declares FAMILY_SKIN as a Record<string, string>.');
const FAMILY_SKIN = Object.fromEntries([...fsBlock[1].matchAll(/(\w+):\s*'([\w]+)'/g)].map((m) => [m[1], m[2]]));

// palette.ts, one skin per line: id, rim, and whether it carries a 3D accessory
const SKIN = {};
for (const line of PAL.split('\n')) {
  const id = line.match(/\{ id: '([\w]+)'/); if (!id) continue;
  const rim = line.match(/rim: (0x[0-9a-fA-F]{6})/);
  if (!rim) throw new Error(`palette.ts skin '${id[1]}' has no rim on its own line — the per-line parse `
    + 'this probe uses has stopped being valid for that file.');
  SKIN[id[1]] = { rim: Number(rim[1]), acc: /\bacc: '/.test(line) };
}
const LEGENDARY = Object.keys(SKIN).filter((k) => SKIN[k].acc);

// ── WHERE THE NEUTRAL BAND GETS ITS COLOUR, FOLLOWED THROUGH THE SOURCE ───
// Two shapes are understood, and anything else throws rather than guessing:
//   `rv.color`        → follow `color:` in the roster push
//   `FAMILY_INK[nm]`  → read that table out of rivals.ts
function tableIn(name) {
  const b = SRC.match(new RegExp('const ' + name + ': Record<string, number> = \\{([\\s\\S]*?)\\};'));
  if (!b) throw new Error(`rivals.ts declares no \`const ${name}: Record<string, number>\`.`);
  return Object.fromEntries([...b[1].matchAll(/(\w+):\s*(0x[0-9a-fA-F]{6})/g)].map((m) => [m[1], Number(m[2])]));
}
function identityColours() {
  let expr = NEUTRAL;
  if (/^rv\.color$/.test(expr)) {
    const push = SRC.match(/roster\.push\(\{[\s\S]{0,400}?color:\s*([^,]+),/);
    if (!push) throw new Error('the neutral band reads `rv.color` and this probe cannot find `color:` in the roster push.');
    expr = push[1].trim();
  }
  if (expr === 'sk.rim') {
    return { via: 'sk.rim → FAMILY_SKIN → palette.ts',
      col: Object.fromEntries(NAMES.map((n) => [n, SKIN[FAMILY_SKIN[n]].rim])) };
  }
  const t = expr.match(/^([A-Z_]+)\[(?:nm|rv\.name)\]$/);
  if (t) return { via: `${t[1]} in rivals.ts`, col: tableIn(t[1]) };
  throw new Error(`the neutral band's colour now comes from \`${expr}\`, a shape this probe does not know how `
    + 'to follow. Teach it the new shape — do not let it report on a colour it did not resolve.');
}
const ID = identityColours();

// ══ REPORT ════════════════════════════════════════════════════════════════
let fails = 0;
console.log(`\n  RING MEANING — bar ΔE ${BAR} (2 x floor ${FLOOR} from qa/formsep.mjs / rho ${RHO_ASSUMED})`);
console.log(`  the ring's five branches, read out of rivals.ts:`);
for (const c of calls) console.log(`    ${c.label.padEnd(8)} ${/^0x/.test(c.arg) ? hex(Number(c.arg)) : c.arg.padEnd(9)}  ${c.cond || '(else)'}`);
console.log(`  identity colours resolved via ${ID.via}\n`);

// ── 1. COSTUME: one legendary each, none doubled, none dropped ────────────
{
  const worn = NAMES.map((n) => FAMILY_SKIN[n]);
  const missing = NAMES.filter((n) => !FAMILY_SKIN[n]);
  const dupe = worn.filter((w, i) => worn.indexOf(w) !== i);
  const notLeg = worn.filter((w) => w && !SKIN[w]?.acc);
  const unworn = LEGENDARY.filter((l) => !worn.includes(l));
  const ok = !missing.length && !dupe.length && !notLeg.length && !unworn.length;
  console.log('  COSTUME  ' + NAMES.map((n) => `${n}:${FAMILY_SKIN[n] ?? '—'}`).join('  '));
  if (ok) {
    console.log(`  COSTUME  PASS — ${NAMES.length} siblings, ${LEGENDARY.length} legendaries, a bijection. `
      + 'A re-deal of these strings builds the same meshes: zero triangles, zero draw calls.');
  } else {
    fails++;
    console.log('  COSTUME  FAIL — ' + [
      missing.length ? `uncast: ${missing}` : '', dupe.length ? `doubled: ${dupe}` : '',
      notLeg.length ? `not a legendary: ${notLeg}` : '', unworn.length ? `legendary nobody wears: ${unworn}` : '',
    ].filter(Boolean).join('; '));
  }
}

// ── 2. MEANING: no sibling's colour may be read as a cue ──────────────────
console.log('');
const meanRows = [];
for (const n of NAMES) {
  const h = ID.col[n];
  if (h === undefined) { fails++; console.log(`  MEANING  ${n} has no identity colour at all.`); continue; }
  const ds = CUES.map((c) => ({ label: c.label, de: dE(h, c.hex) }));
  const worst = ds.reduce((a, b) => (a.de < b.de ? a : b));
  meanRows.push({ n, h, ds, worst });
}
const cueW = CUES.map((c) => Math.max(c.label.length, 6));
console.log('  MEANING  ' + 'sibling'.padEnd(9) + 'colour  ' + CUES.map((c, i) => c.label.padStart(cueW[i] + 2)).join('') + '   nearest');
for (const r of meanRows) {
  console.log('           ' + r.n.padEnd(9) + hex(r.h) + ' '
    + r.ds.map((d, i) => (d.de.toFixed(1) + (d.de < BAR ? '!' : ' ')).padStart(cueW[i] + 2)).join('')
    + '   ' + r.worst.label + ' ' + r.worst.de.toFixed(1));
}
const meanBad = meanRows.filter((r) => r.worst.de < BAR);
if (meanBad.length) {
  fails += meanBad.length;
  for (const r of meanBad) {
    console.log(`  MEANING  FAIL — ${r.n}'s own ring colour ${hex(r.h)} is ΔE ${r.worst.de.toFixed(1)} from the `
      + `${r.worst.label} cue (bar ${BAR}). In the neutral band a child is shown ${r.worst.label} and told nothing.`);
  }
} else {
  console.log(`  MEANING  PASS — closest any sibling comes to a cue is ΔE `
    + `${Math.min(...meanRows.map((r) => r.worst.de)).toFixed(1)}, bar ${BAR}.`);
}

// the two reds are ONE meaning in two shades, on purpose. Printed as a control
// so nobody reads the number below as a defect in the cue set itself.
{
  const pairs = [];
  for (let i = 0; i < CUES.length; i++) for (let j = i + 1; j < CUES.length; j++) {
    pairs.push({ a: CUES[i].label, b: CUES[j].label, de: dE(CUES[i].hex, CUES[j].hex) });
  }
  const near = pairs.reduce((a, b) => (a.de < b.de ? a : b));
  console.log(`  (control: the cue colours' own closest pair is ${near.a}/${near.b} at ΔE ${near.de.toFixed(1)} — `
    + 'both of those mean RUN and are deliberately one colour in two shades.)');
}

// ── 3. IDENTITY: no two siblings may be read as each other ────────────────
console.log('');
let worstPair = null;
for (let i = 0; i < NAMES.length; i++) for (let j = i + 1; j < NAMES.length; j++) {
  const a = NAMES[i], b = NAMES[j];
  const d = dE(ID.col[a], ID.col[b]);
  if (!worstPair || d < worstPair.de) worstPair = { a, b, de: d };
}
if (worstPair.de < BAR) {
  fails++;
  console.log(`  IDENTITY FAIL — ${worstPair.a} and ${worstPair.b} are ΔE ${worstPair.de.toFixed(1)} apart `
    + `(bar ${BAR}): the ring names two different siblings with one colour.`);
} else {
  console.log(`  IDENTITY PASS — closest pair is ${worstPair.a}/${worstPair.b} at ΔE ${worstPair.de.toFixed(1)}, bar ${BAR}.`);
}

// ══ THE RENDERED PASS ═════════════════════════════════════════════════════
// Authored albedo is not a photograph. This half takes the REAL halo of a REAL
// rival in a REAL match, freezes it on screen, repaints it with each of the
// nine colours in turn, screenshots THE CANVAS, and measures what actually
// reaches a child's eye.
if (AUTHORED_ONLY) {
  console.log('\n  RENDERED  skipped (--authored). The bar above rests on a rho this run did not check.');
} else {
  const { chromium } = await import('playwright');
  const ALL = [...CUES.map((c) => ({ label: c.label, hex: c.hex })),
    ...NAMES.map((n) => ({ label: n, hex: ID.col[n] }))];
  const INNER = Number(SRC.match(/new THREE\.RingGeometry\(([\d.]+), ([\d.]+), (\d+)\)/)[1]);
  const OUTER = Number(SRC.match(/new THREE\.RingGeometry\(([\d.]+), ([\d.]+), (\d+)\)/)[2]);
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 400, height: 760 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
  } catch { /* private mode */ } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForSelector('#btnPlay', { state: 'visible', timeout: 400000 });
  await p.evaluate(() => document.getElementById('btnPlay').click());
  await p.waitForSelector('#worldRow .wCard[data-world="maple"]', { state: 'visible', timeout: 400000 });
  await p.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]').click());
  // MATCH seconds, not wall seconds: under swiftshader the clock runs 14-40x
  // slower, and the last family seat opens at t=42-54.
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 22, null, { timeout: 900000 });
  // RUNG 1, not rung 0: shadows and bloom are both still on, so this is the
  // player's post pipeline and not a cheaper one — it is the pixel RATIO that
  // drops, 2.0 to 1.6, which is 1.6x fewer pixels for a software renderer to
  // push per frame and changes nothing about how a colour is graded. Pinned so
  // the adapter cannot walk the ladder mid-shoot (see qa notes on the shadow
  // sweep that measured a 0% saving off a rung nobody chose).
  await p.evaluate(() => { window.__pinQuality(1); window.__setVoidR(1.9); });

  // every hex the LIVE game paints on a ring, sampled off the real materials.
  // If the game ever shows a colour that is not one of the nine authored above,
  // the source read is wrong and every number in this file is about the wrong
  // thing.
  const live = await p.evaluate(async (params) => {
    const seen = new Set();
    for (let i = 0; i < 24; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      window.__scene.traverse((o) => {
        if (o.isMesh && o.visible && o.geometry?.type === 'RingGeometry'
          && Math.abs(o.geometry.parameters.innerRadius - params.INNER) < 1e-6) seen.add(o.material.color.getHex());
      });
    }
    return [...seen];
  }, { INNER });
  const strays = live.filter((h) => !ALL.some((a) => dE(a.hex, h) < 0.5));
  console.log(`\n  RENDERED  live halo hexes this match: ${live.map(hex).join(' ')}`);
  if (strays.length) {
    fails++;
    console.log(`  RENDERED  FAIL — the running game paints ${strays.map(hex).join(' ')} on a ring, and the source `
      + 'read above does not account for it. The authored table is not what ships.');
  }

  // pick the halo that is on screen and biggest, freeze it there, and take the
  // colour writes away from the game
  const target = await p.evaluate(async (params) => {
    const T = window.__THREE, S = window.__scene, C = window.__cam;
    const st0 = window.__matchState();
    if (!st0.rivals.some((r) => r.joined)) return { err: 'no family member has joined the match' };
    // NOT the COPYCAT and NOT the BULLY. The player is parked at the shooting
    // spot for the whole shoot, and those two archetypes have errands that
    // bring them to the player: the copycat drives the player's own trail and
    // the bully prowls the player's block. Freeze one of their rings and its
    // owner spends the next ten frames standing on it, which is 920 of 1180
    // candidate pixels thrown out as scene motion — measured, that exact run.
    const away = st0.rivals.filter((r) => r.joined && r.arch !== 'COPYCAT' && r.arch !== 'BULLY');
    const NAME = (away[0] ?? st0.rivals.find((r) => r.joined)).name;
    const liveRival = () => window.__matchState().rivals.find((r) => r.name === NAME);
    const haloNear = (rv) => {
      let bst = null;
      S.traverse((o) => {
        if (!(o.isMesh && o.geometry?.type === 'RingGeometry'
          && Math.abs(o.geometry.parameters.innerRadius - params.INNER) < 1e-6)) return;
        const d = Math.hypot(o.position.x - rv.x, o.position.z - rv.z);
        if (!bst || d < bst.d) bst = { o, d };
      });
      return bst;
    };
    // ── PUT THE RING IN FRAME, AND MIND BOTH THE LENS AND THE CLOCK ───────
    // Two things killed the first two versions of this.
    //  · THE LENS. The camera is a 32-degree VERTICAL fov on a portrait
    //    viewport, so at 480x900 the HORIZONTAL half-angle is 8.7 degrees —
    //    about 11 world units either side of the look-at point at this follow
    //    distance. Standing 16-34 units to the SIDE of a rival, which is what
    //    the first version did, puts it off screen every time. So the player is
    //    placed on the camera's own azimuth, BETWEEN the lens and the rival.
    //  · THE CLOCK. dt is capped at 0.05, so N rendered frames is exactly
    //    N x 0.05 MATCH seconds however slow the software renderer is. The
    //    second version settled for 30 frames = 1.5 match seconds, and a rival
    //    cruising at 25 u/s covers 37 units in that — out of an 11-unit
    //    window. It measured rings at NDC x -1.5, -2.2 and -4.5. Two frames,
    //    then re-aim, then freeze.
    let best = null; const log = [];
    for (let att = 0; att < 6 && !best; att++) {
      const rv = liveRival(); const v = window.__voidState();
      const dx = C.position.x - v.x, dz = C.position.z - v.z, dl = Math.hypot(dx, dz) || 1;
      let put = false;
      for (const d of [11, 14, 17, 21]) {
        const x = rv.x + (dx / dl) * d, z = rv.z + (dz / dl) * d;
        if (window.__solidAt(x, z, 2)) { window.__warpVoid(x, z); put = true; break; }
      }
      if (!put) { log.push('att' + att + ': no solid ground on the camera azimuth'); continue; }
      await new Promise((res) => requestAnimationFrame(res));
      await new Promise((res) => requestAnimationFrame(res));
      const rv2 = liveRival(); const h = haloNear(rv2);
      if (!h) { log.push('att' + att + ': no ring mesh near ' + NAME); continue; }
      const n = new T.Vector3(h.o.position.x, h.o.position.y, h.o.position.z).project(C);
      log.push('att' + att + ': ndc ' + n.x.toFixed(2) + ',' + n.y.toFixed(2) + ' ring-to-rival ' + h.d.toFixed(1) + 'u');
      if (h.o.visible && Math.abs(n.x) < 0.6 && Math.abs(n.y) < 0.7 && n.z < 1
        && (!best || h.o.scale.x > best.o.scale.x)) best = { o: h.o, ndc: [+n.x.toFixed(2), +n.y.toFixed(2)] };
    }
    if (!best) return { err: NAME + "'s ring never landed inside the frame: " + log.join(' | ') };
    const o = best.o;
    o.updateMatrixWorld(true);
    o.matrixAutoUpdate = false;                 // freeze it on screen; the game may keep writing x/z
    // ── AND CAPTURE WHERE IT IS FROZEN, IN THE SAME BREATH ────────────────
    // matrixAutoUpdate = false freezes the MATRIX. It does not stop the game
    // writing `halo.position.set(rv.x, 0.14, rv.z)` and `scale.setScalar(...)`
    // every frame — those fields simply stop reaching the matrix. So a moment
    // later `o.position` is where the rival now IS and `o.matrixWorld` is where
    // the ring still IS, and they are two different places. Projecting the
    // first while photographing the second is what produced a 92-pixel mask
    // out of an 825-pixel band, and then a band that missed the page entirely.
    // These two constants are the frozen transform and nothing reads the live
    // fields again.
    const FX = o.position.x, FY = o.position.y, FZ = o.position.z, FS = o.scale.x;
    const mat = o.material;
    const col = mat.color;
    const set = col.setHex.bind(col);
    col.setHex = function () { return this; };  // the game no longer owns this ring's colour
    const op = mat.opacity;
    Object.defineProperty(mat, 'opacity', { get: () => op, set: () => {} });
    // let the rival WALK OFF its own frozen ring before anything is measured.
    // Everything moving in this patch of ground is what the stability mask has
    // to throw away, and much the biggest mover is the void the ring belonged
    // to. 20 frames is 1.0 match second at the 0.05 dt cap — 16-27 units, more
    // than a body width.
    for (let i = 0; i < 30; i++) await new Promise((res) => requestAnimationFrame(res));
    // the ring's screen band, computed once from the frozen transform
    const px = [], s = FS;
    for (let k = 0; k < 480; k++) {
      const th = (k / 480) * Math.PI * 2;
      for (const rr of [params.INNER + 0.04, 1.22, 1.285, 1.35, params.OUTER - 0.04]) {
        const w = new T.Vector3(FX + Math.cos(th) * rr * s, FY, FZ + Math.sin(th) * rr * s).project(C);
        // Points behind the lens project to nonsense and points off the edge
        // project to coordinates that are not pixels. Both have to go here, or
        // the bounding box the shots are clipped to is not on the page — which
        // is exactly how this threw "clip.width must be greater than 0".
        if (!(w.z < 1) || Math.abs(w.x) > 1 || Math.abs(w.y) > 1) continue;
        px.push([Math.round((w.x * 0.5 + 0.5) * innerWidth), Math.round((-w.y * 0.5 + 0.5) * innerHeight)]);
      }
    }
    window.__ringSet = set;
    window.__ringShow = (v) => { o.visible = v; };
    window.__ringVisible = () => o.visible;
    // ── AND PIN THE CAMERA, BEFORE EVERY SINGLE SHOT ──────────────────────
    // The ring is frozen in the WORLD. The camera is not: nobody is driving,
    // but the void keeps its residual velocity, the shore eases it inland, and
    // a rival that brushes past shoves it — so over a dozen screenshots the
    // lens drifts and the frozen ring slides out from under a mask that was
    // computed once. That is not a small error, it is a total one: the run
    // before this fix reported rgb(178,180,86) for a RED ring, because by the
    // fourth colour the mask was sampling grass. __warpVoid re-snaps the void
    // AND the camera to the same place with the live camOffset and camDist,
    // and the radius is pinned, so camDist is a constant.
    const HX = window.__voidState().x, HZ = window.__voidState().z;
    window.__reAim = () => { window.__setVoidR(1.9); window.__warpVoid(HX, HZ); };
    return { px, opacity: op, scale: FS, who: NAME, ndc: best.ndc };
  }, { INNER, OUTER });
  if (target.err) {
    fails++;
    console.log(`  RENDERED  FAIL — ${target.err}. Nothing was photographed, so rho was not checked and the `
      + 'bar above is resting on a number this run did not confirm.');
  } else {
    // ── SHOOT ONLY THE RING ───────────────────────────────────────────────
    // A full-page screenshot of every frame is most of this probe's wall clock
    // under a software renderer. The ring's own bounding box is a few per cent
    // of the page, and every pixel outside it is thrown away by the mask
    // anyway. Coordinates below are CLIP-space from here on.
    const VW = 400, VH = 760;
    let cx0 = 1e9, cy0 = 1e9, cx1 = -1e9, cy1 = -1e9;
    for (const [x, y] of target.px) {
      if (x < 0 || y < 0 || x >= VW || y >= VH) continue;
      if (x < cx0) cx0 = x; if (y < cy0) cy0 = y; if (x > cx1) cx1 = x; if (y > cy1) cy1 = y;
    }
    if (cx1 < cx0 || cy1 < cy0) throw new Error('none of the ring\'s projected points is on the page — '
      + 'the frame test above passed on the ring CENTRE while the band itself is off screen.');
    const CLIP = { x: Math.max(0, cx0 - 6), y: Math.max(0, cy0 - 6) };
    CLIP.width = Math.min(VW - CLIP.x, cx1 - CLIP.x + 7);
    CLIP.height = Math.min(VH - CLIP.y, cy1 - CLIP.y + 7);
    const shoot = async () => {
      await p.evaluate(() => window.__reAim());
      for (let i = 0; i < 2; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      await p.evaluate(() => window.__reAim());
      return PNG.sync.read(await p.screenshot({ clip: CLIP, timeout: 600000 }));
    };
    // OFF, WHITE, OFF — in that order, so the two reference frames straddle the
    // one they are compared against. A screenshot under a software renderer
    // takes seconds of wall time and the world keeps running through it, so
    // temporal distance is the enemy: bracketing halves it.
    // OFF, WHITE, BLACK, OFF — in that order, so the two reference frames
    // straddle the two probe frames. A screenshot under a software renderer
    // takes seconds of wall time and the world keeps running through it, so
    // temporal distance is the enemy and bracketing halves it.
    //
    // TWO probe colours, not one, and this is not belt-and-braces. The mask
    // asks "did this pixel move when the ring appeared", and a WHITE ring over
    // pale pavement barely moves it while a BLACK ring over night ground barely
    // moves it either. One reference silently selects for ground that happens
    // to contrast with it — which is how a 92-pixel mask came out of an 825-
    // pixel band. Taking the larger of the two responses is blind to which.
    const at = (png, x, y) => { const i = (png.width * (y - CLIP.y) + (x - CLIP.x)) << 2; return [png.data[i], png.data[i + 1], png.data[i + 2]]; };
    let off1, white, black, off2, mask = [], seen = new Set(), rej = { dim: 0, moved: 0 };
    for (let tryN = 0; tryN < 3; tryN++) {
      if (tryN) {
        // whatever was moving through the ring has not left yet. 30 more frames
        // is 1.5 more MATCH seconds at the 0.05 dt cap — 24 to 40 units for a
        // cruising void — and then ask again.
        await p.evaluate(async () => { for (let i = 0; i < 30; i++) await new Promise((r) => requestAnimationFrame(r)); });
      }
      await p.evaluate(() => window.__ringShow(false));
      off1 = await shoot();
      await p.evaluate(() => { window.__ringShow(true); window.__ringSet(0xffffff); });
      white = await shoot();
      await p.evaluate(() => { window.__ringShow(true); window.__ringSet(0x000000); });
      black = await shoot();
      await p.evaluate(() => window.__ringShow(false));
      off2 = await shoot();
      if (await p.evaluate(() => window.__ringVisible())) throw new Error('the game turned the ring back on mid-shoot');
      mask = []; seen = new Set(); rej = { dim: 0, moved: 0 };
      buildMask();
      if (mask.length >= 120) break;
      console.log(`  RENDERED  mask attempt ${tryN + 1}: ${mask.length} px (${rej.dim} too dim, ${rej.moved} scene motion)`);
    }
    // A ring pixel is one inside the projected band whose response to the ring
    // appearing is BIG, and big RELATIVE to how much it drifts on its own
    // between two bare-ground frames. Not "big and the scene held still" — see
    // the note inside.
    function buildMask() {
    for (const [x, y] of target.px) {
      if (x < CLIP.x + 1 || y < CLIP.y + 1 || x >= CLIP.x + off1.width - 1 || y >= CLIP.y + off1.height - 1) continue;
      const k = y * 4096 + x; if (seen.has(k)) continue; seen.add(k);
      const a1 = at(off1, x, y), a2 = at(off2, x, y), w = at(white, x, y), k2 = at(black, x, y);
      const drift = Math.max(...a1.map((v, i) => Math.abs(v - a2[i])));
      const ref = a1.map((v, i) => (v + a2[i]) / 2);
      const change = Math.max(
        Math.max(...ref.map((v, i) => Math.abs(v - w[i]))),
        Math.max(...ref.map((v, i) => Math.abs(v - k2[i]))));
      if (change < 25) rej.dim++; else if (change < 2.5 * drift) rej.moved++;
      // A FIXED drift bar rejected 95% of a real ring (53 px of 1090) because
      // the whole scene keeps moving between screenshots. What separates ring
      // from world is not that the world is still — it is that the ring's pixel
      // moves MUCH further when the ring appears than it does on its own.
      if (change >= 25 && change >= 2.5 * drift) mask.push([x, y]);
    }
    }
    console.log(`  RENDERED  ring mask: ${mask.length} px (of ${seen.size} projected, `
      + `opacity ${target.opacity}, ring scale ${target.scale.toFixed(2)}, ${target.who}'s ring at NDC ${target.ndc})`);
    if (mask.length < 120) {
      fails++;
      console.log(`  RENDERED  FAIL — fewer than 120 ring pixels survived the mask (${rej.dim} rejected as `
        + `too dim a response, ${rej.moved} as scene motion). A median over a handful of pixels is not a `
        + 'measurement, and which of those two counts is large says which cause to chase.');
    } else {
      const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
      const rows = [];
      for (const c of ALL) {
        // re-assert visibility: if the rival dies or respawns mid-shoot the game
        // sets halo.visible = false (rivals.ts), and a hidden ring would be
        // measured as bare ground without saying so.
        await p.evaluate((h) => { window.__ringShow(true); window.__ringSet(h); }, c.hex);
        const png = await shoot();
        const ch = [[], [], []];
        for (const [x, y] of mask) { const v = at(png, x, y); for (let i = 0; i < 3; i++) ch[i].push(v[i]); }
        rows.push({ ...c, rgb: ch.map(med) });
      }
      console.log('  RENDERED  ' + rows.map((r) => `${r.label} ${hex(r.hex)}→rgb(${r.rgb.join(',')})`).join('\n            '));
      // ── DID THE MASK STILL COVER THE RING AT THE END? ────────────────────
      // Every median above is only worth what the mask is worth, and the mask
      // was computed before the first colour went on. One more OFF frame at the
      // end, compared against the OFF frame at the start over the same pixels,
      // says whether the frame moved underneath it. Silence here would be the
      // worst kind of pass.
      await p.evaluate(() => window.__ringShow(false));
      const off3 = await shoot();
      const drifts = mask.map(([x, y]) => {
        const a = at(off1, x, y), c = at(off3, x, y);
        return Math.max(...a.map((v, i) => Math.abs(v - c[i])));
      }).sort((x, y) => x - y);
      const dMed = drifts[drifts.length >> 1], dP90 = drifts[Math.floor(drifts.length * 0.9)];
      console.log(`  RENDERED  mask stability across the whole shoot: median ${dMed}, p90 ${dP90} (of 255)`);
      if (dMed > 12) {
        fails++;
        console.log(`  RENDERED  FAIL — the frame moved under the mask during the shoot (median ${dMed}/255 `
          + 'between the first and last bare-ground frames). The medians above are of somewhere else.');
      }
      const ratios = [];
      for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
        const au = dE(rows[i].hex, rows[j].hex), re = dERGB(rows[i].rgb, rows[j].rgb);
        if (au > 5) ratios.push({ a: rows[i].label, b: rows[j].label, au, re, rho: re / au });
      }
      ratios.sort((x, y) => x.rho - y.rho);
      const rhoMin = ratios[0], rhoMed = ratios[ratios.length >> 1], rhoMax = ratios[ratios.length - 1];
      console.log(`  RENDERED  rho over ${ratios.length} pairs: min ${rhoMin.rho.toFixed(2)} `
        + `(${rhoMin.a}/${rhoMin.b}, ΔE ${rhoMin.au.toFixed(1)}→${rhoMin.re.toFixed(1)}), `
        + `median ${rhoMed.rho.toFixed(2)}, max ${rhoMax.rho.toFixed(2)} (${rhoMax.a}/${rhoMax.b})`);
      // the worst rendered separation between a sibling and a MEANING
      let worstRend = null;
      for (const r of ratios) {
        const sib = NAMES.includes(r.a) ? r.a : NAMES.includes(r.b) ? r.b : null;
        const cue = CUES.find((c) => c.label === r.a || c.label === r.b);
        if (!sib || !cue) continue;
        if (!worstRend || r.re < worstRend.re) worstRend = r;
      }
      console.log(`  RENDERED  worst sibling-vs-meaning pair on screen: ${worstRend.a}/${worstRend.b} at `
        + `ΔE ${worstRend.re.toFixed(1)} rendered (${worstRend.au.toFixed(1)} authored), floor ${FLOOR}`);
      if (rhoMin.rho < RHO_ASSUMED) {
        fails++;
        console.log(`  RENDERED  FAIL — the pipeline compresses harder than the bar assumed `
          + `(${rhoMin.rho.toFixed(2)} < ${RHO_ASSUMED}). The authored bar of ΔE ${BAR} no longer guarantees `
          + `ΔE ${FLOOR} on screen. Re-derive BAR from this rho.`);
      } else if (worstRend.re < FLOOR) {
        fails++;
        console.log(`  RENDERED  FAIL — on screen, ${worstRend.a} and ${worstRend.b} are ΔE `
          + `${worstRend.re.toFixed(1)} apart, under the floor of ${FLOOR}. They are the same colour to a child.`);
      } else {
        console.log(`  RENDERED  PASS — rho ${rhoMin.rho.toFixed(2)} >= ${RHO_ASSUMED}, and every sibling stays `
          + `ΔE ${worstRend.re.toFixed(1)} from every meaning once it is on screen.`);
      }
    }
  }
  await b.close();
}

console.log(fails
  ? `\nFAIL — ${fails} ring-channel defect${fails > 1 ? 's' : ''}. A six-year-old cannot read this ground.\n`
  : '\nPASS — every sibling\'s ring is its own colour and none of them is a meaning.\n');
process.exit(fails ? 1 : 0);
