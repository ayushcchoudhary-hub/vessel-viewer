/* ---------- globe ---------- */
const gl=document.getElementById('gl'); let GL;
const gproj=d3.geoOrthographic().clipAngle(90);
let JR=null, gmode='ship', ARCS=null, animating=false, BASE=null, baseKey='';
function glFit(){ GL=setupCanvas(gl); gproj.translate([GL.W/2,GL.H/2]); if(!gproj._s){ gproj.scale(Math.min(GL.W,GL.H)*.45); gproj._s=1; } baseKey=''; }
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function etaDays(s){ const m=String(s||'').match(/^(\d+)-(\d+)\s+(\d+):(\d+)/); if(!m) return null; let y=CAPTURED.getUTCFullYear(); let d=Date.UTC(y,+m[1]-1,+m[2],+m[3],+m[4]); if(d<CAPTURED-30*864e5) d=Date.UTC(y+1,+m[1]-1,+m[2],+m[3],+m[4]); return (d-CAPTURED)/864e5; }
function fmtDay(off){ const dt=new Date(CAPTURED.getTime()+off*864e5); return dt.getUTCDate()+' '+MONTHS[dt.getUTCMonth()]; }
function buildJourney(sh){
  const legs=sh.legs.map(l=>({kind:l.kind, coords:l.coords}));
  const tNow=0, times=sh.calls.map(c=>-c.ago);
  const nextNear = sh.next && nmBetween(sh.a,[sh.next.lon,sh.next.lat])<12;
  let tNext=null; if(sh.next && !nextNear){ const e=etaDays(sh.next.eta); const nm=d3.geoDistance(sh.a,[sh.next.lon,sh.next.lat])*3440; tNext = (e!=null && e>0.1 && e<60) ? e : Math.max(.5, nm/(Math.max(sh.kn,12)*24)); }
  const ends=[...times, tNow]; if(tNext!=null) ends.push(tNext);
  legs.forEach((l,i)=>{ l.t0=ends[i]??0; l.t1=ends[i+1]??l.t0;
    let acc=0; l.cum=[0]; for(let j=1;j<l.coords.length;j++){ acc+=d3.geoDistance(l.coords[j-1],l.coords[j]); l.cum.push(acc); } l.len=acc||1e-9; });
  const here=DATA.cities[state.city];
  const stops=[...sh.calls.map(c=>({name:c.port,lon:c.lon,lat:c.lat,t:-c.ago,k:'past'})),{name:'Off '+here.spot+' (you saw it here)',lon:(sh.b||sh.a)[0],lat:(sh.b||sh.a)[1],t:0,k:'now'}];
  if(tNext!=null) stops.push({name:sh.next.port,lon:sh.next.lon,lat:sh.next.lat,t:tNext,k:'next'});
  return {sh,legs,stops,tMin:Math.min(...ends,0),tMax:Math.max(...ends,0),t:0};
}
function posAt(J,t){
  for(const l of J.legs){ if(t>=l.t0 && t<=l.t1 && l.coords.length>1){ const f=(l.t1-l.t0)?(t-l.t0)/(l.t1-l.t0):1; const target=f*l.len; let j=1; while(j<l.cum.length-1 && l.cum[j]<target) j++; const a=l.coords[j-1], b=l.coords[j]||a, seg=(l.cum[j]-l.cum[j-1])||1e-9; return d3.geoInterpolate(a,b)(Math.max(0,Math.min(1,(target-l.cum[j-1])/seg))); } }
  const s=t<=J.tMin?J.stops[0]:J.stops[J.stops.length-1]; return [s.lon,s.lat];
}
const legStyle={past:{s:'#1B2B3C',w:2.4,d:[]}, live:{s:'#7C8C9C',w:2.2,d:[3,5]}, gap:{s:'#7C8C9C',w:2.2,d:[3,5]}, next:{s:ACC,w:2.4,d:[8,6]}};
function drawBase(){
  const key=gproj.rotate().map(v=>v.toFixed(2)).join()+gproj.scale().toFixed(1)+(animating?'a':'s');
  if(key===baseKey && BASE) return; baseKey=key;
  if(!BASE){ BASE=document.createElement('canvas'); }
  BASE.width=GL.W*GL.dpr; BASE.height=GL.H*GL.dpr; const x=BASE.getContext('2d'); x.setTransform(GL.dpr,0,0,GL.dpr,0,0);
  const W=GL.W,H=GL.H; gproj.precision(animating?1.2:.4);
  const path=d3.geoPath(gproj,x), center=gproj.invert([W/2,H/2]);
  x.beginPath(); path({type:'Sphere'}); x.fillStyle='#F2F6FA'; x.fill(); x.strokeStyle='#C9D4DF'; x.lineWidth=1; x.stroke();
  x.beginPath(); path(d3.geoGraticule10()); x.strokeStyle='#E3EAF1'; x.lineWidth=.6; x.stroke();
  const sc=gproj.scale(), z=sc/(W*.45);
  x.beginPath(); path(animating||z<2?LAND110:LAND); x.fillStyle='#D3DCE6'; x.fill();
  if(z>2){ x.strokeStyle='rgba(142,160,178,.55)'; x.lineWidth=.6; x.stroke(); }
  if(false){ const dr=0;
    for(const d of DATA.worldDots){ const ang=d3.geoDistance(d,center); if(ang>1.5) continue; const p=gproj(d); if(p[0]<-4||p[1]<-4||p[0]>W+4||p[1]>H+4) continue;
      x.globalAlpha=.2+.8*Math.max(0,Math.cos(ang)); x.fillStyle='#A9B8C7'; x.beginPath(); x.arc(p[0],p[1],dr,0,6.283); x.fill(); } x.globalAlpha=1; }
}
function partial(l,frac){ const target=frac*l.len; const pts=[l.coords[0]]; for(let j=1;j<l.coords.length;j++){ if(l.cum[j]<=target) pts.push(l.coords[j]); else { const a=l.coords[j-1],b=l.coords[j],ff=(target-l.cum[j-1])/((l.cum[j]-l.cum[j-1])||1e-9); pts.push(d3.geoInterpolate(a,b)(Math.max(0,ff))); break; } } return pts; }
function drawGlobe(){
  if(!GL) return; drawBase(); const {c:x,W,H}=GL;
  x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,gl.width,gl.height); x.drawImage(BASE,0,0); x.setTransform(GL.dpr,0,0,GL.dpr,0,0);
  const path=d3.geoPath(gproj,x), center=gproj.invert([W/2,H/2]);
  if(!JR) return;
  for(const l of JR.legs){ const st=legStyle[l.kind]||legStyle.past;
    x.setLineDash(st.d); x.globalAlpha=l.kind==='next'?.45:.16; x.beginPath(); path({type:'LineString',coordinates:l.coords}); x.strokeStyle=st.s; x.lineWidth=st.w; x.stroke();
    x.globalAlpha=1; if(JR.t<=l.t0) continue;
    const f=l.t1>l.t0?Math.min(1,(JR.t-l.t0)/(l.t1-l.t0)):1;
    x.setLineDash(st.d); x.beginPath(); path({type:'LineString',coordinates:partial(l,f)}); x.lineCap='round'; x.stroke(); x.setLineDash([]); }
  // stops: label start, now, end; others once passed; skip overlaps
  x.font='600 13px "IBM Plex Sans", sans-serif'; const boxes=[];
  const n=JR.stops.length;
  JR.stops.forEach((s,i)=>{
    if(d3.geoDistance([s.lon,s.lat],center)>1.5) return; const p=gproj([s.lon,s.lat]); const passed=JR.t>=s.t-.01;
    x.beginPath(); x.arc(p[0],p[1],s.k==='now'?6:4.5,0,6.283); x.fillStyle=s.k==='next'?'#fff':(s.k==='now'?ACC:(passed?HULL:'#B8C4D0')); x.fill(); x.strokeStyle=s.k==='next'?ACC:'#fff'; x.lineWidth=2; x.stroke();
    const key=i===0||s.k==='now'||i===n-1; if(!key && !passed) return;
    const label=s.k==='now'?'You saw it':(i===0?'From '+s.name:s.name), tw=x.measureText(label).width;
    const cand=[[p[0]+12,p[1]-12],[p[0]-tw-14,p[1]-12],[p[0]+12,p[1]+20],[p[0]-tw-14,p[1]+20]];
    const spot=cand.find(([lx,ly])=>lx>4&&lx+tw<W-4&&ly>16&&ly<H-4&&boxes.every(b=>lx+tw+6<b[0]||lx>b[0]+b[2]+6||ly<b[1]-18||ly-16>b[1]));
    if(!spot) return; boxes.push([spot[0],spot[1],tw]);
    x.fillStyle='rgba(255,255,255,.94)'; x.fillRect(spot[0]-4,spot[1]-15,tw+8,20); x.fillStyle=s.k==='now'?ACC:'#0D1B2A'; x.fillText(label,spot[0],spot[1]);
  });
  const m=posAt(JR,JR.t); if(m && d3.geoDistance(m,center)<1.5){ const p=gproj(m);
    const dt=.15, m2=posAt(JR,Math.min(JR.tMax,JR.t+dt)), m1=posAt(JR,Math.max(JR.tMin,JR.t-dt)), a=gproj(m1), b=gproj(m2);
    const hd = (Math.hypot(b[0]-a[0],b[1]-a[1])>.5) ? Math.atan2(b[0]-a[0],-(b[1]-a[1]))/rad : (JR.lastHd||90); JR.lastHd=hd;
    const g=x.createRadialGradient(p[0],p[1],0,p[0],p[1],26); g.addColorStop(0,'rgba(239,78,20,.35)'); g.addColorStop(1,'rgba(239,78,20,0)'); x.fillStyle=g; x.beginPath(); x.arc(p[0],p[1],26,0,6.283); x.fill();
    x.save(); x.shadowColor='rgba(13,27,42,.35)'; x.shadowBlur=4; drawTop(x,{type:JR.sh.type,len:300},p,hd,36/300,1,true); x.restore(); }
}

