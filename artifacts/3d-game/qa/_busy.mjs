// WHERE IS EACH POSTER QUIET? Row-wise mean Sobel magnitude on luminance,
// normalised per poster. Then: the quietest contiguous band of a given height,
// and how busy the band the type currently occupies is.
import { PNG } from 'pngjs'; import { readFileSync } from 'node:fs';
const files={maple:'hf_20260801_130607_c92a52e5-8c1c-4a60-a566-ba19583fd532.png',
 pirate:'hf_20260801_130624_b1d4e117-1a45-4447-9bb8-e7f764565975.png',
 gameday:'hf_20260801_053403_0dc79112-b8fd-4304-9d15-8630620b2218.png',
 lantern:'hf_20260802_020636_0bc97a9d-a168-4667-bf5d-76ac9418bff1.png',
 powder:'hf_20260730_000329_762b5f44-3c3d-4030-8429-099f02691b5e.png'};
const lum=(d,i)=>0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2];
for (const [k,f] of Object.entries(files)) {
  const p=PNG.sync.read(readFileSync('public/assets/hf/'+f));
  const W=p.width,H=p.height;
  const prof=new Float64Array(H);
  for(let y=1;y<H-1;y++){let s=0;
    for(let x=1;x<W-1;x++){
      const i=(y*W+x)*4;
      const gx=lum(p.data,i+4)-lum(p.data,i-4);
      const gy=lum(p.data,((y+1)*W+x)*4)-lum(p.data,((y-1)*W+x)*4);
      s+=Math.hypot(gx,gy);}
    prof[y]=s/(W-2);}
  const total=prof.reduce((a,b)=>a+b,0)/H;
  const band=(a,b)=>{let s=0,n=0;for(let y=Math.round(a*H);y<Math.round(b*H);y++){s+=prof[y];n++;}return s/n/total;}
  const quietest=(h)=>{let best=1e9,bt=0;const hh=Math.round(h*H);
    for(let y=0;y<=H-hh;y++){let s=0;for(let j=0;j<hh;j++)s+=prof[y+j];s/=hh;
      if(s<best){best=s;bt=y/H;}}return [bt,best/total];}
  const [qt56,qv56]=quietest(0.559), [qt22,qv22]=quietest(0.222);
  console.log(k.padEnd(8),
    `| body NOW 44.1-100% busy=${band(0.441,1).toFixed(2)}`,
    `| title strip 47.3-55.5% busy=${band(0.473,0.555).toFixed(2)}`,
    `| quietest 56%-band at ${(qt56*100).toFixed(0)}% busy=${qv56.toFixed(2)}`,
    `| quietest 22%-band at ${(qt22*100).toFixed(0)}% busy=${qv22.toFixed(2)}`,
    `| bottom 22% busy=${band(0.78,1).toFixed(2)}`);
}
