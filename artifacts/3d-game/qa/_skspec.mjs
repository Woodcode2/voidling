import { createServer } from 'vite';
const s = await createServer({ server:{middlewareMode:true}, appType:'custom', logLevel:'silent', optimizeDeps:{noDiscovery:true,include:[]} });
const SK = await s.ssrLoadModule('/src/proto3d/skylark.ts');
const T = SK.PERIMETER; const ok = (p) => SK.onSkylarkLand(p[0],p[1]) && SK.skPlaceable(p[0],p[1],58);
let hosts = 0; const detail = [];
for (let i=0;i<T.length-1;i++){ const [x1,y1]=T[i],[x2,y2]=T[i+1]; const nx=-(y2-y1), ny=(x2-x1), nl=Math.hypot(nx,ny)||1;
  const mx=(x1+x2)/2,my=(y1+y2)/2; const inward=((6000-mx)*nx+(6000-my)*ny)>0?1:-1;
  let found=null;
  for (const t of [0.5,0.35,0.65,0.2,0.8]) for (const [d,side] of [[260,-1],[230,-1],[300,-1],[260,1],[300,1],[340,1]]) {
    const bx=x1+(x2-x1)*t, by=y1+(y2-y1)*t; const p=[bx+(nx/nl)*d*inward*side, by+(ny/nl)*d*inward*side];
    if (ok(p)) { found={t,d,side}; break; } }
  if (found) hosts++; detail.push(found ? `${i}:${found.side<0?'out':'in'}${found.d}@${found.t}` : `${i}:none`); }
console.log(`${hosts}/${T.length-1} segments can host a car:`, detail.join(' '));
await s.close();