function fitScale(all){ const centroid=d3.geoCentroid({type:'MultiPoint',coordinates:all}); const maxAng=Math.max(.02,d3.max(all,p=>d3.geoDistance(p,centroid))); const base=Math.min(GL.W,GL.H)*.45; return {centroid, scale:Math.max(base*.95, Math.min(base*18, base*.8/Math.sin(Math.min(maxAng,1.4))))}; }
function journey(sh,animate){
  d3.select(gl).interrupt('globe'); cancelAnimationFrame(playing); playing=null; document.getElementById('play').textContent='▶'; animating=false; baseKey='';
  JR=buildJourney(sh); document.getElementById('jtitle').textContent=sh.name; 
  const all=sh.legs.flatMap(l=>l.coords); JR.fit=fitScale(all.length?all:[sh.a]);
  const {centroid,scale}=JR.fit;
  if(!animate||reduced){ gproj.rotate([-centroid[0],-centroid[1],0]).scale(scale); JR.t=reduced?JR.tMax:0; drawGlobe(); jUI(); return; }
  // fly to where it started, then ride along
  const s0=JR.stops[0]; JR.t=JR.tMin; jUI(); animating=true;
  const zFollow=Math.min(GL.W*.45*14, scale*2.2); JR.zFollow=zFollow;
  const iR=d3.interpolate(gproj.rotate(),[-s0.lon,-s0.lat,0]), iS=d3.interpolate(Math.log(gproj.scale()),Math.log(zFollow));
  d3.select(gl).transition('globe').duration(1700).ease(d3.easeCubicInOut).tween('z',()=>tt=>{ gproj.rotate(iR(tt)).scale(Math.exp(iS(tt))); drawGlobe(); })
    .on('end',()=>{ setTimeout(()=>playJourney(true,true),350); }).on('interrupt',()=>{ animating=false; baseKey=''; });
}
let playing=null;
function settle(){ if(!JR) return; let {centroid,scale}=JR.fit; animating=true; const now=JR.stops.find(s=>s.k==='now'); if(now && d3.geoDistance(centroid,[now.lon,now.lat])>1.2){ centroid=d3.geoInterpolate(centroid,[now.lon,now.lat])(.6); }
  const iR=d3.interpolate(gproj.rotate(),[-centroid[0],-centroid[1],0]), iS=d3.interpolate(Math.log(gproj.scale()),Math.log(scale));
  d3.select(gl).transition('globe').duration(reduced?0:1400).ease(d3.easeCubicInOut).tween('s',()=>tt=>{ gproj.rotate(iR(tt)).scale(Math.exp(iS(tt))); drawGlobe(); })
    .on('end',()=>{ animating=false; baseKey=''; drawGlobe(); }).on('interrupt',()=>{ animating=false; baseKey=''; }); }
