// SQUINT DISTINCTNESS. Downsample each poster to a 4x5 mosaic of mean colours,
// convert to CIELAB, and take the mean per-cell deltaE between every pair.
// This is "at thumbnail size, do these two cards look like different places?"
import { PNG } from 'pngjs'; import { readFileSync } from 'node:fs';
const D='/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/';
const ks=['maple','pirate','gameday','lantern','powder'];
const files={maple:'hf_20260801_130607_c92a52e5-8c1c-4a60-a566-ba19583fd532.png',
 pirate:'hf_20260801_130624_b1d4e117-1a45-4447-9bb8-e7f764565975.png',
 gameday:'hf_20260801_053403_0dc79112-b8fd-4304-9d15-8630620b2218.png',
 lantern:'hf_20260802_020636_0bc97a9d-a168-4667-bf5d-76ac9418bff1.png',
 powder:'hf_20260730_000329_762b5f44-3c3d-4030-8429-099f02691b5e.png'};
const sr=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
function lab(r,g,b){const R=sr(r),G=sr(g),B=sr(b);
 let X=(0.4124*R+0.3576*G+0.1805*B)/0.9505,Y=0.2126*R+0.7152*G+0.0722*B,Z=(0.0193*R+0.1192*G+0.9505*B)/1.089;
 const f=t=>t>0.008856?Math.cbrt(t):7.787*t+16/116;
 return [116*f(Y)-16,500*(f(X)-f(Y)),200*(f(Y)-f(Z))];}
const NX=4,NY=5;
function mosaic(path){const p=PNG.sync.read(readFileSync(path));const m=[];
 for(let cy=0;cy<NY;cy++)for(let cx=0;cx<NX;cx++){
  let r=0,g=0,b=0,n=0;
  for(let y=(cy*p.height/NY)|0;y<((cy+1)*p.height/NY)|0;y++)
   for(let x=(cx*p.width/NX)|0;x<((cx+1)*p.width/NX)|0;x++){
    const i=(y*p.width+x)*4;r+=p.data[i];g+=p.data[i+1];b+=p.data[i+2];n++;}
  m.push(lab(r/n,g/n,b/n));}
 return m;}
for (const [tag,mk] of [['OPEN',k=>'public/assets/hf/'+files[k]],['LOCKED',k=>D+'locked-'+k+'.png']]){
 const M=Object.fromEntries(ks.map(k=>[k,mosaic(mk(k))]));
 let min=1e9,minp='';const rows=[];
 for(let i=0;i<5;i++)for(let j=i+1;j<5;j++){
  const a=M[ks[i]],b=M[ks[j]];let s=0;
  for(let c=0;c<NX*NY;c++)s+=Math.hypot(a[c][0]-b[c][0],a[c][1]-b[c][1],a[c][2]-b[c][2]);
  s/=NX*NY; rows.push(`${ks[i]}/${ks[j]} ${s.toFixed(1)}`);
  if(s<min){min=s;minp=`${ks[i]}/${ks[j]}`;}}
 console.log(tag.padEnd(7),'min pair', minp, min.toFixed(1), ' | all:', rows.join('  '));
}
