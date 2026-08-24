import { PNG } from 'pngjs'; import { readFileSync } from 'node:fs';
const files={maple:'hf_20260801_130607_c92a52e5-8c1c-4a60-a566-ba19583fd532.png',
 pirate:'hf_20260801_130624_b1d4e117-1a45-4447-9bb8-e7f764565975.png',
 gameday:'hf_20260801_053403_0dc79112-b8fd-4304-9d15-8630620b2218.png',
 lantern:'hf_20260802_020636_0bc97a9d-a168-4667-bf5d-76ac9418bff1.png',
 powder:'hf_20260730_000329_762b5f44-3c3d-4030-8429-099f02691b5e.png'};
const ks=Object.keys(files);
const sr=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
function lab(r,g,b){const R=sr(r),G=sr(g),B=sr(b);
 let X=(0.4124*R+0.3576*G+0.1805*B)/0.9505,Y=0.2126*R+0.7152*G+0.0722*B,Z=(0.0193*R+0.1192*G+0.9505*B)/1.089;
 const f=t=>t>0.008856?Math.cbrt(t):7.787*t+16/116;
 return [116*f(Y)-16,500*(f(X)-f(Y)),200*(f(Y)-f(Z))];}
const NX=4,NY=5;
const raw={}; for(const [k,f] of Object.entries(files)) raw[k]=PNG.sync.read(readFileSync('public/assets/hf/'+f));
function mosaic(k,S,B){const p=raw[k];const m=[];
 const cl=v=>Math.max(0,Math.min(255,Math.round(v)));
 for(let cy=0;cy<NY;cy++)for(let cx=0;cx<NX;cx++){let r=0,g=0,b=0,n=0;
  for(let y=(cy*p.height/NY)|0;y<((cy+1)*p.height/NY)|0;y++)
   for(let x=(cx*p.width/NX)|0;x<((cx+1)*p.width/NX)|0;x++){const i=(y*p.width+x)*4;
    const R0=p.data[i],G0=p.data[i+1],B0=p.data[i+2];
    r+=cl(((0.213+0.787*S)*R0+(0.715-0.715*S)*G0+(0.072-0.072*S)*B0)*B);
    g+=cl(((0.213-0.213*S)*R0+(0.715+0.285*S)*G0+(0.072-0.072*S)*B0)*B);
    b+=cl(((0.213-0.213*S)*R0+(0.715-0.715*S)*G0+(0.072+0.928*S)*B0)*B);n++;}
  m.push(lab(r/n,g/n,b/n));}
 return m;}
for (const [S,B,tag] of [[1,1,'OPEN'],[0.28,0.62,'SHIPPED LOCK'],[0.45,0.72,'cand A'],[0.55,0.80,'cand B'],[0.62,0.85,'cand C']]) {
 const M=Object.fromEntries(ks.map(k=>[k,mosaic(k,S,B)]));
 let min=1e9,minp='';
 for(let i=0;i<5;i++)for(let j=i+1;j<5;j++){const a=M[ks[i]],b=M[ks[j]];let s=0;
  for(let c=0;c<NX*NY;c++)s+=Math.hypot(a[c][0]-b[c][0],a[c][1]-b[c][1],a[c][2]-b[c][2]);
  s/=NX*NY; if(s<min){min=s;minp=`${ks[i]}/${ks[j]}`;}}
 console.log(`${tag.padEnd(13)} sat=${S} bri=${B}  min pairwise squint deltaE = ${min.toFixed(1)}  (${minp})`);
}
