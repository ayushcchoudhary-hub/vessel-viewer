
/* ---------- 04 flow, restyled ---------- */
function buildFlow(){
  const el=document.getElementById('flow'); const W=el.clientWidth||1000, vert=W<980; el.innerHTML='';
  const db=DATA.db||{}; const ships=Object.values(DATA.cities).flatMap(c=>c.ships);
  const N=[
    {id:'ais',t:"Ships' AIS radios",sh:'AIS radios',s:'position every few seconds',k:'source'},
    {id:'gfw',t:'Global Fishing Watch',sh:'Fishing Watch',s:'port-call history',k:'source'},
    {id:'hk',t:'HK Marine Dept',sh:'HK port',s:'ship types, schedule',k:'source'},
    {id:'geo',t:'Terrain + coastlines',sh:'Terrain',s:'SRTM · Natural Earth',k:'source'},
    {id:'rec',t:'Recorder',s:'every minute, 24/7',k:'step'},
    {id:'db',t:'Postgres',s:`${(db.positions||0).toLocaleString()} positions`,k:'store'},
    {id:'pipe',t:'Pipeline',s:'clean · match · join · route',k:'step'},
    {id:'page',t:'This page',s:`${ships.length} ships · ${Object.keys(DATA.cities).length} shores`,k:'out'}];
  const E=[['ais','rec'],['rec','db'],['db','pipe'],['gfw','pipe'],['hk','pipe'],['geo','pipe'],['pipe','page']];
  const nh=60, H=vert?660:400, nw=vert?Math.min(W-80,320):Math.min(220,(W-160)/4), sw=(W-40-16)/3;
  const col=i=>40+i*((W-80-nw)/3);
  const P=vert?{ais:[(W-nw)/2,20],rec:[(W-nw)/2,110],db:[(W-nw)/2,200],gfw:[(W-nw)/2,300],hk:[(W-nw)/2,354],geo:[(W-nw)/2,408],pipe:[(W-nw)/2,490],page:[(W-nw)/2,590]}
                :{ais:[col(0),30],gfw:[col(0),130],hk:[col(0),220],geo:[col(0),310],rec:[col(1),30],db:[col(2),30],pipe:[col(2),220],page:[col(3),130]};
  const wOf=n=>nw, srcRow=n=>vert && n.k==='source' && n.id!=='ais', hOf=n=>srcRow(n)?44:nh;
  const NB=Object.fromEntries(N.map(n=>[n.id,n]));
  const edge=([a,b])=>{ const [ax,ay]=P[a],[bx,by]=P[b];
    if(vert){ const x1=ax+nw/2,y1=ay+nh,x2=bx+nw/2,y2=by; if(a==='db'&&b==='pipe') return `M${ax},${ay+nh/2} C${Math.max(4,ax-30)},${ay+nh/2} ${Math.max(4,ax-30)},${by+nh/2} ${bx},${by+nh/2}`; if(srcRow(NB[a])) return `M${ax+nw},${ay+22} C${ax+nw+26},${ay+22} ${ax+nw+26},${by+nh/2} ${bx+nw},${by+nh/2}`; return `M${x1},${y1} C${x1},${y1+40} ${x2},${y2-40} ${x2},${y2}`; }
    if(a==='db'&&b==='pipe') return `M${ax+nw/2},${ay+nh} L${bx+nw/2},${by}`;
    if(b==='pipe'){ const x1=ax+nw,y1=ay+nh/2,x2=bx,y2=by+nh/2; return `M${x1},${y1} C${x1+90},${y1} ${x2-90},${y2} ${x2},${y2}`; }
    const x1=ax+nw,y1=ay+nh/2,x2=bx,y2=by+nh/2; return `M${x1},${y1} C${x1+60},${y1} ${x2-60},${y2} ${x2},${y2}`; };
  const svg=d3.select(el).append('svg').attr('viewBox',`0 0 ${W} ${H}`).attr('height',H);
  const paths=svg.append('g').selectAll('path').data(E).join('path').attr('d',edge).attr('fill','none').attr('stroke','#141414').attr('stroke-opacity',.18).attr('stroke-width',2);
  const g=svg.append('g').selectAll('g').data(N).join('g').attr('transform',n=>`translate(${P[n.id][0]},${P[n.id][1]})`);
  g.append('rect').attr('width',n=>wOf(n)).attr('height',n=>hOf(n)).attr('rx',12).attr('fill',n=>n.k==='out'?'#141414':(n.k==='source'?'#F3F0EA':'#fff')).attr('stroke','#141414').attr('stroke-width',2);
  g.append('text').attr('x',14).attr('y',n=>srcRow(n)?28:25).text(n=>n.t).attr('font-family','Bricolage Grotesque, sans-serif').attr('font-weight',800).attr('font-size',vert&&false?14:16).attr('fill',n=>n.k==='out'?'#fff':'#141414');
  g.append('text').attr('x',n=>srcRow(n)?nw-12:14).attr('text-anchor',n=>srcRow(n)?'end':'start').attr('y',n=>srcRow(n)?27:44).text(n=>srcRow(n)&&nw<316?'':n.s).attr('font-family','IBM Plex Mono, monospace').attr('font-size',10.5).attr('fill',n=>n.k==='out'?'#C9D4DF':'#5B6672');
  if(!vert){ svg.append('text').attr('x',col(0)).attr('y',18).text('SOURCES').attr('font-family','IBM Plex Mono, monospace').attr('font-size',10.5).attr('letter-spacing','.1em').attr('fill','#5B6672');
    svg.append('text').attr('x',col(1)).attr('y',18).text('COLLECT').attr('font-family','IBM Plex Mono, monospace').attr('font-size',10.5).attr('letter-spacing','.1em').attr('fill','#5B6672');
    svg.append('text').attr('x',col(2)).attr('y',18).text('STORE + MODEL').attr('font-family','IBM Plex Mono, monospace').attr('font-size',10.5).attr('letter-spacing','.1em').attr('fill','#5B6672');
    svg.append('text').attr('x',col(3)).attr('y',118).text('SHOW').attr('font-family','IBM Plex Mono, monospace').attr('font-size',10.5).attr('letter-spacing','.1em').attr('fill','#5B6672'); }
  const dots=svg.append('g'); const lab=svg.append('g');
  FLOW={paths:paths.nodes(),E,dots,lab,packets:[]};
}

