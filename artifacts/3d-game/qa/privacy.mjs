// WHAT LEAVES A SIX-YEAR-OLD'S PHONE — the kids-privacy gate.
//
// This is the one exposure the owner named himself, and it is the class of
// finding that gets a children's app REJECTED rather than merely dinged.
// Everything here is static: it reads the shipping source and the iOS project,
// so it runs in milliseconds and cannot be fooled by a code path a probe
// happened not to walk.
//
// It checks six things, and each exists because getting it wrong is a
// submission failure rather than a bug:
//
//   1. THE PRIVACY MANIFEST EXISTS AND IS IN THE TARGET. Apple requires
//      PrivacyInfo.xcprivacy, and a file sitting in the folder that is not in
//      the Resources build phase does not ship. It was absent entirely until
//      an audit found it, with the Xcode instructions in APPSTORE.md ending at
//      "Product -> Archive" and no mention of the App Privacy questionnaire.
//   2. IT DECLARES NO TRACKING. NSPrivacyTracking false, no tracking domains.
//   3. ONE EXTERNAL HOST, AND IT IS THE DECLARED ONE. Any new non-relative
//      fetch is a new data flow and must be a deliberate act, not a merge.
//   4. NO AD OR ANALYTICS SDK. Apple's Kids rule forbids sending personally
//      identifiable information OR DEVICE INFORMATION to third parties.
//   5. NO PERSISTENT IDENTIFIER. Under COPPA a persistent id collected from a
//      child IS personal information. This shipped a `vd_uid` once; it is now
//      deleted on load and the id is per-boot. Nothing may reintroduce one.
//   6. OFF BY DEFAULT. Collection must require a grown-up to switch it on.
//
//   node qa/privacy.mjs
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const fails = [];
const notes = [];

// ── 1 + 2. the manifest ──────────────────────────────────────────────────────
const MAN = 'ios/App/App/PrivacyInfo.xcprivacy';
if (!existsSync(MAN)) fails.push(`${MAN} does not exist — App Store Connect will reject the upload`);
else {
  const m = readFileSync(MAN, 'utf8');
  const bool = (key) => {
    const i = m.indexOf(`<key>${key}</key>`);
    if (i < 0) return null;
    return /^\s*<true\/>/.test(m.slice(i + `<key>${key}</key>`.length));
  };
  if (bool('NSPrivacyTracking') !== false) fails.push('NSPrivacyTracking is not false in the manifest');
  const td = m.match(/<key>NSPrivacyTrackingDomains<\/key>\s*<array\s*\/>/);
  if (!td) fails.push('NSPrivacyTrackingDomains is not an empty array');
  if (!/NSPrivacyCollectedDataType<\/key>/.test(m)) fails.push('the manifest declares no collected data type, but the app does collect');
  if (/NSPrivacyCollectedDataTypeTracking<\/key>\s*<true\/>/.test(m)) fails.push('a collected data type is marked as used for tracking');
  notes.push(`manifest present, ${(m.match(/NSPrivacyCollectedDataType<\/key>/g) || []).length} collected type(s) declared`);
}

const PBX = 'ios/App/App.xcodeproj/project.pbxproj';
if (existsSync(PBX)) {
  const pbx = readFileSync(PBX, 'utf8');
  const res = pbx.slice(pbx.indexOf('/* Begin PBXResourcesBuildPhase section */'), pbx.indexOf('/* End PBXResourcesBuildPhase section */'));
  if (!/PrivacyInfo\.xcprivacy in Resources/.test(res))
    fails.push('PrivacyInfo.xcprivacy is not in the Resources build phase — it exists but would not ship');
  else notes.push('manifest is in the App target Resources phase');
}

// ── 3. every non-relative fetch in the shipping source ───────────────────────
// The 3D game's rollup input is index.html only, so src/main.tsx and the
// retired React shell are NOT in the bundle. Walked anyway and reported, so a
// host appearing there is visible rather than silently excused.
const ALLOWED = ['uzkzuxwykajzoicuxhic.supabase.co'];
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = join(dir, e.name);
  return e.isDirectory() ? walk(p) : (/\.(ts|tsx|js|mjs)$/.test(e.name) ? [p] : []);
});
const hosts = new Map();
for (const f of walk('src')) {
  const txt = readFileSync(f, 'utf8');
  for (const m of txt.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
    const h = m[1].toLowerCase();
    if (h.endsWith('.w3.org') || h.endsWith('apple.com') || h.endsWith('rollupjs.org')) continue;  // DTD/doc URLs in comments
    if (!hosts.has(h)) hosts.set(h, f);
  }
}
for (const [h, f] of hosts) {
  if (!ALLOWED.includes(h)) fails.push(`undeclared external host "${h}" referenced in ${f}`);
}
notes.push(`external hosts in src/: ${[...hosts.keys()].join(', ') || 'none'}`);

// ── 4. no ad or analytics SDK ────────────────────────────────────────────────
const BANNED = ['firebase', 'google-analytics', 'gtag', 'segment', 'mixpanel', 'amplitude',
  'appsflyer', 'adjust', 'facebook', 'admob', 'unity-ads', 'ironsource', 'applovin',
  'sentry', 'bugsnag', 'onesignal', 'branch-sdk', 'idfa', 'att'];
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const deps = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
for (const d of deps) {
  const hit = BANNED.find((b) => d.toLowerCase().includes(b));
  if (hit) fails.push(`dependency "${d}" looks like an ad/analytics/crash SDK ("${hit}") — Apple's Kids rule forbids sending device information to third parties`);
}

// ── 5. no persistent identifier ──────────────────────────────────────────────
const analytics = readFileSync('src/game/analytics.ts', 'utf8');
if (/user_id\s*:/.test(analytics)) fails.push('analytics payload carries a user_id');
if (!/removeItem\('vd_uid'\)/.test(analytics)) fails.push("the legacy vd_uid identifier is no longer deleted on load");
for (const f of walk('src')) {
  const txt = readFileSync(f, 'utf8');
  if (/crypto\.randomUUID|\bcrypto\.subtle\b/.test(txt))
    fails.push(`${f} mints a crypto identifier — a persistent id collected from a child is personal information under COPPA`);
}

// ── 6. off by default ────────────────────────────────────────────────────────
if (!/let enabled = lsGet\(OPT_KEY\) === '1'/.test(analytics))
  fails.push('analytics no longer defaults to off — collection must be opt-in on a children\'s title');
if (!/export function logEvent[\s\S]{0,120}if \(!enabled\) return;/.test(analytics))
  fails.push('logEvent no longer returns early when consent is off');

for (const n of notes) console.log(`   · ${n}`);
console.log('\n  ' + (fails.length ? 'FAIL — ' + fails.join('; ') : 'PASS — nothing identifying leaves the device, and the manifest says so') + '\n');
