
/* ---------- controls ---------- */
function setZoom(z){
  state.zoom=z; const f0=FOV, f1=zoomBase()/z;
  document.querySelectorAll('.zb').forEach(o=>o.setAttribute('aria-pressed',String(+o.dataset.z===z)));
  document.getElementById('horizonPanel').classList.toggle('bino', z>1);
  document.getElementById('hzhint').textContent = z>1 ? 'Through 7× binoculars · drag to look around' : 'Drag to look around · tap a ship';
  const v=VIEW.find(v=>v.sh.id===state.sel); if(v && z>1) turnTo(v.b,600);
  tween(f0,f1,600,x=>{ FOV=x; });
}
document.querySelectorAll('.zb').forEach(b=>b.addEventListener('click',()=>setZoom(+b.dataset.z)));

/* ---------- canvases ---------- */
function setupCanvas(cv){ const r=cv.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2); cv.width=Math.max(1,r.width*dpr); cv.height=Math.max(1,r.height*dpr); const c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0); return {c,W:r.width,H:r.height,dpr}; }
const hz=document.getElementById('hz'); let HZ;
function fit(){ HZ=setupCanvas(hz); }
function rangeNm(h){ return 2.08*(Math.sqrt(h)+Math.sqrt(40)); }

/* ---------- frame ---------- */
let VIEW=[], lastStats='', lastChips='';
const HL=[];
function frame(){
  const t=performance.now()-T0, c=DATA.cities[state.city];
  const h=state.h, dh=2.08*Math.sqrt(h), rnm=rangeNm(h);
  VIEW = c.ships.map(sh=>{
    const {p,hd}=shipPos(sh,t), d=nmBetween(c.you,p), b=bearing(c.you,p);
    const land=c.landProfile[Math.round(b*2)%720];
    const landH={sg:40,hk:250,ldn:6,ny:30}[state.city], Hm0=(sh.len||60)*TYPES[sh.type].H;
    const blocked = land!=null && land < d - 0.05 && Hm0 < landH*1.4;
    const hidden = d>dh ? Math.pow((d-dh)/2.08,2) : 0;
    const visible = !blocked && hidden < Hm0*0.85 && d <= rnm;
    return {sh,p,hd,d,b,blocked,hidden,visible};
  });
  drawHorizon(c);
  const inView = VIEW.filter(v=>v.visible && Math.abs(angDiff(v.b,state.face))<=FOV/2);
  const s=`<b>${c.counts.hour}</b> ships in the area in the last hour. The <b>${c.ships.length}</b> biggest near you are drawn.`;
  if(s!==lastStats){ document.getElementById('nowStats').innerHTML=s; lastStats=s; }
  const chips=inView.sort((a,b)=>a.d-b.d).slice(0,12);
  const key=chips.map(v=>v.sh.id).join()+'|'+state.sel;
  if(key!==lastChips){ lastChips=key; const el=document.getElementById('inview');
    el.innerHTML=chips.map(v=>`<button type="button" class="chip" data-id="${v.sh.id}" aria-pressed="${v.sh.id===state.sel}"><i style="background:${TYPES[v.sh.type].c}"></i>${v.sh.name}<small>${TYPES[v.sh.type].short}</small></button>`).join('') || '<span style="font-size:13px;color:var(--muted);padding:6px 4px">No big ships this way. Drag to look around.</span>';
    el.querySelectorAll('.chip').forEach(b=>b.addEventListener('click',()=>select(b.dataset.id,true))); }
}
let hzOn=true;
new IntersectionObserver(es=>{ hzOn=es.some(e=>e.isIntersecting); },{threshold:0}).observe(document.getElementById('horizonPanel'));
function loop(){ if(hzOn) frame(); requestAnimationFrame(loop); }