/* ---------- tour ---------- */
const capEl=document.getElementById('caption');
function say(t){ capEl.innerHTML=t; capEl.classList.toggle('on',!!t); }
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let touring=false, tourId=0;
function stopTour(){ tourId++; touring=false; say(''); capEl.classList.remove('tour'); document.getElementById('tourBtn').textContent='▶ Take the 40-second tour'; cancelAnimationFrame(playing); playing=null; animating=false; baseKey=''; document.getElementById('play').textContent='▶'; d3.select(gl).interrupt('globe'); }
async function tour(){
  stopTour(); const run=tourId; const live=()=>run===tourId; touring=true; document.getElementById('tourBtn').textContent='■ Stop the tour'; capEl.classList.add('tour');
  const step=async(html,ms,fn)=>{ if(!live()) throw 0; say(html+'<button class="capx" type="button" aria-label="Stop the tour">✕</button>'); if(fn) fn(); await wait(ms); if(!live()) throw 0; };
  try{
    setCity('sg'); setZoom(1); document.getElementById('look').scrollIntoView({behavior:'smooth'});
    await step("What's that <em>ship?</em>",2200);
    const cand=VIEW.filter(v=>v.visible && v.sh.calls.length>=2 && (v.sh.len||0)>=200).sort((a,b)=>(b.sh.len/(1+b.d))-(a.sh.len/(1+a.d)))[0] || VIEW.find(v=>v.visible);
    await step('Real ships off <em>Singapore</em>',2600,()=>turnTo(cand.b-8,2400));
    await step('Tap one',2400,()=>{ select(cand.sh.id,false); setZoom(7); });
    await step(`${typeName(cand.sh)}, <em>${cand.sh.len} m</em>`,2600,()=>{ setZoom(1); pickSeen=true; document.getElementById('pick').scrollIntoView({behavior:'smooth'}); });
    await step('Where has it <em>been?</em>',4200,()=>journey(cand.sh,true));
    await step('Ride along',8000);
    await step(`Zoom out: ${Math.max(1,Math.round((prepTL('sg').k1-prepTL('sg').k0)/6))} hours of <em>traffic</em>`,7000,()=>{ TLS.seen=true; document.getElementById('zoom').scrollIntoView({behavior:'smooth'}); setTimeout(()=>{ if(live()) tlStart(); },600); });
    await step('From ship radio, <em>AIS</em>, and Global Fishing Watch',4200,()=>document.getElementById('how').scrollIntoView({behavior:'smooth'}));
    await step("What's that ship? <em>Now you know.</em>",2200);
  } catch(e){} finally { if(live()) stopTour(); }
}
document.getElementById('tourBtn').addEventListener('click',()=>{ if(touring) stopTour(); else tour(); });
capEl.addEventListener('click',e=>{ if(e.target.closest('.capx')) stopTour(); });
addEventListener('keydown',e=>{ if(e.key==='Escape' && touring) stopTour(); });

