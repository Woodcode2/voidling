import { PNG } from 'pngjs'; import { readFileSync } from 'node:fs';
const files = {
 maple:'hf_20260801_130607_c92a52e5-8c1c-4a60-a566-ba19583fd532.png',
 pirate:'hf_20260801_130624_b1d4e117-1a45-4447-9bb8-e7f764565975.png',
 gameday:'hf_20260801_053403_0dc79112-b8fd-4304-9d15-8630620b2218.png',
 lantern:'hf_20260802_020636_0bc97a9d-a168-4667-bf5d-76ac9418bff1.png',
 powder:'hf_20260730_000329_762b5f44-3c3d-4030-8429-099f02691b5e.png'};
for (const [k,f] of Object.entries(files)) {
  const p = PNG.sync.read(readFileSync('public/assets/hf/'+f));
  console.log(k, p.width+'x'+p.height, 'aspect', (p.width/p.height).toFixed(3));
}
