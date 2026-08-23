// THE NAME ON THE HOME SCREEN — does the iOS shell agree with the config?
//
// `capacitor.config.ts` carries `appName`, and every engineer assumes that is
// the home-screen label. It is not, after the first `cap add`. Capacitor writes
// CFBundleDisplayName into Info.plist ONCE, when the platform is added, and
// `cap sync` never touches it again — it copies web assets and updates plugins.
// So renaming the app in the config renames nothing on the device, silently,
// and the only place the mistake is visible is a phone's home screen.
//
// Which is exactly what happened here. The app was renamed on 2026-08-23:
// store listing "The Cute World Ender", home-screen label "World Ender". The
// config was updated. Info.plist still said VOIDLING — the ONE name the rename
// existed to get away from, because there is a live App Store game called
// Voidling and Apple app names are unique. It would have shipped to the
// owner's daughter's home screen under the old name with a green build behind
// it, because nothing in the repo compared the two files.
//
// This compares them. It is pure text: no browser, no build, milliseconds.
//
//   node qa/iosname.mjs
import { readFileSync } from 'node:fs';

const fails = [];
const cfg = readFileSync('capacitor.config.ts', 'utf8');
const plist = readFileSync('ios/App/App/Info.plist', 'utf8');

const appName = (cfg.match(/appName:\s*['"]([^'"]+)['"]/) || [])[1];
const appId = (cfg.match(/appId:\s*['"]([^'"]+)['"]/) || [])[1];
const display = (plist.match(/<key>CFBundleDisplayName<\/key>\s*<string>([^<]*)<\/string>/) || [])[1];

if (!appName) fails.push('capacitor.config.ts has no appName');
if (!display) fails.push('Info.plist has no CFBundleDisplayName');
if (appName && display && appName !== display)
  fails.push(`home-screen label disagrees: Info.plist "${display}" vs config appName "${appName}"`);

// The label has to FIT. iOS truncates a home-screen label at roughly 12
// characters before it starts eating the middle out with an ellipsis, which is
// why the rename picked an 11-character label over the 20-character store name.
if (display && display.length > 12)
  fails.push(`"${display}" is ${display.length} chars — iOS truncates a home-screen label past ~12`);

// And the one name this app must never carry again, anywhere a user can see.
// "voidling" is correct and required for the CREATURE, the species and the
// family lore; it is wrong as the APP. Only the user-visible app name is
// checked here — appId com.voidling.game is invisible and stays.
if (display && /voidling/i.test(display))
  fails.push(`CFBundleDisplayName is "${display}" — Voidling is a different, live App Store game`);

console.log(`\n  config appName          ${appName || '(missing)'}`);
console.log(`  Info.plist display name ${display || '(missing)'}`);
console.log(`  bundle id               ${appId || '(missing)'}   (invisible to users; stays)`);
console.log('\n  ' + (fails.length ? 'FAIL — ' + fails.join('; ') : 'PASS — the home screen shows the name the config says it shows') + '\n');
