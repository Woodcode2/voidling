// THE SUBMISSION DOC AND THE CLIENT MUST AGREE ON WHAT IS FOR SALE.
//
// APPSTORE.md is the checklist a human follows in App Store Connect, and it is
// the one artefact here that no probe could ever fail on — so it drifted. It
// said "FIVE products, not seven" and listed only the five com.voidling.skin.*
// ids. The client registers SEVENTEEN: `initIAP()` passes
// Object.values(IAP_PRODUCTS), which is five voids plus twelve paid hats. The
// word "hat" did not appear anywhere in the file.
//
// Following it would have produced a shop with twelve priced cards that cannot
// be bought — store.get(pid) returns undefined for a product that does not
// exist in App Store Connect, purchase() returns 'failed', and the card paints
// COULD NOT BUY for ever — with no error anywhere to explain why.
//
// This reads both files and fails if they disagree in either direction. No
// browser, no server: pure text, so it can run anywhere and costs nothing.
//
//   node qa/iapdoc.mjs
import fs from 'node:fs';

const doc = fs.readFileSync('APPSTORE.md', 'utf8');
const store = fs.readFileSync('src/proto3d/store3d.ts', 'utf8');
const hats = fs.readFileSync('src/proto3d/hats.ts', 'utf8');

// ── what the client actually registers ─────────────────────────────────────
const block = store.slice(store.indexOf('IAP_PRODUCTS'), store.indexOf('};', store.indexOf('IAP_PRODUCTS')));
const code = [...block.matchAll(/(\w+):\s*'(com\.voidling\.[a-z]+\.[a-z]+)'/g)]
  .map((m) => ({ key: m[1], id: m[2] }));

// ── what the doc tells a human to create ───────────────────────────────────
const documented = new Set([...doc.matchAll(/com\.voidling\.[a-z]+\.[a-z]+/g)].map((m) => m[0]));

const fail = [];
const missing = code.filter((c) => !documented.has(c.id));
const extra = [...documented].filter((d) => !code.some((c) => c.id === d));

console.log(`client registers ${code.length} products; APPSTORE.md names ${documented.size}`);
if (missing.length) {
  fail.push(`${missing.length} registered but undocumented`);
  console.log('\nREGISTERED BUT NOT IN THE DOC — a human would never create these,');
  console.log('and every one is a priced card in the shop that can never be bought:');
  for (const m of missing) console.log(`  ${m.id}`);
}
if (extra.length) {
  fail.push(`${extra.length} documented but not registered`);
  console.log('\nIN THE DOC BUT NOT REGISTERED — a product nobody can ever buy:');
  for (const e of extra) console.log(`  ${e}`);
}

// ── and the prices, which are the other half of the instruction ────────────
// A doc that lists the right id at the wrong price sends someone to create a
// product at a tier the shop will then contradict on screen.
// Split on record boundaries and read each one whole, rather than sliding a
// windowed regex over the file. The windowed version silently matched only 11
// of the 12 hats — and a pattern that can drop a record can just as easily pair
// an id with the NEXT record's price, which is a check that reports agreement
// while being wrong. Boundaries are exact; a miscount is now loud.
const hatPrice = new Map();
const recs = hats.split(/\n {2}\{ id: '/).slice(1);
for (const r of recs) {
  const id = r.slice(0, r.indexOf("'"));
  const body = r.split('\n  { id:')[0];
  const usd = body.match(/usd:\s*([0-9.]+)/);
  if (usd) hatPrice.set(id, Number(usd[1]));
}
let checked = 0;
for (const { key, id } of code) {
  if (!id.includes('.hat.')) continue;
  const usd = hatPrice.get(key);
  if (usd === undefined) continue;
  checked++;
  // find the doc's table row for this id and read the dollar figure off it
  const row = doc.split('\n').find((l) => l.includes(id));
  if (!row) continue;
  const shown = row.match(/\$([0-9.]+)/);
  if (!shown) { fail.push(`${id} has no price in the doc`); console.log(`  ${id}: no price in doc`); continue; }
  if (Number(shown[1]) !== usd) {
    fail.push(`${id} priced $${shown[1]} in the doc, $${usd} in the code`);
    console.log(`  ${id}: doc says $${shown[1]}, hats.ts says $${usd}`);
  }
}
// every registered hat must have been price-checked; a silent shortfall is how
// the windowed regex hid a missing record
const paidHats = code.filter((c) => c.id.includes('.hat.')).length;
if (checked !== paidHats) {
  fail.push(`only ${checked} of ${paidHats} hat prices could be checked`);
}
console.log(`checked ${checked} of ${paidHats} hat prices against src/proto3d/hats.ts`);

// the free one must NOT be sold
if (documented.has('com.voidling.hat.party') || code.some((c) => c.id.endsWith('.hat.party'))) {
  fail.push('the free Party Hat is listed as a purchasable product');
}

console.log(fail.length
  ? `\nFAIL (${fail.length}): ${fail.join(' | ')}`
  : '\nAPPSTORE.md and the client agree on every product id and price');
process.exit(fail.length ? 1 : 0);
