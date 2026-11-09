
/* ---------- journey UI (stops strip) ---------- */
function jUI(){
  if(!JR) return; const span=JR.tMax-JR.tMin||1;
  document.getElementById('jt').value=Math.round((JR.t-JR.tMin)/span*1000);
  document.getElementById('jdate').textContent=Math.abs(JR.t)<.05?'today':fmtDay(JR.t);
  let at=''; for(const s of JR.stops){ if(Math.abs(JR.t-s.t)<.3) at = s.k==='now' ? 'off '+DATA.cities[state.city].spot : 'at '+s.name; }
  if(!at){ const prev=[...JR.stops].reverse().find(s=>s.t<=JR.t), nxt=JR.stops.find(s=>s.t>JR.t); at = ''; }
  document.getElementById('jwhere').textContent=at;
  document.getElementById('steps').innerHTML=JR.stops.map((s,i)=>`<li class="${JR.t>=s.t-.01?'on':''} ${s.k==='now'?'now':''}"><b>${s.k==='now'?'You saw it':(s.k==='next'?'→ '+s.name:s.name)}</b><span>${s.k==='now'?'today':(s.t<0?fmtDay(s.t):'ETA '+fmtDay(s.t))}</span></li>`).join('');
}
function showJourney(sh){ document.getElementById('pick').scrollIntoView({behavior:reduced?'auto':'smooth'}); setTimeout(()=>journey(sh,true), reduced?0:700); }
let pickSeen=false;
new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting) && !pickSeen && state.sel){ pickSeen=true; const sh=DATA.cities[state.city].ships.find(s=>s.id===state.sel); if(sh) journey(sh,true); } },{threshold:.45}).observe(document.getElementById('globeWrap'));
document.getElementById('toPick').addEventListener('click',e=>{ e.preventDefault(); const sh=DATA.cities[state.city].ships.find(s=>s.id===state.sel); if(sh){ pickSeen=true; showJourney(sh); } });

/* ---------- 03 time-lapse ---------- */
const tlc=document.getElementById('tl'); let TLC=null, TLB=null;
const TLS={t:0,playing:!reduced,last:0,transform:d3.zoomIdentity,seen:false,hold:0};
const TLN=TLDATA.meta.n, TLSTART=new Date(TLDATA.meta.start).getTime();
const TLCOL=['#7C8C9C','#B4233F','#2F6FDB','#2F6FDB','#0E8A8A','#C2357F'];
const TLP={};
function prepTL(cid){ if(TLP[cid]) return TLP[cid];
  const ships=(TLDATA.areas[cid]||[]).map(([m,t,L,name,seq])=>{ const n=seq.length/3, k=new Float32Array(n), x=new Float32Array(n), y=new Float32Array(n); for(let i=0;i<n;i++){ k[i]=seq[3*i]; x[i]=seq[3*i+1]/1000; y[i]=seq[3*i+2]/1000; } return {m,t,L,name,k,x,y}; });
  let k0=TLN,k1=0; for(const z of ships){ k0=Math.min(k0,z.k[0]); k1=Math.max(k1,z.k[z.k.length-1]); } if(k1<=k0){ k0=0; k1=TLN; }
  return TLP[cid]={ships,k0,k1}; }
const tlR=()=>prepTL(state.city);
function tlPos(s,T){ const k=s.k, n=k.length; if(T<k[0]-.4||T>k[n-1]+.4) return null; if(T<=k[0]) return [s.x[0],s.y[0]]; if(T>=k[n-1]) return [s.x[n-1],s.y[n-1]];
  let lo=0,hi=n-1; while(hi-lo>1){ const mid=(lo+hi)>>1; if(k[mid]<=T) lo=mid; else hi=mid; }
  if(k[hi]-k[lo]>4){ if(Math.abs(s.x[hi]-s.x[lo])*60*Math.cos(s.y[lo]*rad)+Math.abs(s.y[hi]-s.y[lo])*60<.3) return [s.x[lo],s.y[lo]]; return T-k[lo]<.6?[s.x[lo],s.y[lo]]:(k[hi]-T<.6?[s.x[hi],s.y[hi]]:null); }
  const f=(T-k[lo])/(k[hi]-k[lo]); return [s.x[lo]+(s.x[hi]-s.x[lo])*f, s.y[lo]+(s.y[hi]-s.y[lo])*f]; }