/* ---------- interaction ---------- */
function hitHorizon(mx,my){ let hit=null; for(const o of HL){ if(o.lab && mx>=o.lab[0]&&mx<=o.lab[0]+o.lab[2]&&my>=o.lab[1]&&my<=o.lab[1]+o.lab[3]) return o.sh.id; if(Math.abs(mx-o.X)<Math.max(12,o.Lpx/2)&&my>o.top-14&&my<o.y+8) hit=o.sh.id; } return hit; }
let drag=null;
const hzWrap=document.getElementById('horizon');
const local=(e,el)=>{ const r=el.getBoundingClientRect(); return [e.clientX-r.left,e.clientY-r.top]; };
hzWrap.addEventListener('pointerdown',e=>{ drag={x:e.clientX,f:state.face,moved:false}; });
hzWrap.addEventListener('pointermove',e=>{
  if(drag){ const dx=e.clientX-drag.x; if(Math.abs(dx)>4){ drag.moved=true; hzWrap.setPointerCapture?.(e.pointerId); } if(drag.moved){ document.getElementById('hzhint').classList.add('gone'); state.face=(drag.f - dx/(HZ.W/FOV)+360)%360; } return; }
  const [mx,my]=local(e,hz); state.hover=hitHorizon(mx,my); hzWrap.style.cursor=state.hover?'pointer':'grab';
});
hzWrap.addEventListener('pointerup',e=>{ if(drag && !drag.moved){ const [mx,my]=local(e,hz); const id=hitHorizon(mx,my); if(id) select(id,false); } drag=null; });
['pointerleave','pointercancel'].forEach(t=>hzWrap.addEventListener(t,()=>{ state.hover=null; if(t==='pointercancel') drag=null; }));
hzWrap.addEventListener('keydown',e=>{ if(e.key==='ArrowLeft'||e.key==='ArrowRight'){ e.preventDefault(); state.face=(state.face+(e.key==='ArrowLeft'?-5:5)+360)%360; } });

function typeKey(){ const c=DATA.cities[state.city]; const used=[...new Set(c.ships.map(s=>s.type))]; document.getElementById('typekey').innerHTML=used.map(t=>`<span><i style="background:${TYPES[t].c}"></i>${TYPES[t].label}</span>`).join(''); }

/* ---------- landmarks at true scale ---------- */
const LANDMARK={
  sg:{name:'Marina Bay Sands', note:'Its SkyPark is 340 m long.', w:340, h:206, draw(c,x,y,k){ c.fillStyle='#8C99A6'; for(const tx of [0,92,184]) c.fillRect(x+tx*k,y-194*k,40*k,194*k); c.fillStyle='#6E7C89'; c.beginPath(); c.moveTo(x-8*k,y-194*k); c.lineTo(x+332*k,y-200*k); c.lineTo(x+336*k,y-206*k); c.lineTo(x-8*k,y-203*k); c.closePath(); c.fill(); }},
  hk:{name:'the ICC tower', note:"Hong Kong's tallest building, 484 m.", w:66, h:484, draw(c,x,y,k){ c.fillStyle='#8C99A6'; c.beginPath(); c.moveTo(x,y); c.lineTo(x,y-430*k); c.lineTo(x+8*k,y-484*k); c.lineTo(x+58*k,y-484*k); c.lineTo(x+66*k,y-430*k); c.lineTo(x+66*k,y); c.closePath(); c.fill(); }},
  ldn:{name:'the Shard', note:'310 m tall, in central London.', w:66, h:310, draw(c,x,y,k){ c.fillStyle='#8C99A6'; c.beginPath(); c.moveTo(x,y); c.lineTo(x+28*k,y-310*k); c.lineTo(x+33*k,y-288*k); c.lineTo(x+38*k,y-306*k); c.lineTo(x+66*k,y); c.closePath(); c.fill(); }},
  ny:{name:'the Empire State Building', note:'443 m to the tip.', w:130, h:443, draw(c,x,y,k){ c.fillStyle='#8C99A6'; c.fillRect(x,y-25*k,130*k,25*k); c.fillRect(x+22*k,y-320*k,86*k,300*k); c.fillRect(x+35*k,y-360*k,60*k,40*k); c.fillRect(x+50*k,y-381*k,30*k,22*k); c.fillRect(x+62*k,y-443*k,6*k,64*k); }}
};
function scaleImage(sh){
  const lm=LANDMARK[state.city], L=sh.len||100, W=720, H=230, pad=24, base=H-26;
  const k=Math.min((W-3*pad)/(L+lm.w+40), (H-50)/lm.h);
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const c=cv.getContext('2d');
  c.fillStyle='#E9EFF5'; c.fillRect(0,base,W,H-base); c.fillStyle='#C9D4DF'; c.fillRect(0,base,W,2);
  const x0=pad, shipW=L*k; drawSide(c,sh.type,x0+shipW/2,base,shipW,1,shipColors(0,false),TYPES[sh.type].c,sh.len);
  lm.draw(c,x0+shipW+40*k+pad,base,k);
  c.font='600 22px "IBM Plex Mono", monospace'; c.fillStyle='#141414'; c.fillText(`${L} m`, x0, base+24);
  return cv.toDataURL();
}
function barcode(id){ const s=String(id||'0'), bars=[]; let x=0; for(const ch of (s+s).slice(0,18)){ const d=+ch||1; bars.push(`<rect x="${x}" y="0" width="${1+d%3}" height="34" fill="#141414"/>`); x+=2+d%4+1; } return `<svg viewBox="0 0 ${x} 34" preserveAspectRatio="none">${bars.join('')}</svg>`; }

