// What a LOCKED world card actually shows. index.html:1248 puts
// `filter: saturate(0.28) brightness(0.62)` on .wArt for a locked world.
// CSS shorthand filter functions operate in sRGB (Filter Effects 1, §8).
import { PNG } from 'pngjs'; import { readFileSync, writeFileSync } from 'node:fs';
const S = 0.28, B = 0.62;
const files = {
 maple:'hf_20260801_130607_c92a52e5-8c1c-4a60-a566-ba19583fd532.png',
 pirate:'hf_20260801_130624_b1d4e117-1a45-4447-9bb8-e7f764565975.png',
 gameday:'hf_20260801_053403_0dc79112-b8fd-4304-9d15-8630620b2218.png',
 lantern:'hf_20260802_020636_0bc97a9d-a168-4667-bf5d-76ac9418bff1.png',
 powder:'hf_20260730_000329_762b5f44-3c3d-4030-8429-099f02691b5e.png'};
const sr = c => { c/=255; return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4); };
const L = (r,g,b)=>0.2126*sr(r)+0.7152*sr(g)+0.0722*sr(b);
const out = process.argv[2];
console.log('world    meanL(open) meanL(lock)  ratio   meanChroma(open) (lock)');
for (const [k,f] of Object.entries(files)) {
  const p = PNG.sync.read(readFileSync('public/assets/hf/'+f));
  const q = new PNG({width:p.width,height:p.height});
  let l0=0,l1=0,c0=0,c1=0,n=0;
  for (let i=0;i<p.data.length;i+=4){
    const r=p.data[i],g=p.data[i+1],b=p.data[i+2];
    const R=((0.213+0.787*S)*r+(0.715-0.715*S)*g+(0.072-0.072*S)*b)*B;
    const G=((0.213-0.213*S)*r+(0.715+0.285*S)*g+(0.072-0.072*S)*b)*B;
    const Bl=((0.213-0.213*S)*r+(0.715-0.715*S)*g+(0.072+0.928*S)*b)*B;
    const cl=v=>Math.max(0,Math.min(255,Math.round(v)));
    q.data[i]=cl(R); q.data[i+1]=cl(G); q.data[i+2]=cl(Bl); q.data[i+3]=255;
    l0+=L(r,g,b); l1+=L(cl(R),cl(G),cl(Bl));
    c0+=Math.max(r,g,b)-Math.min(r,g,b); c1+=Math.max(cl(R),cl(G),cl(Bl))-Math.min(cl(R),cl(G),cl(Bl));
    n++;
  }
  if (out) writeFileSync(`${out}/locked-${k}.png`, PNG.sync.write(q));
  console.log(k.padEnd(9), (l0/n).toFixed(4).padStart(9), (l1/n).toFixed(4).padStart(11),
    (l1/l0).toFixed(3).padStart(7), (c0/n).toFixed(1).padStart(13), (c1/n).toFixed(1).padStart(8));
}