let tlBase=null;
function tlFit(){ TLC=setupCanvas(tlc); tlZoom.translateExtent([[0,0],[TLC.W,TLC.H]]).extent([[0,0],[TLC.W,TLC.H]]); const c=DATA.cities[state.city], [x0,y0,x1,y1]=c.bboxWide, k=Math.cos(((y0+y1)/2)*rad);
  const s=Math.max(TLC.W/((x1-x0)*k), TLC.H/(y1-y0)), cx=(x0+x1)/2, cy=(y0+y1)/2;
  tlBase={s,k,f:(lon,lat)=>[TLC.W/2+(lon-cx)*k*s, TLC.H/2-(lat-cy)*s]}; TLB=null; }
function tlProj(lon,lat){ const p=tlBase.f(lon,lat), t=TLS.transform; return [p[0]*t.k+t.x, p[1]*t.k+t.y]; }
function tlDrawBase(){
  const key=TLS.transform.toString()+state.city+TLC.W; if(TLB && TLB.key===key) return; const c=DATA.cities[state.city];
  const cv=TLB?.cv||document.createElement('canvas'); cv.width=TLC.W*TLC.dpr; cv.height=TLC.H*TLC.dpr; const x=cv.getContext('2d'); x.setTransform(TLC.dpr,0,0,TLC.dpr,0,0);
  x.fillStyle='#E9F0F6'; x.fillRect(0,0,TLC.W,TLC.H);
  x.fillStyle='#C3CDD8'; const dr=Math.max(.8, c.step*tlBase.s*TLS.transform.k*.2);
  for(const d of c.dots){ const p=tlProj(d[0],d[1]); if(p[0]<-3||p[1]<-3||p[0]>TLC.W+3||p[1]>TLC.H+3) continue; x.beginPath(); x.arc(p[0],p[1],dr,0,6.283); x.fill(); }
  x.strokeStyle='rgba(91,102,114,.45)'; x.lineWidth=.8;
  for(const poly of c.polys){ x.beginPath(); poly.forEach((q,i)=>{ const p=tlProj(q[0],q[1]); i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]); }); x.stroke(); }
  const P=prepTL(state.city); x.strokeStyle='rgba(27,43,60,.07)'; x.lineWidth=1; x.lineJoin='round';
  for(const sh of P.ships){ x.beginPath(); let prevK=-9; for(let i=0;i<sh.k.length;i++){ const q=tlProj(sh.x[i],sh.y[i]); if(sh.k[i]-prevK>4) x.moveTo(q[0],q[1]); else x.lineTo(q[0],q[1]); prevK=sh.k[i]; } x.stroke(); }
  TLB={cv,key}; }
