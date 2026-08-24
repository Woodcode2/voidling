import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
// usage: node stat.mjs src x y w h
const [src, sx, sy, sw, sh] = process.argv.slice(2);
const p = PNG.sync.read(readFileSync(src));
const X=+sx,Y=+sy,W=+sw,H=+sh;
const R=[],G=[],B=[],L=[];
const seen=new Map();
for(let y=Y;y<Y+H;y++)for(let x=X;x<X+W;x++){
  const i=(y*p.width+x)*4;
  const r=p.data[i],g=p.data[i+1],b=p.data[i+2];
  R.push(r);G.push(g);B.push(b);
  const l=0.2126*r+0.7152*g+0.0722*b; L.push(l);
  const k=`${r},${g},${b}`; seen.set(k,(seen.get(k)||0)+1);
}
const m=a=>a.reduce((s,v)=>s+v,0)/a.length;
const sd=a=>{const u=m(a);return Math.sqrt(a.reduce((s,v)=>s+(v-u)*(v-u),0)/a.length);};
const pct=(a,q)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(q*(s.length-1))];};
const uniqL=new Set(L.map(v=>Math.round(v))).size;
const top=[...seen.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3);
const mx=Math.max(m(R),m(G),m(B)), mn=Math.min(m(R),m(G),m(B));
console.log(`${src} @${X},${Y} ${W}x${H}`);
console.log(`  mean rgb  ${m(R).toFixed(1)},${m(G).toFixed(1)},${m(B).toFixed(1)}   sat(mean) ${((mx-mn)/(mx||1)).toFixed(3)}`);
console.log(`  lum mean ${m(L).toFixed(2)}  sd ${sd(L).toFixed(2)}  p05 ${pct(L,0.05).toFixed(1)} p50 ${pct(L,0.5).toFixed(1)} p95 ${pct(L,0.95).toFixed(1)}`);
console.log(`  channel sd  R ${sd(R).toFixed(2)}  G ${sd(G).toFixed(2)}  B ${sd(B).toFixed(2)}`);
console.log(`  unique lum levels ${uniqL}   unique colours ${seen.size}/${W*H}`);
console.log(`  top colours ${top.map(([k,v])=>`${k} (${(100*v/(W*H)).toFixed(1)}%)`).join('  ')}`);