/* ---------- ship ticket ---------- */
function headTo(sh){ const raw=(sh.dest_raw||'').trim(), typed=raw?`<span class="sub">Crew typed "${raw}"${explainDest(raw)}</span>`:'';
  if(sh.next) return `<span class="big">${sh.next.port}</span>${typed}`;
  if(/^ORDERS?$|FOR ORDERS/i.test(raw)) return `<span class="big">Awaiting orders</span><span class="sub">Crew typed "${raw}"</span>`;
  if(raw && raw.length>1) return `<span class="big" style="font-family:var(--mono);font-size:18px">${raw}</span><span class="sub">Code not matched to a port</span>`;
  return `<span class="big" style="font-size:15px;color:#5B6672">Not broadcast</span>`; }
const SGCODE=[[/^PEBG/,'Eastern pilot boarding ground'],[/^AESP/,'Eastern Special Purpose anchorage'],[/^PWBG/,'Western pilot boarding ground'],[/^AEB/,'Eastern Bunkering anchorage'],[/^AEP/,'Eastern Petroleum anchorage'],[/^AEW/,'Eastern Working anchorage'],[/^AWP/,'Western Petroleum anchorage'],[/^AW/,'a western anchorage']];
function explainDest(raw){ if(state.city!=='sg') return ''; for(const tok of String(raw).toUpperCase().split(/[^A-Z0-9]+/)){ const m=SGCODE.find(([re])=>re.test(tok)); if(m) return `<br>${tok} = ${m[1]}.`; } return ''; }
function fmtAgo(d){ return d<1?'today':(d<2?'yesterday':Math.round(d)+' days ago'); }
function card(sh){
  const t=TYPES[sh.type], realCalls=sh.calls.filter(c=>!/canal|transit/i.test(c.port)), last=realCalls[realCalls.length-1]||sh.calls[sh.calls.length-1], c0=DATA.cities[state.city];
  const nextNear = sh.next && nmBetween(sh.a,[sh.next.lon,sh.next.lat])<12;
  const dist=nmBetween(c0.you,sh.b||sh.a).toFixed(1);
  const status = sh.status==='Underway' ? `Under way, ${sh.kn} kn` : (sh.status||'Stopped');
  const first=sh.calls[0];
  const whereNow = sh.status==='Underway' ? `under way at ${sh.kn} knots` : (sh.status==='At anchor'?'at anchor':(sh.status==='Moored'?'moored':'stopped'));
  const story = first ? `In ${first.port} on ${fmtDay(-first.ago)}${sh.calls.length>1?`, then ${sh.calls.slice(1).map(x=>x.port).join(', ')}`:''}. Now ${whereNow}, ${dist} nm off ${c0.spot}.` : `No recent port calls on record. Now ${whereNow}, ${dist} nm off ${c0.spot}.`;
  const lm=LANDMARK[state.city];
  document.getElementById('ticket').innerHTML=`
    <div class="t-head"><span>VESSEL · ${c0.name.toUpperCase()}</span><span>MMSI ${sh.mmsi}</span></div>
    <div class="t-name">${sh.name}</div>
    <div class="t-type"><i style="background:${t.c}"></i>${t.label}${sh.typeGuess?' <em>(likely)</em>':''}${sh.len?` · ${sh.len} m`:''}${sh.flag?` · ${sh.flag} flag`:''}</div>
    <div class="t-perf"></div>
    <div class="t-rows">
      <div><small>${sh.here?'In port since':'Last port'}</small><span class="big">${sh.here?fmtDay(-sh.here.ago):(last?last.port:'Unknown')}</span><span class="sub">${sh.here?sh.here.port:(last?fmtAgo(last.ago):'no history')}</span></div>
      <div><small>Heading to</small>${headTo(sh)}</div>
      <div><small>Status</small><span>${status}</span></div>
      <div><small>Distance</small><span>${dist} nm from you</span></div>
    </div>
    <div class="t-scale"><img src="${scaleImage(sh)}" alt="${sh.name} drawn to scale beside ${lm.name}"><p>To scale: ${sh.len||'?'} m of ship beside ${lm.name}. ${lm.note}</p></div>
    <p class="t-story">${story}</p>
    <div class="t-code">${barcode(sh.mmsi)}<span>${sh.imo?'IMO '+sh.imo:''}</span></div>`;
  document.getElementById('toPick').textContent=`Where ${sh.name} has been ↓`;
}