function playJourney(fromStart, follow=true){
  if(!JR) return; d3.select(gl).interrupt('globe'); cancelAnimationFrame(playing); const from=(fromStart||JR.t>=JR.tMax-.01)?JR.tMin:JR.t, to=JR.tMax;
  if(reduced){ JR.t=to; drawGlobe(); jUI(); return; }
  const dur=Math.max(5000, Math.min(11000,(to-from)*200)), t0=performance.now(); animating=true;
  const zF=JR.zFollow||Math.min(GL.W*.45*14, JR.fit.scale*2.2);
  document.getElementById('play').textContent='❚❚';
  const step=now=>{ const f=Math.min(1,(now-t0)/dur); JR.t=from+(to-from)*d3.easeSinInOut(f);
    if(follow){ const m=posAt(JR,JR.t), r=gproj.rotate(); gproj.rotate([r[0]+angDiff(-m[0],r[0])*.09, r[1]+(-m[1]-r[1])*.09, 0]); gproj.scale(gproj.scale()+(zF-gproj.scale())*.05); }
    drawGlobe(); jUI();
    if(f<1) playing=requestAnimationFrame(step); else { document.getElementById('play').textContent='▶'; playing=null; animating=false; baseKey=''; setTimeout(settle,600); } };
  playing=requestAnimationFrame(step);
}
document.getElementById('play').addEventListener('click',()=>{ if(playing){ cancelAnimationFrame(playing); playing=null; animating=false; baseKey=''; drawGlobe(); document.getElementById('play').textContent='▶'; } else playJourney(false,true); });
document.getElementById('jt').addEventListener('input',e=>{ if(!JR) return; cancelAnimationFrame(playing); playing=null; document.getElementById('play').textContent='▶'; JR.t=JR.tMin+(+e.target.value/1000)*(JR.tMax-JR.tMin); drawGlobe(); jUI(); });
const narrow=()=>innerWidth<700;
d3.select('#globeWrap').call(d3.drag().filter(e=>!(String(e.type).startsWith('touch')&&narrow())&&!e.button)
  .on('start',()=>{ d3.select(gl).interrupt('globe'); if(playing){ cancelAnimationFrame(playing); playing=null; document.getElementById('play').textContent='▶'; } animating=true; })
  .on('drag',e=>{ const r=gproj.rotate(), k=.3*GL.W*.45/gproj.scale(); gproj.rotate([r[0]+e.dx*k, Math.max(-80,Math.min(80,r[1]-e.dy*k)),0]); drawGlobe(); })
  .on('end',()=>{ animating=false; baseKey=''; drawGlobe(); }));
document.getElementById('globeWrap').style.touchAction='pan-y';

