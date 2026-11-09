/* ---------- helpers ---------- */
function nmBetween(a,b){ const k=Math.cos(a[1]*rad); return Math.hypot((b[0]-a[0])*k*60,(b[1]-a[1])*60); }
function bearing(a,b){ const k=Math.cos(a[1]*rad); return (Math.atan2((b[0]-a[0])*k,(b[1]-a[1]))/rad+360)%360; }
function angDiff(a,b){ return ((a-b+540)%360)-180; }
function hash(s){ let h=0; for(const ch of String(s)) h=(h*31+ch.charCodeAt(0))|0; return Math.abs(h); }
function mix(c1,c2,t){ const a=d3.rgb(c1), b=d3.rgb(c2); return d3.rgb(a.r+(b.r-a.r)*t,a.g+(b.g-a.g)*t,a.b+(b.b-a.b)*t).toString(); }
function shipPos(sh, t){
  if(!sh.b || !sh.track) return { p:sh.a, hd: sh.hdg!=null ? sh.hdg : (sh.cog!=null? sh.cog : hash(sh.id)%360) };
  const tr=sh.track;
  if(!sh._segs){ let acc=0; sh._segs=tr.slice(1).map((q,i)=>{ const L=nmBetween(tr[i],q); const s={a:tr[i],b:q,L,start:acc}; acc+=L; return s; }).filter(s=>s.L>0); sh._len=acc||1e-6; }
  if(!sh._segs.length) return {p:sh.b, hd:sh.cog||0};
  // replay the last hour of real positions, 60x faster, holding at "now" for a beat
  const cyc=60, f=reduced?1:Math.min(1, ((t/1000)%cyc)/(cyc*.85));
  const d=f*sh._len, seg=sh._segs.find(s=>d<=s.start+s.L)||sh._segs[sh._segs.length-1], ff=seg.L?(d-seg.start)/seg.L:0;
  return { p:[seg.a[0]+(seg.b[0]-seg.a[0])*ff, seg.a[1]+(seg.b[1]-seg.a[1])*ff], hd:bearing(seg.a,seg.b) };
}
const tween = (from,to,ms,fn,done)=>{ if(reduced||ms<=0){ fn(to); done&&done(); return; } const t0=performance.now(); const step=n=>{ const f=Math.min(1,(n-t0)/ms), e=d3.easeCubicInOut(f); fn(from+(to-from)*e); if(f<1) requestAnimationFrame(step); else done&&done(); }; requestAnimationFrame(step); };
function turnTo(b,ms=650){ const d=angDiff(b,state.face); const f0=state.face; tween(0,d,ms,v=>{ state.face=(f0+v+360)%360; }); }