function tlDraw(){
  if(!TLC||!tlBase) return; tlDrawBase(); const {c:x,W,H}=TLC, T=TLS.t, P=prepTL(state.city), cy=DATA.cities[state.city];
  x.setTransform(1,0,0,1,0,0); x.drawImage(TLB.cv,0,0); x.setTransform(TLC.dpr,0,0,TLC.dpr,0,0);
  const selM=(DATA.cities[state.city].ships.find(s=>s.id===state.sel)||{}).mmsi;
  let n=0, sel=null; const zk=Math.sqrt(TLS.transform.k);
  x.lineCap='round';
  for(const s of P.ships){ const p=tlPos(s,T); if(!p) continue; n++; const q=tlProj(p[0],p[1]); if(q[0]<-20||q[1]<-20||q[0]>W+20||q[1]>H+20) continue;
    const isSel=s.m===selM; if(isSel){ sel=[q,s]; continue; }
    const p0=tlPos(s,T-3); const moving=p0 && (Math.abs(p0[0]-p[0])*Math.cos(p[1]*rad)+Math.abs(p0[1]-p[1]))*60>.4;
    const r=(1.1+Math.min(2.6,(s.L||40)/130))*zk;
    if(moving){ x.strokeStyle='rgba(27,43,60,.5)'; x.beginPath(); let started=false;
      for(let tt=Math.max(0,T-6); tt<=T; tt+=.5){ const pp=tlPos(s,tt); if(!pp){ started=false; continue; } const qq=tlProj(pp[0],pp[1]); if(!started){ x.moveTo(qq[0],qq[1]); started=true; } else x.lineTo(qq[0],qq[1]); }
      x.globalAlpha=.5; x.lineWidth=1.1*zk; x.stroke(); x.globalAlpha=1;
      x.fillStyle='rgba(27,43,60,.85)'; x.beginPath(); x.arc(q[0],q[1],r,0,6.283); x.fill(); }
    else { x.strokeStyle='rgba(91,102,114,.7)'; x.lineWidth=1.1; x.beginPath(); x.arc(q[0],q[1],Math.max(1.6,r),0,6.283); x.stroke(); }
  }
  if(sel){ const [q,s]=sel; x.strokeStyle=ACC; x.lineWidth=2.2*zk; x.beginPath(); let st=false;
    for(let tt=0; tt<=T; tt+=.5){ const pp=tlPos(s,tt); if(!pp){ st=false; continue; } const qq=tlProj(pp[0],pp[1]); if(!st){ x.moveTo(qq[0],qq[1]); st=true; } else x.lineTo(qq[0],qq[1]); } x.globalAlpha=.55; x.stroke(); x.globalAlpha=1;
    x.fillStyle=ACC; x.beginPath(); x.arc(q[0],q[1],4.5,0,6.283); x.fill(); x.strokeStyle='#fff'; x.lineWidth=2; x.stroke(); x.strokeStyle=ACC; x.lineWidth=1.6; x.beginPath(); x.arc(q[0],q[1],9,0,6.283); x.stroke();
    x.font='600 12px "IBM Plex Mono", monospace'; const w=x.measureText(s.name).width; const lx=Math.min(q[0]+13,W-w-14); x.fillStyle='rgba(255,255,255,.95)'; x.fillRect(lx-5,q[1]-24,w+10,19); x.fillStyle='#141414'; x.fillText(s.name,lx,q[1]-10); }
  const y=tlProj(cy.you[0],cy.you[1]); x.fillStyle='#141414'; x.strokeStyle='#fff'; x.lineWidth=2.5; x.beginPath(); x.arc(y[0],y[1],5.5,0,6.283); x.fill(); x.stroke();
  x.font='600 12px "IBM Plex Sans", sans-serif'; x.fillStyle='#141414'; x.fillText('You',y[0]+9,y[1]+4);
  const at=new Date(TLSTART+T*TLDATA.meta.bucket*1000);
  document.getElementById('tlTime').textContent=at.toLocaleTimeString('en-GB',{timeZone:TZ[state.city],hour:'2-digit',minute:'2-digit'});
  document.getElementById('tlDay').textContent=at.toLocaleDateString('en-GB',{timeZone:TZ[state.city],weekday:'short',day:'numeric',month:'short'})+' · local time';
  document.getElementById('tlCount').textContent=`${n} ships`; const sb=document.getElementById('tlSelName'); const sn=selM&&P.ships.find(z=>z.m===selM); sb.textContent=sn?sn.name:'Your ship'; sb.parentNode.style.display=sel?'':'none';
  document.getElementById('tlT').value=Math.round((T-P.k0)/(P.k1-P.k0)*1000); tlBarsPlayed(T-P.k0);
}
function tlBars(){ const P=prepTL(state.city), cnt=new Array(TLN+1).fill(0);
  const cnt2=new Array(P.k1-P.k0+1).fill(0); for(const z of P.ships) for(let b=P.k0;b<=P.k1;b++) if(tlPos(z,b)) cnt2[b-P.k0]++; cnt.length=0; cnt.push(...cnt2);
  const mx=Math.max(1,...cnt), w=1000/cnt.length;
  document.getElementById('tlBars').setAttribute('viewBox','0 0 1000 36');
  document.getElementById('tlBars').innerHTML=cnt.map((v,i)=>`<rect x="${(i*w).toFixed(1)}" y="${(36-v/mx*32).toFixed(1)}" width="${Math.max(1,w-1.2).toFixed(1)}" height="${(v/mx*32).toFixed(1)}" fill="#C3CDD8"/>`).join('');
  document.getElementById('tlBars').dataset.n=TLN; }
function tlBarsPlayed(T){ const r=document.getElementById('tlBars').children, k=Math.floor(T); for(let i=0;i<r.length;i++){ const on=i<=k; if(r[i]._on!==on){ r[i]._on=on; r[i].setAttribute('fill',on?'#1B2B3C':'#C3CDD8'); } } }
let tlOn=false;
function tlTick(now){
  if(tlOn && TLC){ const dt=Math.min(.1,(now-(TLS.last||now))/1000); TLS.last=now;
    if(TLS.playing){ const R=tlR(); if(TLS.t<R.k0||TLS.t>R.k1) TLS.t=R.k0; if(TLS.hold>0) TLS.hold-=dt; else { TLS.t+=dt*6; if(TLS.t>=R.k1){ TLS.t=R.k1; TLS.hold=1.4; } } if(TLS.hold<=0 && TLS.t>=R.k1) TLS.t=R.k0; }
    tlDraw(); } else TLS.last=now;
  requestAnimationFrame(tlTick); }
