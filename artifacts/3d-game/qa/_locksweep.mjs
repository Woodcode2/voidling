import { PNG } from 'pngjs'; import { readFileSync } from 'node:fs';
const files={maple:'hf_20260801_130607_c92a52e5-8c1c-4a60-a566-ba19583fd532.png',
 pirate:'hf_20260801_130624_b1d4e117-1a45-4447-9bb8-e7f764565975.png',
 gameday:'hf_20260801_053403_0dc79112-b8fd-4304-9d15-8630620b2218.png',
 lantern:'hf_20260802_020636_0bc97a9d-a168-4667-bf5d-76ac9418bff1.png',
 powder:'hf_20260730_000329_762b5f44-3c3d-4030-8429-099f02691b5e.png'};
const sr=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
const L=(r,g,b)=>0.2126*sr(r)+0.7152*sr(g)+0.0722*sr(b);
const px={}; for(const [k,f] of Object.entries(files)){
  const p=PNG.sync.read(readFileSync('public/assets/hf/'+f));
  const H=Math.round(p.height*0.58); const a=[];
  for(let y=0;y<H;y++)for(let x=0;x<p.width;x++){const i=(y*p.width+x)*4;a.push(p.data[i],p.data[i+1],p.data[i+2]);}
  px[k]=a;
}
function stat(k,S,B){ const a=px[k]; let l=0,c=0,br=0,n=0;
  for(let i=0;i<a.length;i+=3){const r=a[i],g=a[i+1],b=a[i+2];
   const cl=v=>Math.max(0,Math.min(255,Math.round(v)));
   const R=cl(((0.213+0.787*S)*r+(0.715-0.715*S)*g+(0.072-0.072*S)*b)*B);
   const G=cl(((0.213-0.213*S)*r+(0.715+0.285*S)*g+(0.072-0.072*S)*b)*B);
   const Bl=cl(((0.213-0.213*S)*r+(0.715-0.715*S)*g+(0.072+0.928*S)*b)*B);
   const lv=L(R,G,Bl); l+=lv; c+=Math.max(R,G,Bl)-Math.min(R,G,Bl); if(lv>0.35)br++; n++;}
  return {L:l/n, C:c/n, BR:100*br/n}; }
const ks=Object.keys(files);
console.log('S     B     | '+ks.map(k=>k.slice(0,4).padStart(16)).join('')+'   (L / chroma / %bright)');
for (const [S,B] of [[1,1],[0.28,0.62],[0.45,0.72],[0.55,0.80],[0.62,0.85],[0.70,0.90]]) {
  const r=ks.map(k=>stat(k,S,B));
  console.log(`${S.toFixed(2)}  ${B.toFixed(2)}  | `+r.map(x=>`${x.L.toFixed(3)}/${x.C.toFixed(0)}/${x.BR.toFixed(0)}%`.padStart(16)).join(''));
}
