import { grade } from './_zgrade.mjs';
const NM={VERM:0xc1382e,VERM_D:0x8e2620,TIMBER:0x6b4a33,TIMBER_D:0x4a3324,CEDAR:0x7d5a3e,CEDAR_D:0x55402d,
 TILE:0x2e3440,TILE_D:0x222834,STONE:0x6a6a76,STONE_D:0x4c4c58,ROPE:0xb8a074,PAPER:0xd8cdb6,CHAR:0x1e1e26,
 GREEN:0x2f5a3a,GREEN_L:0x467a4c,WATER:0x1a3a52,'BATH ROOF':0x4a5468};
const L=c=>0.2126*c[0]+0.7152*c[1]+0.0722*c[2];
const ks=[0.35,0.45,0.59,0.8];
console.log('LANTERN NIGHT solid palette through the shipped grade');
console.log('name        '+ks.map(k=>`k=${k}`.padEnd(20)).join(''));
let dead=0;
for(const [n,h] of Object.entries(NM)){
  const row=ks.map(k=>{const c=grade(h,k);return `(${c.join(',')}) L${L(c).toFixed(0)}`.padEnd(20);});
  const c=grade(h,0.59); if(L(c)<3) dead++;
  console.log(n.padEnd(12)+row.join(''));
}
console.log(`\n${dead} of ${Object.keys(NM).length} solid colours render at displayed luminance < 3/255 (i.e. black) at k=0.59`);
