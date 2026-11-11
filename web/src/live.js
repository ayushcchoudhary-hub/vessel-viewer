
/* ---------- live positions ----------
   The page is built with a full snapshot (port calls, routes). On load it asks /api/live for the ships as they are now,
   moves the ships it knows, drops the ones that left, and adds the big ones that arrived. If the call fails, the snapshot stays. */
const LIVE={};
const liveType=s=>{ const n=(s.name||'').toUpperCase(), t=s.type; if(/LNG|LPG|GAS/.test(n)) return 'lng'; if(t>=60&&t<=69) return 'passenger'; if(t>=80&&t<=89) return 'tanker';
  if(t>=70&&t<=79) return /BULK|\bORE\b|CAPE|COAL|GRAIN/.test(n)?'bulk':/MSC|MAERSK|CMA CGM|COSCO|OOCL|^EVER |EXPRESS|^KOTA|WAN HAI/.test(n)?'container':'cargo'; return 'other'; };
const liveStatus=s=>(s.sog||0)>=1?'Underway':s.nav===1?'At anchor':s.nav===5?'Moored':'Stopped';
function setBadge(id){ const L=LIVE[id], f={timeZone:TZ[id],hour:'2-digit',minute:'2-digit'};
  document.getElementById('liveBadge').innerHTML=L?`<i></i>LIVE · ${new Date(L.at).toLocaleString('en-GB',f)} local`:`<i></i>SNAPSHOT · ${CAPTURED.toLocaleString('en-GB',{...f,day:'numeric',month:'short'})} local`; }
function applyLive(id){
  const L=LIVE[id], c=DATA.cities[id]; if(!L) return;
  if(!c._built) c._built=c.ships;                                   // the ship list from the last full build
  const by=new Map(L.ships.map(s=>[s.mmsi,s])), known=new Set(c._built.map(s=>s.mmsi)), cap=c._built.length;
  const keep=c._built.filter(sh=>by.has(sh.mmsi));
  for(const sh of keep){ const s=by.get(sh.mmsi); sh.a=[s.lon,s.lat]; sh.b=null; sh.track=null; sh._segs=null; sh.cog=s.cog; sh.hdg=s.hdg; sh.kn=s.sog||0; sh.status=liveStatus(s); }
  const fresh=L.ships.filter(s=>!known.has(s.mmsi)&&s.name&&(s.len||0)>=100&&nmBetween(c.you,[s.lon,s.lat])<=12).sort((a,b)=>b.len-a.len).slice(0,Math.max(0,cap-keep.length))
    .map(s=>({id:id+s.mmsi,mmsi:s.mmsi,imo:null,name:s.name,type:liveType(s),ais_type:s.type,flag:null,built:null,len:s.len,beam:s.beam,status:liveStatus(s),kn:s.sog||0,a:[s.lon,s.lat],b:null,track:null,cog:s.cog,hdg:s.hdg,
      calls:[],here:null,typeGuess:true,next:null,dest_raw:s.dest,legs:[],real:true,liveOnly:true}));
  c.ships=keep.concat(fresh); lastStats=''; lastChips='';
}
async function loadLive(id){
  try{ const r=await fetch('/api/live?area='+id); if(!r.ok) return false; const j=await r.json();
    if(!j.ships||!j.ships.length||!j.at||Date.now()-new Date(j.at).getTime()>20*60000) return false;   // the recorder is behind: keep the snapshot
    LIVE[id]=j; applyLive(id);
    if(state.city===id){ setBadge(id); frame(); if(!DATA.cities[id].ships.some(s=>s.id===state.sel)){ const v=[...VIEW].filter(v=>v.visible).sort((a,b)=>(b.sh.calls.length>0)-(a.sh.calls.length>0)||(b.sh.len||0)/(1+b.d)-(a.sh.len||0)/(1+a.d))[0]; if(v) select(v.sh.id,false); } }
    return true; }catch(e){ return false; }
}
