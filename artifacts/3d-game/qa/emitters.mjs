// EVERY LAMP CLEARS THE CUT — the emitter census (studio round 4, Job 9; the
// Lantern half of B7)
//
//   node qa/emitters.mjs [--world=lantern,pirate]
//
// Art direction's rule: "glow means a light source, and every light source
// glows". Job 5 closed the first half (no paint crosses the bloom cut). This is
// the second half, asked of every colour the game merges into PROP_GLOW_MAT.
// In lantern_look.png only the paper-white lantern on the wire wears a halo;
// the amber and the red ones lift their surroundings by nothing (-7 and -2 L*).
// The studio's arithmetic said why: part() bakes the skylight into every vertex
// colour, lamps included, so a lamp's side face is its colour x 0.74 x 1.75,
// and bloom keys on LUMINANCE — a saturated red or orange lamp is a dim number
// however bright it looks, and it never reaches the cut.
//
// ── WHAT IT MEASURES ────────────────────────────────────────────────────────
// For every world, the dimmest face of every lamp the play camera can see, in
// the linear buffer RenderPass hands to bloom, against that world's bloom cut
// at its brightest hour. The bar is the studio's: at least 1.2x the cut, so a
// lamp still clears it with its edge pixels blended and the fog starting.
// And one more: the normalisation's gain cap may not hold down any lamp the
// game ships — the cap exists for a FUTURE dark emitter, and a shipping lamp it
// catches lands dimmer than its siblings, which is the hue-dependence this job
// removes.
//
// ── IT RUNS THE SOURCE, IT DOES NOT COPY IT ─────────────────────────────────
// Governor rule 4. Nothing below is a transcribed colour, cut or constant:
//   · the COLOURS: every exported builder of every module that imports
//     PROP_GLOW_MAT and can reach it (it names the material, or calls a
//     function of its own module that does), and every island.ts function that
//     names it, is RUN in node — TypeScript compiler, top-level declarations
//     resolved on demand, as qa/faceray.mjs does — with island.ts's own part().
//     So each lamp's vertex colours are the ones part() bakes, skylight and
//     Uint16 clamp included. mergedProp is the one stub: it records what is
//     merged onto the glow material. Every run is on a seeded Math.random, 24
//     runs per placement, so a pick() among lamp colours is covered.
//   · the WORLDS: a builder counts for a world when an `if (WORLD_ID === 'w')`
//     block in island.ts (or `worldId() === 'w'` in life.ts) names it, and a
//     call there with arguments (NM.makeLantern(0xffd489, 1.25)) is run with
//     those arguments, evaluated on the same seeded stream. A glow builder
//     named outside every world block is an ABORT: which cut it answers to is
//     unknown. One named nowhere at all is printed as never placed.
//   · the CUT: prototype3d.ts's own bloomCut(), run with each world's
//     WORLD_LIGHT row and each of its HOURS.
//   · the NORMALISATION: PROP_GLOW_MAT's own onBeforeCompile, run on three's
//     meshbasic shader. The statement it adds is found by diffing the patched
//     fragment shader against three's, and has to read `diffuseColor.rgb *= X;`
//     with the colour used only as luminance(diffuseColor.rgb); X is then
//     evaluated as written, with the uniform values setGlowFloor() leaves when
//     prototype3d.ts's applyLightRig() feeds it bloomCut(). No patch = gain 1.
//   · LUMINANCE: three's own coefficients (ColorManagement), which is what
//     luminance() is in that statement and in UnrealBloomPass's high-pass.
//   · the CAMERA: camOffset and the camera's fov out of prototype3d.ts. Its
//     lowest ray (pitch minus half the fov) sets which faces count as seen: a
//     face whose normal dips below the horizon by more than that ray rises
//     above it is never drawn to her, so a lantern's underside does not count.
// Anything it cannot find is a FAIL line and exit 2 — a probe that silently
// skips what moved is the same bug wearing a hat.
//
// ── WHAT IT DOES NOT SEE ────────────────────────────────────────────────────
// A lamp's pixels in a frame: fog, the edge blend and a material the running
// game swaps in. The too-big-to-eat grey (prototype3d.ts) cloned every mesh of
// a gated prop, lamps included, and a clone drops onBeforeCompile — so a gated
// lamp lost the normalisation for the rest of the match. That is a browser
// question and qa/lampglow.mjs asks it (lamps on a material that is not the
// shared one).
import { readFileSync, readdirSync } from 'node:fs';