const tlZoom=d3.zoom().scaleExtent([1,14]).wheelDelta(e=>-e.deltaY*(e.deltaMode===1?.05:e.deltaMode?1:.002)*.6).filter(e=>(e.type==='wheel'?(e.ctrlKey||e.metaKey):!(String(e.type).startsWith('touch')&&narrow()&&!(e.touches&&e.touches.length>1)))&&!e.button)
  .on('zoom',e=>{ TLS.transform=e.transform; document.querySelectorAll('.tlzoom button').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.w==='1')===(e.transform.k<1.3)))); if(reduced) tlDraw(); });
if(!matchMedia('(pointer:coarse)').matches) d3.select(tlc).call(tlZoom);
function youTransform(){ const c=DATA.cities[state.city], r=7.5/60, k=Math.cos(c.you[1]*rad); const a=tlBase.f(c.you[0]-r/k*1.4,c.you[1]+r), b=tlBase.f(c.you[0]+r/k*1.4,c.you[1]-r); const s=Math.min(14,Math.min(TLC.W/(b[0]-a[0]),TLC.H/(b[1]-a[1]))); const m=tlBase.f(c.you[0],c.you[1]); return d3.zoomIdentity.translate(TLC.W/2-m[0]*s,TLC.H/2-m[1]*s).scale(s); }
function tlZoomTo(wide,ms=1400){ const tr=wide?d3.zoomIdentity:youTransform(); d3.select(tlc).transition('tlz').duration(reduced?0:ms).ease(d3.easeCubicInOut).call(tlZoom.transform,tr); }
document.querySelectorAll('.tlzoom button').forEach(b=>b.addEventListener('click',()=>tlZoomTo(b.dataset.w==='1')));
document.getElementById('tlPlay').addEventListener('click',()=>{ TLS.playing=!TLS.playing; const pb=document.getElementById('tlPlay'); pb.textContent=TLS.playing?'❚❚':'▶'; pb.setAttribute('aria-label',TLS.playing?'Pause the replay':'Play the replay'); });
document.getElementById('tlT').addEventListener('input',e=>{ const R=tlR(); TLS.t=R.k0+(+e.target.value/1000)*(R.k1-R.k0); TLS.hold=0; if(!TLS.playing) tlDraw(); });
function tlStart(){ TLS.t=tlR().k0; TLS.hold=.8; if(narrow()){ d3.select(tlc).call(tlZoom.transform,d3.zoomIdentity); return; } d3.select(tlc).call(tlZoom.transform,youTransform()); setTimeout(()=>tlZoomTo(true,1800),700); }
new IntersectionObserver(es=>{ tlOn=es.some(e=>e.isIntersecting); if(tlOn && !TLS.seen){ TLS.seen=true; tlStart(); } },{threshold:.35}).observe(tlc);

/* ---------- where they're heading ---------- */
function dest(){
  const c=DATA.cities[state.city], H=c.heading, rows=H.ports.slice(0,7), max=d3.max(rows,r=>r.n)||1;
  const hrs=Math.round((CAPTURED-new Date(H.start))/36e5);
  const R=prepTL(state.city), tlh=Math.max(1,Math.round((R.k1-R.k0)/6)); document.getElementById('zoomSub').textContent=`The last ${tlh} hours off ${c.name}, replayed from my recorder. Each bar is 10 minutes. Taller means more ships.`;
  document.getElementById('destP').innerHTML=`<b>${H.staying}</b> of <b>${H.total}</b> ships gave ${c.name} as their destination. The rest named:`;
  document.getElementById('destList').innerHTML=rows.map(r=>`<li><span>${r.port}</span><span class="mono" style="font-size:12px;color:var(--muted)">${r.n}</span><i style="width:${Math.max(4,r.n/max*100)}%"></i></li>`).join('');
  document.getElementById('destNote').textContent=`Counts ships over 60 m seen in the last ${tlh} hours. Each crew types its destination into the ship's transponder. ${H.unknown} of these ships gave no usable destination. ${H.nolen} more sent no size, so they are left out.`;
}

