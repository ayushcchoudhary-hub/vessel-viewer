function drawHorizon(c){
  const {c:x,W,H}=HZ, ppd=W/FOV, h=state.h;
  const yH=Math.max(H*.34, 40+3*34);
  const vis=VIEW.filter(v=>v.visible);
  const nearest=vis.length?Math.min(...vis.map(v=>v.d)):1;
  const dMin=Math.max(.4, Math.min(1.2, nearest*.7)), dMax=rangeNm(h), seaH=H-yH-22, zoom=zoomBase()/FOV;
  const fOf = dm => { const d=dm/1852; return Math.pow(Math.max(0,Math.min(1,1-Math.log(Math.max(d,dMin)/dMin)/Math.log(dMax/dMin))),.9); };
  const yOf = dm => yH + seaH*fOf(dm);
  const K = 1.5*Math.min(W*.6, 560)/(300*(seaH+30));
  const sizeAt = (len,yW) => len*(yW-yH+30)*K*zoom;
  const xOf = b => W/2 + angDiff(b,state.face)*ppd;
  const sky=x.createLinearGradient(0,0,0,yH); sky.addColorStop(0,'#F9FBFD'); sky.addColorStop(1,'#E6EEF6');
  x.fillStyle=sky; x.fillRect(0,0,W,yH);
  const sea=x.createLinearGradient(0,yH,0,H); sea.addColorStop(0,'#D3E1EE'); sea.addColorStop(1,'#B9CEE2');
  x.fillStyle=sea; x.fillRect(0,yH,W,H-yH);
  x.font='10px "IBM Plex Mono", monospace'; x.textAlign='right';
  for(const nm of [1,2,5,10]){ const y=yOf(nm*1852); if(y<yH+8||y>H-4) continue; x.strokeStyle='rgba(255,255,255,.55)'; x.setLineDash([2,6]); x.beginPath(); x.moveTo(0,y); x.lineTo(W,y); x.stroke(); x.setLineDash([]); x.lineWidth=3; x.strokeStyle='rgba(255,255,255,.8)'; x.strokeText(nm+' nm',W-8,y-4); x.lineWidth=1; x.fillStyle='rgba(13,27,42,.55)'; x.fillText(nm+' nm',W-8,y-4); }
  // land: real skyline from elevation data (angle above horizontal), hills drawn 3x taller than life
  const SKY=c.skyline, VEX=3, step=Math.max(.15, FOV/300);
  const skyAt=b=>{ const f=((b%360)+360)%360*2, i0=Math.floor(f)%720, i1=(i0+1)%720, u=f-Math.floor(f), a=SKY[i0], q=SKY[i1]; if(!a&&!q) return null; if(!a) return q; if(!q) return a; return [a[0]+(q[0]-a[0])*u, a[1]+(q[1]-a[1])*u]; };
  const samples=[];
  for(let i=-FOV/2-2;i<=FOV/2+2;i+=step){
    const b=(state.face+i+360)%360, L=c.landProfile[Math.round(b*2)%720], s=skyAt(b);
    if(L==null && !s){ samples.push(null); continue; }
    const near = L!=null && L<=1.0, base = yH+2;
    const ang = s ? s[0] : .03, dist = s ? s[1] : (L||10);
    const raw=Math.max(1.5, ang*ppd*VEX), cap=yH*.5, top = yH - cap*Math.tanh(raw/cap);
    samples.push({X:xOf(b), base, top:Math.min(top, base-2), far: dist>4 && !near});
  }
  for(const pass of [null]){
    let run=[];
    const flush=()=>{ if(run.length>1){
      const top=d3.line().x(s=>s.X).y(s=>s.top).curve(d3.curveBasis).context(x);
      const bot=d3.line().x(s=>s.X).y(s=>s.base).curve(d3.curveBasis).context(x);
      x.beginPath(); top(run); const rv=[...run].reverse(); x.lineTo(rv[0].X,rv[0].base); { const tmp=[]; bot.context({moveTo:(a,b)=>x.lineTo(a,b),lineTo:(a,b)=>x.lineTo(a,b),bezierCurveTo:(a,b,c2,d,e,f)=>x.bezierCurveTo(a,b,c2,d,e,f),closePath:()=>{}}); bot(rv); } x.closePath();
      const g=x.createLinearGradient(0,yH-yH*.5,0,yH); g.addColorStop(0,'#AEBCCA'); g.addColorStop(1,'#C9D4DF'); x.fillStyle=g; x.fill();
      x.beginPath(); top(run); x.strokeStyle='rgba(13,27,42,.25)'; x.lineWidth=1; x.stroke(); }
      run=[]; };
    for(const s of samples){ if(s) run.push(s); else flush(); }
    flush();
  }
  x.strokeStyle='rgba(13,27,42,.25)'; x.lineWidth=1; x.beginPath(); x.moveTo(0,yH); x.lineTo(W,yH); x.stroke();
  // compass
  x.fillStyle='#556576'; x.font='11px "IBM Plex Mono", monospace'; x.textAlign='center';
  const names={0:'N',45:'NE',90:'E',135:'SE',180:'S',225:'SW',270:'W',315:'NW'};
  const tick=FOV>40?5:(FOV>15?2:1), lab=FOV>40?15:(FOV>15?10:2);
  for(let bb=Math.floor((state.face-FOV/2)/tick)*tick; bb<=state.face+FOV/2; bb+=tick){
    const b=((bb%360)+360)%360, X=xOf(b); x.fillRect(X,0,1,b%45===0?10:5);
    if(X<16||X>W-16) continue;
    if(b%45===0) x.fillText(names[b],X,24); else if(b%lab===0) x.fillText(b+'°',X,22);
  }
  // ships far to near
  const vs=vis.filter(v=>Math.abs(angDiff(v.b,state.face))<=FOV/2+4).sort((a,b)=>(a.sh.id===state.sel?1:0)-(b.sh.id===state.sel?1:0)||b.d-a.d);
  HL.length=0;
  for(const v of vs){
    const dm=v.d*1852, X=xOf(v.b), yW=Math.min(H-6, yOf(dm));
    const fore=Math.max(.22, Math.abs(Math.sin((v.hd-v.b)*rad)));
    const Lpx=Math.min(W*.8, Math.max(8, sizeAt(v.sh.len||60,yW)*fore));
    const dir=Math.sin((v.hd-v.b)*rad)>=0?1:-1;
    const sel=state.sel===v.sh.id, fade=Math.min(.75, Math.max(state.sel&&!sel?.45:0, v.d/16));
    const cutPx=(v.hidden/(v.sh.len||60))*Lpx;
    if(v.sh.b && v.sh.kn>1.5){ const g=x.createLinearGradient(X-dir*Lpx*.5,0,X-dir*Lpx*.85,0); g.addColorStop(0,'rgba(255,255,255,.55)'); g.addColorStop(1,'rgba(255,255,255,0)'); x.strokeStyle=g; x.lineWidth=1.4; x.beginPath(); x.moveTo(X-dir*Lpx*.5,yW+1); x.lineTo(X-dir*Lpx*.85,yW+1); x.stroke(); }
    x.save(); x.beginPath(); x.rect(0,0,W,yW-cutPx); x.clip();
    drawSide(x,v.sh.type,X,yW,Lpx,dir,shipColors(fade,sel), sel?null:mix(TYPES[v.sh.type].c,'#E6EEF6',fade), v.sh.len);
    x.restore();
    HL.push({sh:v.sh,X,y:yW,top:yW-Math.max(4,Lpx*.2)+cutPx,Lpx,d:v.d});
  }
  // labels: selected + 5 nearest get boxes; the rest get a dot and a hover name
  const boxed=new Set([...HL].sort((a,b)=>a.d-b.d).slice(0,5).map(o=>o.sh.id)); if(state.sel) boxed.add(state.sel); if(state.hover) boxed.add(state.hover);
  const nRows=Math.max(2,Math.floor((yH-40)/34)), rows=Array.from({length:nRows},()=>[]);
  const order=[...HL].filter(o=>boxed.has(o.sh.id)).sort((a,b)=>(b.sh.id===state.sel)-(a.sh.id===state.sel)||(b.sh.id===state.hover)-(a.sh.id===state.hover)||a.d-b.d);
  const placed=[];
  x.textAlign='left';
  for(const o of order){
    const name=o.sh.name, sub=`${typeName(o.sh)} · ${o.sh.len||'?'} m · ${o.d.toFixed(1)} nm`;
    x.font='600 12px "IBM Plex Mono", monospace'; const w1=x.measureText(name).width; x.font='11px "IBM Plex Sans", sans-serif'; const w=Math.max(w1,x.measureText(sub).width)+16;
    const lx=Math.min(W-w-6, Math.max(6, o.X-w/2)); let r=-1;
    for(let i=0;i<nRows;i++){ if(rows[i].every(s=>lx+w<s[0]-6||lx>s[1]+6)){ rows[i].push([lx,lx+w]); r=i; break; } }
    if(r<0) continue; placed.push({o,lx,ly:36+r*34,w,sub});
  }
  for(const p of placed){ const sel=state.sel===p.o.sh.id; x.strokeStyle=sel?ACC:'rgba(13,27,42,.3)'; x.lineWidth=sel?1.5:1; x.beginPath(); x.moveTo(p.o.X,p.ly+28); x.lineTo(p.o.X,p.o.top-3); x.stroke(); }
  for(const o of HL){ if(!placed.some(p=>p.o===o)) o.lab=null; }
  for(const p of placed){
    const sel=state.sel===p.o.sh.id, hov=state.hover===p.o.sh.id;
    x.fillStyle=sel?ACC:(hov?'#0D1B2A':'rgba(255,255,255,.96)'); x.strokeStyle='rgba(13,27,42,.12)';
    x.beginPath(); x.roundRect(p.lx,p.ly-2,p.w,30,6); x.fill(); x.stroke();
    x.fillStyle=(sel||hov)?'#fff':'#0D1B2A'; x.font='600 12px "IBM Plex Mono", monospace'; x.fillText(p.o.sh.name,p.lx+8,p.ly+11);
    x.fillStyle=(sel||hov)?'rgba(255,255,255,.85)':'#556576'; x.font='11px "IBM Plex Sans", sans-serif'; x.fillText(p.sub,p.lx+8,p.ly+24);
    p.o.lab=[p.lx,p.ly-2,p.w,30];
  }
}