// AN ABORT IS A FAIL, IN THE WORDS THE GATE READS (qa/townface.mjs learned this
// the hard way): every way out that is not the last line prints a FAIL line.
const abort = (why) => { console.log(`FAIL — ABORTED — ${why}`); process.exit(2); };
process.on('uncaughtException', (e) => abort(`the probe threw: ${e?.stack || e}`));
process.on('unhandledRejection', (e) => abort(`the probe threw: ${e?.stack || e}`));

let THREE, ts;
try { THREE = await import('three'); } catch (e) { abort(`three did not load: ${e.message}`); }
try { ts = (await import('typescript')).default; } catch (e) { abort(`typescript did not load: ${e.message}`); }

const argv = (k) => { const a = process.argv.find((s) => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3).split(',') : null; };
const ONLY = argv('world');
const RUNS = 24;               // seeded runs per placement
const RATIO_BAR = 1.2;         // the studio's bar: a lamp's dimmest seen face at 1.2x the cut
const SEED = 0x9e3779b9;

const IS_PATH = 'src/proto3d/island.ts';
const P3_PATH = 'src/prototype3d.ts';
const LIFE_PATH = 'src/proto3d/life.ts';
const DIR = 'src/proto3d';

// ── THE SOURCE, AS THE COMPILER SEES IT ──────────────────────────────────────
const readSource = (path) => {
  try { return readFileSync(path, 'utf8'); }
  catch (e) { abort(`${path} is not readable from ${process.cwd()} (${e.code || e.message}). Run this from artifacts/3d-game.`); }
};
function load(path) {
  const src = readSource(path);
  const ast = ts.createSourceFile(path, src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const decl = new Map(), imported = new Map(), exprs = [], exported = [];
  for (const st of ast.statements) {
    if (ts.isImportDeclaration(st)) {
      const c = st.importClause; if (!c) continue;
      const from = st.moduleSpecifier.text;
      if (c.name) imported.set(c.name.text, from);
      const nb = c.namedBindings;
      if (nb && ts.isNamespaceImport(nb)) imported.set(nb.name.text, from);
      if (nb && ts.isNamedImports(nb)) for (const e of nb.elements) imported.set(e.name.text, from);
    } else if (ts.isFunctionDeclaration(st) && st.name) {
      decl.set(st.name.text, st);
      if (st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) exported.push(st.name.text);
    } else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) decl.set(d.name.text, st);
    } else if (ts.isExpressionStatement(st)) exprs.push(st);
  }
  return { path, src, ast, decl, imported, exprs, exported, jsCache: new Map(), order: [] };
}
const toJs = (text) => ts.transpileModule(text, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true } }).outputText;
const jsOf = (F, st) => {
  if (!F.jsCache.has(st)) F.jsCache.set(st, toJs(st.getText(F.ast).replace(/^export\s+(default\s+)?/, '')));
  return F.jsCache.get(st);
};
const namesOf = (st) => (ts.isFunctionDeclaration(st) ? [st.name.text]
  : st.declarationList.declarations.filter((d) => ts.isIdentifier(d.name)).map((d) => d.name.text));
// Run a piece of F with its top-level dependencies resolved on demand: a
// ReferenceError names what is missing; if F declares it at the top level, its
// statement goes in front and the run repeats. A name in `stubs` is never
// taken from F (a declaration in the body would shadow the stub), and an
// IMPORTED name must be a stub — anything else aborts, naming it.
function run(F, js, stubs, onAttempt) {
  for (let guard = 0; guard < 400; guard++) {
    if (onAttempt) onAttempt();   // a retried run starts clean: nothing a failed attempt built is kept
    const seen = new Set(), pre = [];
    for (const n of F.order) {
      const st = F.decl.get(n);
      if (seen.has(st) || namesOf(st).some((x) => x in stubs)) continue;
      seen.add(st); pre.push(jsOf(F, st));
    }
    let fn;
    try { fn = new Function(...Object.keys(stubs), `${pre.join('\n')}\n${js}`); }
    catch (e) { abort(`${F.path}: the lifted source did not compile (${e.message})`); }
    try { return fn(...Object.values(stubs)); } catch (e) {
      if (!(e instanceof ReferenceError)) throw e;
      const m = /^(\w+) is not defined$/.exec(e.message) || /^Cannot access '(\w+)' before initialization$/.exec(e.message);
      if (!m) throw e;
      const n = m[1];
      if (n in stubs) throw e;
      if (F.imported.has(n)) abort(`${F.path}: the code run here reads \`${n}\`, which the file imports from ${F.imported.get(n)} — give this probe a stub for it`);
      if (!F.decl.has(n)) abort(`${F.path}: the code run here reads \`${n}\`, which is not a top-level declaration of the file — the source changed shape`);
      const at = F.order.indexOf(n); if (at >= 0) F.order.splice(at, 1);
      F.order.unshift(n);
    }
  }
  abort(`${F.path}: could not resolve the dependencies in 400 passes`);
}
function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6d2b79f5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const realRandom = Math.random;
const seeded = (seed, body) => { Math.random = mulberry32(seed); try { return body(); } finally { Math.random = realRandom; } };

