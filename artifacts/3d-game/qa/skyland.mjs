// SKYLAND — the ground a world can actually stand on, and where the child stands.
//
// The round-6 land survey found SKYLARK FIELD 59.0% unplaceable — 3.7x the
// next-worst world, usable ground half of Lantern's, in seventeen pieces — with
// the spawn resolving to THE ROUGH and the whale 66.6 degrees off the fixed
// camera's centreline the instant controls go live. Every one of those had been
// predicted in the design doc and none was measured by any probe; qa/airfield.mjs
// checked the spawn was ON the island and never asked WHICH DISTRICT.
//
// This measures those four things with the world's own functions — loaded
// through vite's SSR transform, as qa/kitfit.mjs does — rather than a regex
// re-reading of the constants, so it cannot drift from what the game computes.
//
//   node qa/skyland.mjs
//
// BARS (brief §3A, §5.5-5.7):
//   placeable ground      >= 56% of the island       (was 41.0%; measured 61.5% at the rebuild's widths)
//   largest connected      >= 50% of placeable       (was 35.6%; the live runway still halves the island, by design)
//   spawn district         === 'arrivals'            (was 'meadow')
//   whale off-axis         <= 20 degrees             (was 66.6)
import { createServer } from 'vite';

const s = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent', optimizeDeps: { noDiscovery: true, include: [] } });
const SK = await s.ssrLoadModule('/src/proto3d/skylark.ts');
await s.close();

const [minX, maxX, minY, maxY] = [1500, 10500, 1000, 10500];
const CELL = 20;
const W = Math.ceil((maxX - minX) / CELL), H = Math.ceil((maxY - minY) / CELL);
let land = 0, place = 0;
const grid = [];
for (let j = 0; j < H; j++) {
  const row = [];
  for (let i = 0; i < W; i++) {
    const x = minX + i * CELL + CELL / 2, y = minY + j * CELL + CELL / 2;
    const on = SK.onSkylarkLand(x, y);
    if (on) land++;
    const ok = on && SK.skPlaceable(x, y, 40);
    if (ok) place++;
    row.push(ok ? 1 : 0);
  }
  grid.push(row);
}
// largest 4-connected piece
const seen = grid.map((r) => r.map(() => false));
let best = 0, pieces = 0;
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  if (!grid[j][i] || seen[j][i]) continue;
  pieces++; let n = 0; const st = [[i, j]]; seen[j][i] = true;
  while (st.length) {
    const [a, b] = st.pop(); n++;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = a + dx, d = b + dy;
      if (c < 0 || d < 0 || c >= W || d >= H || !grid[d][c] || seen[d][c]) continue;
      seen[d][c] = true; st.push([c, d]);
    }
  }
  best = Math.max(best, n);
}
const pct = 100 * place / land, big = 100 * best / place;

// THE CAMERA NEVER TURNS. camOffset (0.62, 0.92, 0.62) sits the camera at +x,+z
// of the child, so the ground view direction is (-1, -1) in world x,y. The
// whale is in frame when the vector from the spawn to the launch circle lies
// within the half-FOV (29.8 degrees at aspect 2.0) of that direction.
const [sx, sy] = SK.SK_SPAWN;
const dx = SK.LAUNCH.cx - sx, dy = SK.LAUNCH.cy - sy;
const L = Math.hypot(dx, dy);
const off = Math.acos(Math.max(-1, Math.min(1, (-dx - dy) / (L * Math.SQRT2)))) * 180 / Math.PI;
const district = SK.skRegionAt(sx, sy);

let bad = 0;
const bar = (okv, line) => { console.log(`  ${okv ? 'ok  ' : 'FAIL'} ${line}`); if (!okv) bad++; };
console.log(`  island ${land} cells at ${CELL}u; placeable ${place} in ${pieces} piece(s)`);
bar(pct >= 56, `placeable ground ${pct.toFixed(1)}% of the island (bar 56%; shipped 41.0%)`);
bar(big >= 50, `largest connected piece ${big.toFixed(1)}% of placeable (bar 50%; shipped 35.6%)`);
bar(district === 'arrivals', `spawn (${sx},${sy}) resolves to '${district}' (must be 'arrivals'; shipped 'meadow')`);
bar(off <= 20, `the whale is ${off.toFixed(1)} degrees off the camera centreline at ${(L / 20).toFixed(0)} units (bar 20; shipped 66.6)`);
console.log('');
console.log(bad ? `FAIL — skyland: ${bad} of 4 land bars short` : 'PASS — skyland: the field has ground to stand on, the child stands in arrivals, and the whale is in frame');
process.exit(bad ? 1 : 0);
