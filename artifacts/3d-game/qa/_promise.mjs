// DOES THE OPENING FRAME KEEP THE CARD'S PROMISE?
// Compares each world's POSTER (what the child was sold) with its OPENING
// FRAME (what they got) on the two things a six-year-old reads at a glance:
// how colourful it is, and which colours. HUD strips excluded.
import { PNG } from 'pngjs'; import { readFileSync } from 'node:fs';
const D='/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/';
const files={maple:'hf_20260801_130607_c92a52e5-8c1c-4a60-a566-ba19583fd532.png',
 pirate:'hf_20260801_130624_b1d4e117-1a45-4447-9bb8-e7f764565975.png',
 gameday:'hf_20260801_053403_0dc79112-b8fd-4304-9d15-8630620b2218.png',
 lantern:'hf_20260802_020636_0bc97a9d-a168-4667-bf5d-76ac9418bff1.png',
 powder:'hf_20260730_000329_762b5f44-3c3d-4030-8429-099f02691b5e.png'};
const sr=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
const L=(r,g,b)=>0.2126*sr(r)+0.7152*sr(g)+0.0722*sr(b);
function stats(path, y0, y1){
  const p=PNG.sync.read(readFileSync(path));
  const a=Math.round(p.height*y0), b2=Math.round(p.height*y1);
  let l=0,c=0,n=0; const hue=new Float64Array(12); let cw=0;
  for(let y=a;y<b2;y++)for(let x=0;x<p.width;x++){
    const i=(y*p.width+x)*4,r=p.data[i],g=p.data[i+1],bl=p.data[i+2];
    const mx=Math.max(r,g,bl),mn=Math.min(r,g,bl),ch=mx-mn;
    l+=L(r,g,bl); c+=ch; n++;
    if(ch>28){ let h;
      if(mx===r) h=((g-bl)/ch+6)%6; else if(mx===g) h=(bl-r)/ch+2; else h=(r-g)/ch+4;
      hue[Math.floor(h*2)%12]+=ch; cw+=ch; }
  }
  const top=[...hue].map((v,i)=>[v/cw,i*30]).sort((x,y2)=>y2[0]-x[0]).slice(0,3);
  return {L:l/n, C:c/n, hues: top.map(([w,h])=>`${h}deg ${(w*100).toFixed(0)}%`).join(', ')};
}
console.log('world     |  POSTER  L / chroma  | top hues            ||  OPENING FRAME  L / chroma | top hues');
for (const k of Object.keys(files)) {
  const a=stats('public/assets/hf/'+files[k], 0, 1);
  const b=stats(D+`spawn-${k}.png`, 0.11, 0.91);
  console.log(k.padEnd(9),'|', a.L.toFixed(3), '/', a.C.toFixed(1).padStart(5), '|', a.hues.padEnd(30),
    '||', b.L.toFixed(3), '/', b.C.toFixed(1).padStart(5), '|', b.hues);
}