/* ---------- side silhouettes: stern at 0, bow at 1; heights in units of length ---------- */
function P(c,L,x,y){ c.lineTo(x*L,-y*L); }
function hullPath(c,L,dk,bow){ c.beginPath(); c.moveTo(.012*L,0); P(c,L,0,dk*.9); P(c,L,.02,dk); P(c,L,1-bow,dk); P(c,L,1,dk+.012); P(c,L,1-bow*.6,0); c.closePath(); }
function R(c,L,x,y,w,h){ c.fillRect(x*L,-(y+h)*L,w*L,h*L); }
const hs = L => Math.min(.12,(15+.03*L)/L); // house height above deck, units of length
function funnel(c,L,x,y,col){ c.fillStyle=col.hull; R(c,L,x,y,.022,.03); }
const SIDE = {
  container(c,L,col,m){ const dk=.045; c.fillStyle=col.hull; hullPath(c,L,dk,.05); c.fill();
    const big=m>=330, mid=m>=250&&!big, hx=big?.64:(mid?.25:.10), hw=big?.06:(mid?.07:.10), tier=Math.min(.07,24/m);
    const box=col.box; let i=0;
    for(let x=.06;x<.955;x+=.038,i++){ if(x+.034>hx-.005 && x<hx+hw+.005) continue; if(big && x>.16&&x<.22){ continue; }
      c.fillStyle=box[(i*7+3)%3]; R(c,L,x,dk,.034,tier*(.85+((i*5)%3)*.08)); }
    c.fillStyle=col.sup; R(c,L,hx,dk,hw,hs(m)+.03);
    if(big){ c.fillStyle=col.sup; R(c,L,.16,dk,.06,tier*.9); funnel(c,L,.18,dk+tier*.9,col); } else funnel(c,L,hx+hw*.2,dk+hs(m)+.03,col); },
  tanker(c,L,col,m){ const dk=.04; c.fillStyle=col.hull; hullPath(c,L,dk,.06); c.fill(); c.fillStyle=col.sup; R(c,L,.035,dk,.1,hs(m)); funnel(c,L,.045,dk+hs(m),col);
    c.strokeStyle=col.hull; c.lineWidth=Math.max(.6,L*.004); c.beginPath(); c.moveTo(.16*L,-(dk+.01)*L); c.lineTo(.93*L,-(dk+.01)*L); c.stroke(); c.fillStyle=col.hull; R(c,L,.5,dk,.02,.02); },
  bulk(c,L,col,m){ const dk=.045; c.fillStyle=col.hull; hullPath(c,L,dk,.05); c.fill();
    const n=m>=270?9:(m>=200?7:5), pitch=(.86-.17)/n; c.fillStyle=col.sup;
    for(let k=0;k<n;k++) R(c,L,.17+k*pitch,dk,pitch*.72,.014);
    if(m<225){ c.fillStyle=col.hull; c.strokeStyle=col.hull; c.lineWidth=Math.max(.6,L*.003); for(let k=1;k<n;k+=Math.ceil(n/4)){ const x=.17+k*pitch-.006; R(c,L,x,dk,.006,.075); c.beginPath(); c.moveTo(x*L,-(dk+.075)*L); c.lineTo((x+.07)*L,-(dk+.04)*L); c.stroke(); } }
    c.fillStyle=col.sup; R(c,L,.03,dk,.1,hs(m)); funnel(c,L,.04,dk+hs(m),col); },
  lng(c,L,col,m){ const dk=.055; c.fillStyle=col.hull; hullPath(c,L,dk,.05); c.fill();
    c.fillStyle=col.box[2]; c.beginPath(); c.moveTo(.17*L,-dk*L); P(c,L,.19,dk+.025); P(c,L,.86,dk+.025); P(c,L,.88,dk); c.closePath(); c.fill();
    c.fillStyle=col.sup; for(const x of [.3,.46,.62,.78]) R(c,L,x,dk+.025,.012,.01);
    R(c,L,.03,dk,.1,hs(m)); funnel(c,L,.04,dk+hs(m),col); },
  car(c,L,col,m){ c.beginPath(); c.moveTo(.015*L,0); P(c,L,0,.17); P(c,L,.9,.17); P(c,L,.99,.12); P(c,L,1,.04); P(c,L,.97,0); c.closePath(); c.fillStyle=col.hull; c.fill();
    c.fillStyle=col.sup; R(c,L,.86,.17,.08,.018); funnel(c,L,.12,.17,col); c.strokeStyle='rgba(255,255,255,.18)'; c.lineWidth=Math.max(.5,L*.003); for(let y=.05;y<.17;y+=.035){ c.beginPath(); c.moveTo(.04*L,-y*L); c.lineTo(.9*L,-y*L); c.stroke(); } },
  passenger(c,L,col,m){ c.fillStyle=col.sup; hullPath(c,L,.05,.07); c.fill(); c.fillStyle=col.hull; c.fillRect(0,-.012*L,.97*L,.012*L);
    c.fillStyle=col.sup; c.beginPath(); c.moveTo(.04*L,-.05*L); P(c,L,.04,.17); P(c,L,.2,.19); P(c,L,.84,.19); P(c,L,.9,.15); P(c,L,.9,.05); c.closePath(); c.fill();
    c.strokeStyle=col.hull; c.lineWidth=Math.max(.5,L*.0025); c.stroke(); R(c,L,.84,.17,.06,.012);
    c.fillStyle=col.hull; R(c,L,.22,.19,.08,.04); c.fillStyle='rgba(27,43,60,.35)'; for(let y=.07;y<.17;y+=.03) R(c,L,.06,y,.82,.008); },
  cargo(c,L,col,m){ SIDE.bulk(c,L,col,Math.min(m,180)); },
  other(c,L,col,m){ c.fillStyle=col.hull; hullPath(c,L,.07,.1); c.fill(); c.fillStyle=col.sup; R(c,L,.03,.07,.15,.1); funnel(c,L,.06,.17,col); }
};
function shipColors(fade, selected){
  const sky='#E6EEF6';
  if(selected) return {hull:ACC, sup:'#FFE3D6', box:['#F7A27E','#F48A5F','#FBC3AA']};
  return {hull:mix(HULL,sky,fade), sup:mix(SUP,sky,fade*.6), box:[mix('#5E7A96',sky,fade),mix('#7F97AE',sky,fade),mix('#A5B6C7',sky,fade)]};
}
function drawSide(c,type,x,y,L,dir,col,stripe,m){
  c.save(); c.translate(x,y); c.scale(dir,1); c.translate(-L/2,0); (SIDE[type]||SIDE.other)(c,L,col,m||200);
  if(stripe){ c.fillStyle=stripe; c.fillRect(.01*L,-Math.max(2,L*.012),.95*L,Math.max(2,L*.012)); }
  c.restore();
}

/* ---------- top-down shapes ---------- */
function drawTop(c,sh,q,hdDeg,scale,alpha,sel){
  const t=TYPES[sh.type], L=Math.max(8, (sh.len||60)*scale), B=Math.max(3.2, L*t.beam);
  c.save(); c.translate(q[0],q[1]); c.rotate((hdDeg-90)*rad); c.globalAlpha=alpha;
  c.beginPath(); c.moveTo(-L/2,-B/2); c.lineTo(L*.28,-B/2); c.quadraticCurveTo(L*.48,-B/3,L/2,0); c.quadraticCurveTo(L*.48,B/3,L*.28,B/2); c.lineTo(-L/2,B/2); c.closePath();
  c.fillStyle=sel?ACC:HULL; c.fill();
  c.fillStyle=t.c; c.fillRect(-L/2,-B/2,L*.8,Math.max(1.2,B*.2));
  c.restore();
}

