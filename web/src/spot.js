
/* ---------- 01b point at a ship ----------
   Take a photo of the sea. GPS says where you stand. The compass says which way the phone points, but it can be 10 degrees wrong.
   A vision model finds the ships in the photo (it does not name them). Then the code below slides the AIS ships across the photo
   until the gaps and sizes fit, and names each ship. "Show me" runs this on the Look out view, with a stand-in for the vision model.
   Camera mode uses live ship data (/api/live) and the vision function (/api/detect). */
const SPOT=(()=>{
const RAD = Math.PI / 180;
const angDiff = (a, b) => ((a - b + 540) % 360) - 180;
const fore = (s) => Math.max(0.22, Math.abs(Math.sin((s.hd - s.b) * RAD)));          // how side-on the ship is
const angWidth = (s) => Math.atan2((s.len || 60) * fore(s), s.d * 1852) / RAD;        // degrees it spans
const KIND = { tanker: 'tanker', lng: 'tanker', container: 'cargo', bulk: 'cargo', car: 'cargo', cargo: 'cargo', passenger: 'passenger', other: 'other' };
const typeFits = (seen, ais) => !seen || KIND[seen] === KIND[ais] || seen === ais;

/* AIS ships that could be in the frame, with where they should sit if the compass were right. */
function candidates(ships, face, fov, slack = 25) {
  return ships.filter((s) => Math.abs(angDiff(s.b, face)) <= fov / 2 + slack)
    .map((s) => ({ s, off: angDiff(s.b, face), w: angWidth(s) }));
}

function pairCost(det, c, shift, fov, o) {
  const dx = (c.off - shift) - (det.x - 0.5) * fov;                    // degrees between seen and expected
  const ca = (dx / o.sigA) ** 2;
  const cs = det.w ? (Math.log((det.w * fov) / c.w) / o.sigS) ** 2 : 0;
  const ct = typeFits(det.type, c.s.type) ? 0 : o.typePenalty;
  return ca + cs + ct;
}

function scoreShift(dets, cands, shift, fov, o) {
  const pairs = [];
  dets.forEach((det, i) => cands.forEach((c, j) => { const g = o.cap - pairCost(det, c, shift, fov, o); if (g > 0) pairs.push([g, i, j]); }));
  pairs.sort((a, b) => b[0] - a[0]);
  const usedD = new Set(), usedC = new Set(); let total = 0; const assign = {};
  for (const [g, i, j] of pairs) { if (usedD.has(i) || usedC.has(j)) continue; usedD.add(i); usedC.add(j); total += g; assign[i] = j; }
  return { total: total - 0.5 * (shift / o.sigCompass) ** 2, assign };
}

/* Returns the compass correction that fits best, and for each seen ship the likely AIS ships. */
function match(dets, ships, face, fov, opts = {}) {
  const o = { sigA: 0.6, sigS: 0.45, typePenalty: 1.5, cap: 9, sigCompass: 10, maxShift: 25, step: 0.2, usePattern: true, sureP: 0.7, sureClear: 0.15, ...opts };
  const cands = candidates(ships, face, fov, o.maxShift);
  let best = { total: -Infinity, shift: 0 }, curve = [];
  if (o.usePattern) {
    for (let sh = -o.maxShift; sh <= o.maxShift + 1e-9; sh += o.step) { const r = scoreShift(dets, cands, sh, fov, o); curve.push([sh, r.total]); if (r.total > best.total) best = { ...r, shift: sh }; }
  } else best = { ...scoreShift(dets, cands, 0, fov, o), shift: 0 };
  // is there a second, different fit that is almost as good? then say so
  const rival = curve.filter(([sh]) => Math.abs(sh - best.shift) > 1.5).reduce((m, [, t]) => Math.max(m, t), -Infinity);
  const clear = best.total > 0 ? Math.max(0, Math.min(1, (best.total - Math.max(0, rival)) / best.total)) : 0;
  const out = dets.map((det, i) => {
    const list = cands.map((c) => ({ ship: c.s, cost: o.usePattern ? pairCost(det, c, best.shift, fov, o) : ((c.off - (det.x - 0.5) * fov) / o.sigA) ** 2 })).sort((a, b) => a.cost - b.cost).slice(0, 4);
    const z = list.reduce((a, c) => a + Math.exp(-c.cost / 2), 0) || 1;
    list.forEach((c) => { c.p = Math.exp(-c.cost / 2) / z; });
    const top = list[0];
    const ok = top && top.cost < o.cap;
    // sure = this ship clearly beats the other candidates, and this fit clearly beats the next best fit
    return { det, top: ok ? top.ship : null, p: top ? top.p * (o.usePattern ? 0.5 + 0.5 * clear : 1) : 0, sure: !!ok && top.p >= o.sureP && (!o.usePattern || clear >= o.sureClear), options: list };
  });
  return { shift: best.shift, clear, score: best.total, results: out, curve, nCands: cands.length };
}

/* Test double for the vision model: what it would report for a view, with misses and noise.
   Used for the sample view and for the simulation. A real photo goes to api/detect.js instead. */
function simulateDetections(ships, trueFace, fov, rng, n = {}) {
  const N = { xNoise: 0.003, wNoise: 0.2, typeErr: 0.25, miss: 0.1, minDeg: 0.35, hideFrac: 0.6, ...n };
  const gauss = () => { let u = 0, v = 0; while (!u) u = rng(); v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const inFrame = ships.map((s) => ({ s, off: angDiff(s.b, trueFace), w: angWidth(s) })).filter((c) => Math.abs(c.off) <= fov / 2).sort((a, b) => a.s.d - b.s.d);
  const cover = [], dets = [];
  for (const c of inFrame) {
    const a = c.off - c.w / 2, b = c.off + c.w / 2; let hidden = 0;
    for (const [x0, x1] of cover) hidden += Math.max(0, Math.min(b, x1) - Math.max(a, x0));
    cover.push([a, b]);
    if (hidden / c.w > N.hideFrac || c.w < N.minDeg || rng() < N.miss) continue;
    const kinds = ['tanker', 'cargo'];
    const seen = rng() < N.typeErr ? kinds[Math.floor(rng() * 2)] : KIND[c.s.type];
    dets.push({ x: 0.5 + c.off / fov + gauss() * N.xNoise, w: (c.w / fov) * Math.exp(gauss() * N.wNoise), type: seen, trueId: c.s.id });
  }
  return dets.sort((a, b) => a.x - b.x);
}
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

return { RAD, angDiff, fore, angWidth, candidates, match, simulateDetections, mulberry };
})();
const spotEl=document.getElementById('spot'), spotCv=document.getElementById('spotCv'), spotMsg=document.getElementById('spotMsg'), spotTag=document.getElementById('spotTag');
let SP=null; const SPOT_FOV=25;
const spotShips=()=>VIEW.filter(v=>v.visible).map(v=>({...v.sh,b:v.b,d:v.d,hd:v.hd}));
const spotEase=u=>{ u=Math.max(0,Math.min(1,u)); return u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2; };
function spotOpen(tag){ spotEl.hidden=false; spotTag.textContent=tag; state.spot=true; state.hover=null; document.getElementById('hzhint').classList.add('gone'); }
function spotClose(){ if(SP&&SP.stream) SP.stream.getTracks().forEach(t=>t.stop()); SP=null; state.spot=false; spotEl.hidden=true; { const f0=FOV, f1=zoomBase()/state.zoom; tween(1,0,500,k=>{ FOV=f1+(f0-f1)*k; state.spotK=k; }); } spotEl.classList.remove('cam'); lastChips=''; }
function spotSay(html){ if(spotMsg._h!==html){ spotMsg._h=html; spotMsg.innerHTML=html; } }
function spotDemo(off=8){
  if(SP) return; if(state.zoom!==1){ setZoom(1); setTimeout(()=>spotDemo(off),700); return; }
  if(Math.abs(FOV-SPOT_FOV)>.5){ const f0=FOV; tween(0,1,500,k=>{ FOV=f0+(SPOT_FOV-f0)*k; state.spotK=k; }); setTimeout(()=>spotDemo(off),650); return; }   // a phone at about 2.5x zoom
  frame(); const ships=spotShips(), trueFace=state.face, fov=FOV;
  const dets=SPOT.simulateDetections(ships,trueFace,fov,SPOT.mulberry(3)).filter(d=>HL.some(o=>o.sh.id===d.trueId));
  spotOpen('Demo · this view stands in for your photo');
  if(dets.length<2){ spotSay('Not enough ships this way. Close, drag to a busier part of the sea, and try again.'); SP={idle:true}; return; }
  const compass=(trueFace+off+360)%360, M=SPOT.match(dets,ships,compass,fov), n=dets.length;
  const gap=Math.min(.32,2.4/n), tB=1.1+n*gap+.8, tS=tB+1.3, tL=tS+2.3;
  SP={t0:performance.now(),dets,M,trueFace,compass,fov,ships,n,gap,tB,tS,tL,picked:false,prevSel:state.sel}; state.sel=null;
  requestAnimationFrame(spotTick);
}
function spotTick(){
  if(!SP||SP.idle||SP.cam) return;
  const {c:x,W,H}=setupCanvas(spotCv), u=(performance.now()-SP.t0)/1000, {dets,M,n,gap,tB,tS,tL,fov}=SP, ppd=W/fov;
  x.clearRect(0,0,W,H);
  const fitFace=(SP.compass+M.shift+360)%360, locked=u>=tL;
  let face=SP.compass;
  if(u>=tS){ const k=(u-tS)/(tL-tS), keys=[[0,SP.compass],[.28,SP.compass+7],[.7,fitFace-7],[1,fitFace]]; for(let i=0;i<3;i++) if(k>=keys[i][0]) face=keys[i][1]+(keys[i+1][1]-keys[i][1])*spotEase((k-keys[i][0])/(keys[i+1][0]-keys[i][0])); if(k>=1) face=fitFace; }
  // boxes on the ships the vision step found
  const shown=Math.max(0,Math.min(n,Math.floor((u-1.1)/gap)+1)), boxes=[];
  dets.forEach((d,i)=>{ const o=HL.find(o=>o.sh.id===d.trueId); if(!o||i>=shown) return; const r=M.results[i], sure=r.sure, hero=SP.hero&&r.top&&r.top.id===SP.hero;
    const b={x:o.X,x0:o.X-o.Lpx/2-5,y0:o.top-7,w:o.Lpx+10,h:o.y-o.top+13,r,sure,hero}; boxes.push(b);
    x.strokeStyle=hero?ACC:(locked?'#0D1B2A':'#fff'); x.lineWidth=hero?2.5:1.75; x.beginPath(); x.roundRect(b.x0,b.y0,b.w,b.h,5); x.stroke();
    if(u>=tB){ x.setLineDash(locked?[]:[4,5]); x.strokeStyle=locked?(sure?ACC:'#8795A3'):'rgba(13,27,42,.45)'; x.lineWidth=locked?1.75:1; x.beginPath(); x.moveTo(b.x,b.y0+b.h); x.lineTo(b.x,H-74); x.stroke(); x.setLineDash([]); } });
  // the radio strip: where AIS says each ship should be, for the bearing being tried
  if(u>=tB){ const a=spotEase((u-tB)/.5); x.save(); x.globalAlpha=a; x.fillStyle='rgba(255,255,255,.94)'; x.fillRect(0,H-74,W,74); x.strokeStyle='rgba(13,27,42,.25)'; x.beginPath(); x.moveTo(0,H-74); x.lineTo(W,H-74); x.stroke();
    x.font='600 10px "IBM Plex Mono", monospace'; x.fillStyle='#556576'; x.textAlign='left'; x.fillText('SHIP RADIO (AIS) · WHERE EACH SHIP SHOULD BE AT '+Math.round(face)+'°',10,H-60);
    const list=SP.ships.map(s=>({s,off:SPOT.angDiff(s.b,face),w:SPOT.angWidth(s)})).filter(v=>Math.abs(v.off)<fov/2+3).sort((p,q)=>p.off-q.off);
    const ends=[-9,-9]; if(locked) list.sort((p,q)=>M.results.some(r=>r.top&&r.top.id===q.s.id)-M.results.some(r=>r.top&&r.top.id===p.s.id)||p.off-q.off);
    list.forEach((v,i)=>{ const X=W/2+v.off*ppd, w=Math.max(6,v.w*ppd), hit=locked&&M.results.some(r=>r.top&&r.top.id===v.s.id);
      x.fillStyle=hit?ACC:'#8FA1B3'; x.beginPath(); x.roundRect(X-w/2,H-52,w,12,3); x.fill(); x.strokeStyle='#fff'; x.lineWidth=1.5; x.stroke();
      x.font='600 10px "IBM Plex Mono", monospace'; const tw=x.measureText(v.s.name).width, lx=Math.max(4,Math.min(W-tw-4,X-tw/2)), row=[0,1].find(r=>lx>ends[r]+8);
      if(row!=null&&(hit||!locked)){ ends[row]=lx+tw; x.textAlign='left'; x.fillStyle=hit?ACC:'#556576'; x.fillText(v.s.name,lx,H-28+row*13); } });
    x.restore(); }
  // names, once the pattern fits
  if(locked){ const a=spotEase((u-tL)/.4); x.save(); x.globalAlpha=a; const rows=[];
    boxes.forEach((b,i)=>{ const name=b.r.top?b.r.top.name+(b.sure?'':' ?'):'no match'; x.font='600 12px "IBM Plex Mono", monospace'; const w=x.measureText(name).width+14, lx=Math.max(4,Math.min(W-w-4,b.x-w/2)); let ly=b.y0-30; while(rows.some(r=>lx<r[1]+4&&lx+w>r[0]-4&&Math.abs(ly-r[2])<24)) ly-=26; rows.push([lx,lx+w,ly]);
      x.strokeStyle=b.hero?ACC:'rgba(13,27,42,.35)'; x.lineWidth=1; x.beginPath(); x.moveTo(b.x,ly+22); x.lineTo(b.x,b.y0); x.stroke();
      x.fillStyle=b.hero?ACC:(b.sure?'#fff':'rgba(255,255,255,.8)'); x.strokeStyle='rgba(13,27,42,.15)'; x.beginPath(); x.roundRect(lx,ly,w,22,5); x.fill(); x.stroke();
      x.fillStyle=b.hero?'#fff':(b.sure?'#0D1B2A':'#556576'); x.textAlign='left'; x.fillText(name,lx+7,ly+15); });
    x.restore(); }
  if(u<.45){ x.fillStyle=`rgba(255,255,255,${.9*(1-u/.45)})`; x.fillRect(0,0,W,H); }
  // words
  const fit=(()=>{ let b=M.curve[0]; const sh=SPOT.angDiff(face,SP.compass); for(const p of M.curve) if(Math.abs(p[0]-sh)<Math.abs(b[0]-sh)) b=p; return Math.round(100*Math.max(0,b[1])/Math.max(1e-9,M.score)); })();
  const d8=Math.abs(Math.round(M.shift));
  if(u<1.1) spotSay(`Photo taken. Compass says <b>${Math.round(SP.compass)}°</b>.`);
  else if(u<tB) spotSay(`Vision model: <b>${shown}</b> ship${shown===1?'':'s'} found. No names yet.`);
  else if(u<tS) spotSay(`Compass says <b>${Math.round(SP.compass)}°</b>. The radio data does not line up.`);
  else if(!locked) spotSay(`Sliding the radio data. Trying <b>${Math.round(face)}°</b> · fit ${fit}%`);
  else if(!SP.picked) spotSay(`The pattern fits at <b>${Math.round(fitFace)}°</b>. Your compass was ${d8}° off.`);
  if(locked&&!SP.picked&&u>=tL+1.5){ SP.picked=true; const ok=M.results.filter(r=>r.sure).sort((a,b)=>Math.abs(a.det.x-.5)-Math.abs(b.det.x-.5))[0];
    if(ok){ SP.hero=ok.top.id; select(ok.top.id,false); spotSay(`That one is <b>${ok.top.name}</b>. <a href="#pick" id="spotGo">Where it's been ↓</a>`); const sh=ok.top;
      document.getElementById('spotGo').addEventListener('click',e=>{ e.preventDefault(); spotClose(); pickSeen=true; showJourney(DATA.cities[state.city].ships.find(s=>s.id===sh.id)); }); }
    else { if(SP.prevSel) select(SP.prevSel,false); spotSay('Not sure which ship that is. Two or more fit.'); } }
  requestAnimationFrame(spotTick);
}
/* camera mode: the phone gives the place and the bearing, the vision model finds the ships, the code above names them.
   It needs the ships as they are now (/api/live), so it does not run on the snapshot. */
let spotHeading=null;
function spotOri(e){ if(e.webkitCompassHeading!=null) spotHeading=e.webkitCompassHeading; else if(e.absolute&&e.alpha!=null) spotHeading=(360-e.alpha)%360; }
async function spotCamera(){
  spotOpen('Camera'); SP={cam:true};
  try{
    if(typeof DeviceOrientationEvent!=='undefined'&&DeviceOrientationEvent.requestPermission&&await DeviceOrientationEvent.requestPermission()!=='granted') throw new Error('Compass access was not allowed.');
    addEventListener('deviceorientationabsolute',spotOri,true); addEventListener('deviceorientation',spotOri,true);
    spotSay('Finding where you stand…');
    const pos=await new Promise((ok,no)=>navigator.geolocation.getCurrentPosition(ok,()=>no(new Error('Location access was not allowed.')),{enableHighAccuracy:true,timeout:15000}));
    const me=[pos.coords.longitude,pos.coords.latitude], near=CITY_ORDER.map(k=>({k,d:nmBetween(DATA.cities[k].you,me)})).sort((a,b)=>a.d-b.d)[0];
    if(near.d>3) throw new Error(`This works at the four shores on this page. You are about ${Math.round(near.d).toLocaleString('en-GB')} nm from the nearest one (${DATA.cities[near.k].spot}).`);
    if(near.k!==state.city) setCity(near.k);
    if(!await loadLive(near.k)) throw new Error('Live ship data is not available right now. Try again in a minute.');
    const vid=document.getElementById('spotVid'); SP.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false}); vid.srcObject=SP.stream; await vid.play(); spotEl.classList.add('cam');
    spotSay('Point at the ships. <a href="#" id="spotSnap">Take photo</a>');
    document.getElementById('spotSnap').addEventListener('click',async e=>{ e.preventDefault();
      try{
        const k=Math.min(1,1600/vid.videoWidth), cv=document.createElement('canvas'); cv.width=vid.videoWidth*k; cv.height=vid.videoHeight*k; cv.getContext('2d').drawImage(vid,0,0,cv.width,cv.height); vid.pause();
        const face=spotHeading==null?state.face:spotHeading, fov=cv.width>=cv.height?65:40;      // a phone's main camera, landscape or portrait
        spotSay('Finding the ships in the photo…');
        const r=await fetch('/api/detect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({image:cv.toDataURL('image/jpeg',.85)})}); if(!r.ok) throw new Error('The vision step is not connected yet.');
        const dets=(await r.json()).ships||[]; if(!dets.length) throw new Error('No ships found in the photo. Try again with the horizon in the middle.');
        const ships=LIVE[state.city].ships.filter(s=>s.len).map(s=>({id:state.city+s.mmsi,name:s.name||'MMSI '+s.mmsi,type:liveType(s),len:s.len,b:bearing(me,[s.lon,s.lat]),d:nmBetween(me,[s.lon,s.lat]),hd:s.hdg!=null?s.hdg:(s.cog||0)})).filter(s=>s.d<=14);
        const M=SPOT.match(dets,ships,face,fov), ok=M.results.filter(r=>r.sure).sort((a,b)=>Math.abs(a.det.x-.5)-Math.abs(b.det.x-.5))[0];
        if(!ok){ spotSay(`${dets.length} ship${dets.length===1?'':'s'} in the photo. Not sure which is which. Try again with more ships in the photo.`); return; }
        const sh=DATA.cities[state.city].ships.find(s=>s.id===ok.top.id);
        if(!sh){ spotSay(`That one is <b>${ok.top.name}</b>. ${ok.top.len} m, ${ok.top.d.toFixed(1)} nm from you. Its port history is not on this page yet.`); return; }
        spotClose(); state.face=(face+M.shift+360)%360; select(sh.id,true); pickSeen=true; showJourney(sh);
      }catch(e2){ spotSay((e2&&e2.message)||'That did not work. Try again.'); } });
  }catch(e){ spotSay((e&&e.message)||'Camera mode did not start.'); }
}
function spotAsk(){ spotOpen(''); SP={idle:true}; spotSay('<a href="#" id="spotCamGo" style="margin-left:0">Use my camera</a> <a href="#" id="spotDemoGo">Show me a demo</a>');
  document.getElementById('spotCamGo').addEventListener('click',e=>{ e.preventDefault(); spotClose(); spotCamera(); });
  document.getElementById('spotDemoGo').addEventListener('click',e=>{ e.preventDefault(); spotClose(); spotDemo(); }); }
document.getElementById('spotBtn').addEventListener('click',()=>{ if(SP) spotClose(); else spotAsk(); });
document.getElementById('spotX').addEventListener('click',()=>{ const p=SP&&SP.prevSel, had=SP&&SP.picked; spotClose(); if(p&&!had) select(p,false); });