const IS = load(IS_PATH), P3 = load(P3_PATH), LIFE = load(LIFE_PATH);

// ── THE LUMINANCE BLOOM KEYS ON ──────────────────────────────────────────────
const LC = THREE.ColorManagement.getLuminanceCoefficients(new THREE.Vector3());
const lumOf = (r, g, b) => LC.x * r + LC.y * g + LC.z * b;
{
  let hp = '';
  try { hp = (await import('three/examples/jsm/shaders/LuminosityHighPassShader.js')).LuminosityHighPassShader.fragmentShader; }
  catch (e) { abort(`three's LuminosityHighPassShader did not load: ${e.message}`); }
  if (!/luminance\(\s*texel\.xyz\s*\)/.test(hp)) abort('UnrealBloomPass\'s high-pass no longer keys on luminance(texel.xyz) — this probe\'s measure is not what bloom reads');
}

// ── THE CUT, PER WORLD AND HOUR: prototype3d.ts's own bloomCut() ──────────────
const P3STUBS = { THREE };
const WORLD_LIGHT = run(P3, 'return WORLD_LIGHT;', P3STUBS);
const HOURS = run(P3, 'return HOURS;', P3STUBS);
if (!P3.decl.has('bloomCut')) abort(`${P3_PATH} has no top-level bloomCut — the per-world cut moved`);
const cutAt = (w, sunK) => run(P3, 'return bloomCut();', { ...P3STUBS, LIGHT: WORLD_LIGHT[w], hourSunK: sunK });
const WORLDS = Object.keys(WORLD_LIGHT);
for (const w of WORLDS) if (!Array.isArray(HOURS[w]) || !HOURS[w].length) abort(`HOURS has no entry for ${w}`);

// ── THE CAMERA'S LOWEST RAY ──────────────────────────────────────────────────
const camOffset = run(P3, 'return camOffset;', P3STUBS);
let FOV = NaN;
{
  const st = P3.decl.get('camera');
  const d = st && ts.isVariableStatement(st) && st.declarationList.declarations.find((x) => x.name.getText(P3.ast) === 'camera');
  const init = d?.initializer;
  if (!init || !ts.isNewExpression(init) || !/PerspectiveCamera$/.test(init.expression.getText(P3.ast)))
    abort(`${P3_PATH}: \`const camera\` is no longer a new PerspectiveCamera(...)`);
  FOV = Number(init.arguments[0].getText(P3.ast));
  if (!(FOV > 0 && FOV < 120)) abort(`${P3_PATH}: the camera's fov does not read as a number (${init.arguments[0].getText(P3.ast)})`);
}
const PITCH = Math.asin(camOffset.y) * 180 / Math.PI;
const LOW_RAY = PITCH - FOV / 2;                       // degrees below the horizon
const NY_SEEN = -Math.cos(LOW_RAY * Math.PI / 180);     // a normal dipping further than this is never drawn