/* ---------- wiring ---------- */
function select(id,turn){
  const sh=DATA.cities[state.city].ships.find(s=>s.id===id); if(!sh) return;
  state.sel=id; card(sh); journey(sh,false); lastChips='';
  if(turn){ const v=VIEW.find(v=>v.sh.id===id); if(v && Math.abs(angDiff(v.b,state.face))>FOV/2-4) turnTo(v.b); }
}
const CITY_ORDER=Object.keys(DATA.cities);
function setCity(id, selId){
  state.city=id; state.hover=null; state.face=DATA.cities[id].face; const c=DATA.cities[id];
  document.getElementById('cityName').textContent=c.name; document.querySelectorAll('#shores button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.c===id));
  document.getElementById('nowTitle').textContent=`From ${c.spot}, ${c.name}`;
  document.getElementById('liveBadge').innerHTML=`<i></i>SNAPSHOT · ${CAPTURED.toLocaleString('en-GB',{timeZone:TZ[id],day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} local`;
  fit(); frame(); typeKey(); dest(); tlBars();
  if(TLC){ tlFit(); if(TLS.seen){ TLS.t=prepTL(id).k0; d3.select(tlc).call(tlZoom.transform,d3.zoomIdentity); } }
  const near=selId?{sh:c.ships.find(s=>s.id===selId)}:[...VIEW].filter(v=>v.visible && Math.abs(angDiff(v.b,state.face))<FOV/2 && v.sh.calls.length).sort((a,b)=>(b.sh.len||0)/(1+b.d)-(a.sh.len||0)/(1+a.d))[0] || [...VIEW].filter(v=>v.visible).sort((a,b)=>(b.sh.len||0)/(1+b.d)-(a.sh.len||0)/(1+a.d))[0] || {sh:c.ships[0]};
  if(near && near.sh){ const v=VIEW.find(v=>v.sh.id===near.sh.id); if(v && !selId && Math.abs(angDiff(v.b,state.face))>FOV/2-4){ state.face=(v.b+360)%360; frame(); } select(near.sh.id,!!selId); }
  pickSeen=false;
}
function stepCity(d){ const i=CITY_ORDER.indexOf(state.city); setCity(CITY_ORDER[(i+d+CITY_ORDER.length)%CITY_ORDER.length]); }
document.getElementById('shores').innerHTML=CITY_ORDER.filter(k=>DATA.cities[k]).map(k=>`<button type="button" data-c="${k}" aria-pressed="false">${DATA.cities[k].name}</button>`).join('');
document.getElementById('shores').addEventListener('click',e=>{ const b=e.target.closest('button'); if(b && b.dataset.c!==state.city) setCity(b.dataset.c); });
document.getElementById('prevCity').addEventListener('click',()=>stepCity(-1));
document.getElementById('nextCity').addEventListener('click',()=>stepCity(1));
// section highlight in the top bar
const navLinks=[...document.querySelectorAll('.steps-nav a')];
new IntersectionObserver(es=>{ for(const e of es) if(e.isIntersecting) navLinks.forEach(a=>a.classList.toggle('on',a.dataset.s===e.target.id)); },{rootMargin:'-45% 0px -50% 0px'}).observe(document.getElementById('look'));
['pick','zoom','how'].forEach(id=>{ new IntersectionObserver(es=>{ for(const e of es) if(e.isIntersecting) navLinks.forEach(a=>a.classList.toggle('on',a.dataset.s===id)); },{rootMargin:'-45% 0px -50% 0px'}).observe(document.getElementById(id)); });
window.addEventListener('resize',()=>{ FOV=zoomBase()/state.zoom; fit(); glFit(); drawGlobe(); frame(); tlFit(); buildFlow(); });
FOV=zoomBase(); glFit(); tlFit();
if(location.hash==='#film') document.body.classList.add('film');
setCity('sg');
loop(); requestAnimationFrame(tlTick);
if(location.hash==='#film') setTimeout(tour,1200);
</script>
<script type="module">
/* Visitor analytics: PostHog (US cloud), same setup as ayushcchoudhary.com. First-party: the script is /v.js and data goes to /relay (a Vercel rewrite).
   Nothing is stored in the browser: no cookies, no banner. Each page load is one anonymous visit.
   Off away from the live domain, for bots, and when the browser sends Do Not Track or Global Privacy Control. Visit /?notrack once to stop counting your own visits (/?track undoes it). */
const KEY = 'phc_pV99R48SprP9tisLua6KZ38B9Pr6v2wnaNh3KyLvngEU';
let off = false;
try {
  const q = new URLSearchParams(location.search);
  if (q.has('notrack')) localStorage.setItem('notrack', '1');
  if (q.has('track')) localStorage.removeItem('notrack');
  off = localStorage.getItem('notrack') === '1';
} catch {}
if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl) off = true;
if (KEY && !off && !navigator.webdriver && location.hostname === 'vessels.ayushcchoudhary.com') {
  const { default: posthog } = await import('/v.js');
  posthog.init(KEY, {
    api_host: '/relay', ui_host: 'https://us.posthog.com',
    persistence: 'memory', person_profiles: 'identified_only',
    capture_pageview: false, capture_pageleave: true, autocapture: false,
    disable_session_recording: true, disable_surveys: true, advanced_disable_flags: true, disable_external_dependency_loading: true
  });
  posthog.register({ site: 'vessel-viewer' });
  posthog.capture('$pageview');
  if (/[?&](utm_|notrack|track)/.test(location.search)) history.replaceState(history.state, '', location.pathname + location.hash);
  const ev = (name, props) => posthog.capture(name, props);
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="http"]');
    if (a && a.host !== location.host) ev('link_clicked', { to: a.hostname.replace(/^www\./, ''), label: a.textContent.trim().slice(0, 40) });
    if (e.target.closest('#tourBtn')) ev('tour_clicked');
    const sh = e.target.closest('#shores button'); if (sh) ev('shore_changed', { shore: sh.dataset.c });
    if (e.target.closest('#prevCity, #nextCity')) ev('shore_changed', { shore: 'arrows' });
    if (e.target.closest('.chip')) ev('ship_picked');
    if (e.target.closest('#play')) ev('journey_played');
  }, true);
}
</script>
</body>
</html>