/* ---------- what's real, receipt, credits ---------- */
const REAL=[
 ['Ship names, positions, speed, heading','d','DATA',`AIS, the radio signal every large ship broadcasts, via aisstream.io. Snapshot taken ${capStr}.`],
 ['Which ships are heard','d','DATA','aisstream.io relies on volunteer shore receivers. Some ships are missed, and some send no name or size. Fishing-net buoys are filtered out.'],
 ['Ship length','d','DATA',"The ship's own AIS broadcast. Some ships send wrong sizes; anything over 400 m is hidden."],
 ['Ship type: tanker, passenger, cargo','d','DATA',"The AIS type code the ship broadcasts. In Hong Kong, the Marine Department's type is used when the ship is on its schedule."],
 ['Ship type: container, bulk, car, gas carrier','g','INFERRED','AIS only says "cargo" or "tanker". I guess from the name (MSC, Maersk, ORE, LNG and so on). Shown as <span style="white-space:nowrap">"(likely)"</span>.'],
 ['Last port calls','g','INFERRED','Global Fishing Watch detects port visits from the track, at least 3 days behind. I match each one to the nearest named port. Anchorages and bunker stops count as visits.'],
 ['Flag','d','DATA','Global Fishing Watch vessel registry.'],
 ['Where a ship is heading','d','DATA','Typed in by the crew, so it can be wrong or stale. For "A > B" the last port is used.'],
 ['Routes between ports','g','INFERRED',"Standard sea lanes (searoute), not the ship's real track."],
 ['Which ships you can see','g','INFERRED',"Earth's curve from a 3 m eye height, and land in the way."],
 ['Hills on the horizon','d','DATA','Real elevation (SRTM terrain tiles, AWS Open Data), drawn 3× taller than life. Buildings are not drawn.'],
 ['Distance on the horizon','r','DRAWN','Bearings and the order of ships are true. Distance is squeezed so near and far ships both fit.'],
 ['Ship drawings','r','DRAWN',"A generic shape per type, scaled to the ship's real length."],
 ['Landmarks for scale','r','DRAWN','Simplified outlines at their published sizes.'],
 ['The replay','d','DATA','Recorded positions, one every 10 minutes per ship, joined with straight lines.'],
 ['Coastlines and map','d','DATA','Natural Earth 1:10m.']];
document.getElementById('realRows').innerHTML=REAL.map(r=>`<div class="rr"><span>${r[0]}</span><span><b class="st ${r[1]}">${r[2]}</b></span><span>${r[3]}</span></div>`).join('');
document.querySelector('details.real').addEventListener('toggle',e=>{ e.target.querySelector('summary span').textContent=e.target.open?'close ↑':'open ↓'; });
(function(){
  const cs=Object.values(DATA.cities), tl=Object.values(TLDATA.areas).reduce((a,v)=>a+v.length,0);
  const rows=[['SHORES',cs.map(c=>c.name).join(', ')],['SHIPS IN THE REPLAYS',tl.toLocaleString()],['POSITIONS STORED',(DATA.db.positions||0).toLocaleString()],['PORT CALLS JOINED',cs.reduce((a,c)=>a+c.ships.reduce((b,s)=>b+s.calls.length,0),0)]];
  document.getElementById('rcpt').innerHTML=rows.map(r=>`<div class="row"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('');
  document.getElementById('rDate').textContent=capStr.toUpperCase();
  const rb=document.getElementById('rbar'); rb.outerHTML=barcode(20261109).replace('<svg ','<svg id="rbar" aria-hidden="true" style="width:200px;height:34px;margin-top:14px" ');
  document.getElementById('aiNote').textContent=`I directed the build with Claude Code: the idea, the story, the look, which data to trust, and what to fix. Claude wrote the code, the data pipeline and the recorder. On each draft, I had AI reviewers play a recruiter, a shipping professional and a designer, then fixed what they found.`;
  document.getElementById('credits').innerHTML='Ships: aisstream.io. Port history: Powered by Global Fishing Watch. Hong Kong ship types: Marine Department. Elevation: Terrain Tiles on AWS. Coastlines: Natural Earth.';
  document.getElementById('againBtn').addEventListener('click',()=>{ stepCity(1); document.getElementById('look').scrollIntoView({behavior:reduced?'auto':'smooth'}); });
})();