// ── THE GLOW MATERIAL AND WHAT IT DOES TO A LAMP ─────────────────────────────
// island.ts's PROP_GLOW_MAT, and every top-level statement that starts with it
// (the onBeforeCompile), run; the patch is applied to three's own meshbasic
// fragment shader inside the same run, so everything it reads is resolved.
const ISSTUBS = { THREE, glossOf: () => 0 };   // glossOf: the specular channel, which an unlit material never reads
if (!IS.decl.has('PROP_GLOW_MAT')) abort(`${IS_PATH} no longer declares PROP_GLOW_MAT at the top level`);
const FRAG0 = THREE.ShaderLib.basic.fragmentShader;
const glowExprs = IS.exprs.filter((st) => /^\s*PROP_GLOW_MAT\b/.test(st.getText(IS.ast))).map((st) => jsOf(IS, st));
const hasSetter = IS.decl.has('setGlowFloor');
// Does the running game feed the floor the world's cut? applyLightRig() is the
// one writer of the bloom threshold; the floor has to ride the same call.
const ALR = P3.decl.get('applyLightRig');
if (!ALR) abort(`${P3_PATH} has no top-level applyLightRig — the one writer of the bloom threshold moved`);
// A call in the code, not in a comment: walked on the syntax tree.
let floorFed = false;
{
  const walk = (n) => {
    if (ts.isCallExpression(n) && n.expression.getText(P3.ast) === 'setGlowFloor'
      && n.arguments.length === 1 && n.arguments[0].getText(P3.ast).replace(/\s+/g, '') === 'bloomCut()') floorFed = true;
    ts.forEachChild(n, walk);
  };
  walk(ALR);
}
const CUT_LIST = [];
for (const w of WORLDS) for (const h of HOURS[w]) CUT_LIST.push({ w, h, cut: cutAt(w, h.sunK) });
const glowRun = run(IS, `${glowExprs.join('\n')}
  const __sh = { fragmentShader: __frag, vertexShader: '', uniforms: {} };
  PROP_GLOW_MAT.onBeforeCompile(__sh, null);
  const __snap = () => Object.fromEntries(Object.entries(__sh.uniforms).map(([k, v]) => [k, v && typeof v.value === 'number' ? v.value : NaN]));
  const __initial = __snap();
  const __at = ${hasSetter && floorFed ? '__cuts.map((c) => { setGlowFloor(c); return __snap(); })' : '__cuts.map(() => __initial)'};
  return { mat: PROP_GLOW_MAT, frag: __sh.fragmentShader, initial: __initial, at: __at };`,
{ ...ISSTUBS, __frag: FRAG0, __cuts: CUT_LIST.map((x) => x.cut) });
const GLOW = glowRun.mat, GLOW_COLOR = GLOW.color;
if (!GLOW.isMeshBasicMaterial || !GLOW.vertexColors) abort('PROP_GLOW_MAT is no longer an unlit vertex-coloured MeshBasicMaterial — the measure below assumes its output IS material colour x vertex colour');
const patched = Object.prototype.hasOwnProperty.call(GLOW, 'onBeforeCompile');
let gainFn = () => 1, gainText = '', capAt = Infinity;
if (patched) {
  const base = new Set(FRAG0.split('\n').map((s) => s.trim()));
  const added = glowRun.frag.split('\n').map((s) => s.trim()).filter((s) => s && !base.has(s));
  const writes = added.filter((s) => /\bdiffuseColor\b/.test(s));
  if (writes.length !== 1) abort(`PROP_GLOW_MAT's patch writes diffuseColor in ${writes.length} added lines (${writes.join(' | ') || 'none'}); this probe reads exactly one \`diffuseColor.rgb *= X;\``);
  const m = /^diffuseColor\.rgb\s*\*=\s*(.+);$/.exec(writes[0]);
  if (!m) abort(`PROP_GLOW_MAT's patch reads "${writes[0]}", not \`diffuseColor.rgb *= X;\``);
  const at = glowRun.frag.indexOf(writes[0]), cf = glowRun.frag.indexOf('#include <color_fragment>');
  if (cf < 0 || at < cf) abort('PROP_GLOW_MAT\'s normalisation runs before #include <color_fragment>: the vertex colour is not in diffuseColor yet');
  let expr = m[1].replace(/luminance\s*\(\s*diffuseColor\.rgb\s*\)/g, '__L');
  if (/diffuseColor/.test(expr)) abort(`PROP_GLOW_MAT's gain reads the colour some other way than luminance(diffuseColor.rgb): ${m[1]}`);
  const uniformNames = Object.keys(glowRun.initial);
  expr = expr.replace(/\b([A-Za-z_]\w*)\b(?!\s*\()/g, (id) => {
    if (id === '__L') return id;
    if (uniformNames.includes(id)) {
      if (!new RegExp(`uniform\\s+float\\s+${id}\\s*;`).test(glowRun.frag)) abort(`the gain reads ${id}, which the patched shader never declares as a uniform float`);
      return `__u.${id}`;
    }
    abort(`the gain reads \`${id}\`, which is neither a uniform the patch installs nor luminance(diffuseColor.rgb)`);
  });
  expr = expr.replace(/\b([A-Za-z_]\w*)\s*\(/g, (s, f) => {
    if (f === 'clamp') return '__clamp(';
    if (f === 'max' || f === 'min') return `Math.${f}(`;
    abort(`the gain calls ${f}(), which this probe does not evaluate`);
  });
  gainText = m[1];
  const f = new Function('__L', '__u', '__clamp', `return (${expr});`);
  const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
  gainFn = (L, u) => f(L, u, clamp);
  capAt = gainFn(1e-9, glowRun.initial);   // what a pitch-black lamp would be given
}
// each is CALLED once inside its run, so whatever it reads is resolved there and
// not later, inside some other file's run, where the name would not be found
const skyK = run(IS, 'skyK(0, 0.5); skyK(-0.5, 0.01); return skyK;', ISSTUBS);

// ── THE BUILDERS, RUN ────────────────────────────────────────────────────────
// island.ts's part(), whole — transform and colour bake — wrapped once so each
// part carries the colour it was asked for (the vertex colour is that colour
// after the skylight, so it cannot name itself).
const realPart = run(IS, 'part(new THREE.BoxGeometry(), 0xffffff); part(new THREE.SphereGeometry(1, 6, 4), 0x202020); return part;', ISSTUBS);
const part = (geo, col, ...rest) => { const g = realPart(geo, col, ...rest); g.userData.__col = col; return g; };
let sink = null;
const mergedProp = (parts, mat) => {
  if (mat === GLOW && sink) for (const g of parts) sink.push(g);
  return new THREE.Mesh(new THREE.BufferGeometry(), mat);
};
// voiced (proto3d/eatvoice.ts, research governor G5) only writes the meal's eat
// voice onto userData — a sound tag, nothing a material or a glow sink sees —
// so it passes the prop straight through here as it does in the game.
const STUBS = { THREE, part, mergedProp, PROP_GLOW_MAT: GLOW, PROP_SMOOTH_MAT: new THREE.MeshStandardMaterial(),
  PROP_SHARED_MAT: new THREE.MeshStandardMaterial(), registerGloss: () => {}, glossOf: () => 0,
  voiced: (m, v) => { m.userData.eatVoice = v; return m; } };

// every module that imports PROP_GLOW_MAT from island.ts, and in each, the
// functions that can reach it: those that name it, then their callers, to a
// fixed point
const MODULES = [];
for (const f of readdirSync(DIR).filter((n) => n.endsWith('.ts')).sort()) {
  const path = `${DIR}/${f}`;
  if (path === IS_PATH || !/\bPROP_GLOW_MAT\b/.test(readSource(path))) continue;
  const F = load(path);
  if (F.imported.get('PROP_GLOW_MAT') !== './island') abort(`${path} names PROP_GLOW_MAT without importing it from ./island`);
  const fns = [...F.decl.entries()].filter(([, st]) => ts.isFunctionDeclaration(st) || /=>/.test(st.getText(F.ast)));
  const reach = new Set(fns.filter(([, st]) => /\bPROP_GLOW_MAT\b/.test(st.getText(F.ast))).map(([n]) => n));
  for (let grew = true; grew;) {
    grew = false;
    for (const [n, st] of fns) {
      if (reach.has(n)) continue;
      const t = st.getText(F.ast);
      if ([...reach].some((r) => new RegExp(`\\b${r}\\s*\\(`).test(t))) { reach.add(n); grew = true; }
    }
  }
  F.lit = F.exported.filter((n) => reach.has(n));
  MODULES.push(F);
}
if (!MODULES.length) abort(`no module under ${DIR} imports PROP_GLOW_MAT — the glow material moved`);
const IS_GLOW_FNS = [...IS.decl.entries()]
  .filter(([n, st]) => ts.isFunctionDeclaration(st) && n !== 'mergedProp' && /\bPROP_GLOW_MAT\b/.test(st.getText(IS.ast)))
  .map(([n]) => n);

function runBuilder(F, name, argsJs, seed) {
  const out = [];
  seeded(seed, () => {
    for (let i = 0; i < RUNS; i++) {
      sink = out;
      const mark = out.length;
      try {
        const args = argsJs ? new Function('Math', `return [${argsJs}];`)(Math) : [];
        run(F, `return ${name}(...__args);`, { ...STUBS, __args: args }, () => { out.length = mark; });
      } finally { sink = null; }
    }
  });
  return out;
}
const glowBuilders = [];
for (const F of MODULES) for (const name of F.lit) {
  if (runBuilder(F, name, null, SEED).length) glowBuilders.push({ F, name, file: F.path });
}
for (const name of IS_GLOW_FNS) {
  if (runBuilder(IS, name, null, SEED).length) glowBuilders.push({ F: IS, name, file: IS_PATH, internal: true });
}
if (!glowBuilders.length) abort('no builder merged a single part onto PROP_GLOW_MAT');

// ── WHICH WORLD PLACES EACH ONE ──────────────────────────────────────────────
const blocks = [];
for (const F of [IS, LIFE]) {
  const walk = (n) => {
    if (ts.isIfStatement(n)) {
      const c = n.expression.getText(F.ast).replace(/\s+/g, ' ').trim();
      const m = /^(?:WORLD_ID|worldId\(\)) === '(\w+)'$/.exec(c);
      if (m) blocks.push({ world: m[1], node: n.thenStatement, F });
    }
    ts.forEachChild(n, walk);
  };
  walk(F.ast);
}
const nsFor = (F, modPath) => {
  const want = './' + modPath.split('/').pop().replace(/\.ts$/, '');
  for (const [n, from] of F.imported) if (from === want) return n;
  return null;
};
// A call site's arguments, each evaluated on its own. One that reads a local
// of the call site (NM.makeHotPool(rr)) cannot be evaluated here; it falls to
// the builder's default ONLY when that parameter cannot be a colour — its
// default is not a hex literal or a constant holding one. A colour this probe
// cannot evaluate is an abort, not a guess.
const defaulted = [];
const hexLit = /^0x[0-9a-fA-F]{6}$/;
function argsOf(b, argsTs, where) {
  const fn = b.F.decl.get(b.name);
  const params = fn.parameters;
  return argsTs.map((t, i) => {
    const js = toJs(`(${t})`).trim().replace(/;$/, '');
    try { new Function('Math', `return ${js};`)(Object.assign(Object.create(Math), { random: () => 0.5 })); return js; }
    catch (e) {
      if (!(e instanceof ReferenceError)) throw e;
      const p = params[i];
      const init = p?.initializer?.getText(b.F.ast);
      const initDecl = init && /^\w+$/.test(init) ? b.F.decl.get(init) : null;
      const initVal = initDecl && ts.isVariableStatement(initDecl)
        ? initDecl.declarationList.declarations.find((d) => d.name.getText(b.F.ast) === init)?.initializer?.getText(b.F.ast) : null;
      if (!p || !init || hexLit.test(init) || (initVal && hexLit.test(initVal)))
        abort(`${where}(${argsTs.join(', ')}): argument ${i + 1} (${t}) reads a local of the call site, and the parameter it feeds (${p ? p.name.getText(b.F.ast) : 'none'}${init ? ` = ${init}` : ''}) can be a colour — this probe cannot say what that lamp is`);
      defaulted.push(`${where}: ${p.name.getText(b.F.ast)} = ${init} (the call passes ${t})`);
      return 'undefined';
    }
  });
}
const byWorld = new Map();
const unplaced = [], stray = [];
let seedN = 1;
for (const b of glowBuilders) {
  let refs = 0;
  for (const F of [IS, LIFE]) {
    const ns = b.internal ? (F === IS ? '' : null) : nsFor(F, b.file);
    if (ns === null) continue;
    const callee = ns ? `${ns}.${b.name}` : b.name;
    const isRef = (n) => (ns
      ? ts.isPropertyAccessExpression(n) && n.getText(F.ast) === callee
      : ts.isIdentifier(n) && n.text === b.name && !(ts.isFunctionDeclaration(n.parent) && n.parent.name === n));
    const inBlock = new Set();
    for (const blk of blocks.filter((x) => x.F === F)) {
      const visit = (n) => {
        if (isRef(n)) {
          inBlock.add(n.pos);
          const call = ts.isCallExpression(n.parent) && n.parent.expression === n ? n.parent : null;
          const argsTs = call ? call.arguments.map((a) => a.getText(F.ast)) : [];
          const argsJs = argsTs.length ? argsOf(b, argsTs, `${F.path.split('/').pop()}:${F.ast.getLineAndCharacterOfPosition(n.getStart(F.ast)).line + 1} ${callee}`).join(', ') : null;
          let parts;
          try { parts = runBuilder(b.F, b.name, argsJs, SEED + seedN++); }
          catch (e) { abort(`${F.path}: ${callee}(${argsTs.join(', ')}) in the ${blk.world} block could not be run with its own arguments (${e.message})`); }
          if (!byWorld.has(blk.world)) byWorld.set(blk.world, []);
          for (const g of parts) byWorld.get(blk.world).push({ col: g.userData.__col, geo: g, who: callee });
        }
        ts.forEachChild(n, visit);
      };
      visit(blk.node);
    }
    const all = (n) => {
      if (isRef(n)) { refs++; if (!inBlock.has(n.pos)) stray.push(`${callee} at ${F.path}:${F.ast.getLineAndCharacterOfPosition(n.getStart(F.ast)).line + 1}`); }
      ts.forEachChild(n, all);
    };
    all(F.ast);
  }
  if (!refs) unplaced.push(`${b.file.split('/').pop()}:${b.name}`);
}
if (stray.length) abort(`a glow builder is named outside every world block, so which world's cut it answers to is unknown: ${stray.join(', ')}. Teach this probe where it is placed.`);

// ── GRADE ────────────────────────────────────────────────────────────────────
const hex = (c) => `#${(c >>> 0).toString(16).padStart(6, '0')}`;
const _c = new THREE.Color();
const sideOf = (col) => {   // the studio's column: the colour on a side face, colour-level
  _c.setHex(col);
  const k = skyK(0, lumOf(_c.r, _c.g, _c.b));
  return lumOf(GLOW_COLOR.r * _c.r * k, GLOW_COLOR.g * _c.g * k, GLOW_COLOR.b * _c.b * k);
};
let failed = 0;
const verdict = (ok, pass, fail) => { console.log(ok ? `PASS — ${pass}` : `FAIL — ${fail}`); if (!ok) failed++; };
console.log('\n  EVERY LAMP CLEARS THE CUT — every colour merged onto PROP_GLOW_MAT, built in node\n');
console.log(`  ·  glow material colour ${GLOW_COLOR.r.toFixed(2)}; luminance ${LC.x}/${LC.y}/${LC.z}`);
console.log(`  ·  normalisation: ${patched ? gainText : 'NONE — a lamp is its vertex colour x the material colour'}`);
if (patched) console.log(`  ·  the floor ${hasSetter ? (floorFed ? 'follows the cut: applyLightRig() calls setGlowFloor(bloomCut())' : 'does NOT follow the cut: setGlowFloor exists and applyLightRig() never calls it with bloomCut()') : 'is fixed: island.ts exports no setGlowFloor'}; gain cap ${capAt.toFixed(2)}`);
console.log(`  ·  camera pitch ${PITCH.toFixed(1)}, fov ${FOV}: lowest ray ${LOW_RAY.toFixed(1)} deg down, so a face counts as seen down to normal y ${NY_SEEN.toFixed(3)}`);
console.log(`  ·  ${glowBuilders.length} builders make light: ${glowBuilders.map((b) => `${b.file.split('/').pop().replace('.ts', '')}:${b.name}`).join(', ')}`);
if (unplaced.length) console.log(`  ·  named nowhere in island.ts or life.ts, so never placed and not graded: ${unplaced.join(', ')}`);
if (defaulted.length) console.log(`  ·  run on the builder's default where the call passes a local that is not a colour: ${[...new Set(defaulted)].join('; ')}`);
console.log('  ·  side: the colour on a side face (the studio\'s table); seen-min: the dimmest face she can see, off the vertex colours part() baked');

const rows = [];
for (const w of WORLDS) {
  if (ONLY && !ONLY.includes(w)) continue;
  const lamps = byWorld.get(w);
  if (!lamps?.length) { console.log(`\n  ${w}: no lamp on PROP_GLOW_MAT`); continue; }
  // the hour with the highest cut is the one a lamp has to clear
  let worst = null;
  CUT_LIST.forEach((x, i) => { if (x.w === w && (!worst || x.cut > worst.cut)) worst = { ...x, u: glowRun.at[i] }; });
  const uText = patched ? `, ${Object.entries(worst.u).map(([k, v]) => `${k} ${v.toFixed(4)}`).join(', ')}` : '';
  console.log(`\n  ${w}: cut ${worst.cut.toFixed(3)} at "${worst.h.name}" (its brightest hour)${uText}`);
  console.log('     colour    side   seen-min  at y    gain   lands  x cut  capped  from');
  const byCol = new Map();
  for (const l of lamps) {
    if (typeof l.col !== 'number') abort(`a glow part in ${w} from ${l.who} was built with a colour that is not a number (${l.col})`);
    const pos = l.geo.getAttribute('position'), nrm = l.geo.getAttribute('normal'), col = l.geo.getAttribute('color');
    if (!pos || !col) abort(`a glow part in ${w} from ${l.who} has no ${!pos ? 'position' : 'color'} attribute — part() changed shape`);
    let min = Infinity, ny = NaN;
    for (let i = 0; i < pos.count; i++) {
      const y = nrm ? nrm.getY(i) : 1;
      if (y <= NY_SEEN) continue;
      const L = lumOf(GLOW_COLOR.r * col.getX(i), GLOW_COLOR.g * col.getY(i), GLOW_COLOR.b * col.getZ(i));
      if (L < min) { min = L; ny = y; }
    }
    if (!Number.isFinite(min)) continue;   // a part with no face she can see
    if (!byCol.has(l.col)) byCol.set(l.col, { min, ny, who: new Set() });
    const cur = byCol.get(l.col);
    if (min < cur.min) { cur.min = min; cur.ny = ny; }
    cur.who.add(l.who);
  }
  for (const [c, v] of [...byCol.entries()].sort((a, b) => a[1].min - b[1].min)) {
    const g = gainFn(v.min, worst.u);
    const out = v.min * g, ratio = out / worst.cut;
    const capped = patched && g > 1 && g >= capAt - 1e-9;
    rows.push({ w, c, ratio, capped });
    const who = [...v.who];
    console.log(`     ${hex(c)}  ${sideOf(c).toFixed(3)}   ${v.min.toFixed(3)}  ${v.ny.toFixed(2).padStart(5)}   ${g.toFixed(2).padStart(4)}   ${out.toFixed(3)}  ${ratio.toFixed(2).padStart(4)}  ${capped ? 'CAPPED' : '  -   '}  ${who.slice(0, 3).join(', ')}${who.length > 3 ? ` +${who.length - 3}` : ''}`);
  }
}
console.log('');
if (!rows.length) abort('no lamp was graded — every world came back empty');
const under = rows.filter((r) => r.ratio < RATIO_BAR);
verdict(under.length === 0,
  `every lamp's dimmest seen face lands at ${RATIO_BAR}x its world's cut or more, at the world's brightest hour (${rows.length} colours over ${new Set(rows.map((r) => r.w)).size} worlds, lowest ${Math.min(...rows.map((r) => r.ratio)).toFixed(2)}x)`,
  `${under.length} of ${rows.length} lamp colours stay under ${RATIO_BAR}x their world's cut at its brightest hour: ${under.map((r) => `${r.w} ${hex(r.c)} ${r.ratio.toFixed(2)}x`).join(', ')}`);
const capped = rows.filter((r) => r.capped);
verdict(capped.length === 0,
  patched ? `the gain cap (${capAt.toFixed(2)}) holds down no lamp the game ships` : 'no gain cap to hold a lamp down (no normalisation)',
  `the gain cap (${capAt.toFixed(2)}) holds down ${capped.length} shipping lamp(s), which then land dimmer than their siblings: ${capped.map((r) => `${r.w} ${hex(r.c)}`).join(', ')}`);
if (patched && hasSetter && !floorFed) verdict(false, '', 'setGlowFloor exists and applyLightRig() never calls it with bloomCut(): the floor sits at its module default on every world and hour');
process.exit(failed ? 1 : 0);
