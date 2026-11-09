/* ---------- 05 animated data flow ---------- */
const FLOWNAMES=Object.values(DATA.cities).flatMap(c=>c.ships.map(s=>s.name)).slice(0,200);
let FLOW=null;

function flowTick(now){
  if(FLOW && flowOn && !reduced){
    const F=FLOW; if(!F.next||now>F.next){ F.next=now+260; const i=(Math.random()*F.E.length)|0, src=F.E[i][0];
      const name=src==='gfw'?'port call':src==='hk'?'arrival':src==='geo'?'elevation tile':FLOWNAMES[(Math.random()*FLOWNAMES.length)|0]||'position';
      F.packets.push({i,s:now,d:1700+Math.random()*700,name,show:false}); }
    F.packets=F.packets.filter(p=>now-p.s<p.d);
    const sel=F.dots.selectAll('circle').data(F.packets,p=>p.s); sel.exit().remove();
    sel.enter().append('circle').attr('r',4).attr('fill',p=>p.i===0||p.i===1?'#EF4E14':'#0D1B2A').merge(sel).each(function(p){ const path=F.paths[p.i], L=path.getTotalLength(), pt=path.getPointAtLength(L*Math.min(1,(now-p.s)/p.d)); this.setAttribute('cx',pt.x); this.setAttribute('cy',pt.y); });
    const ls=F.lab.selectAll('text').data(F.packets.filter(p=>p.show&&(now-p.s)/p.d>.15&&(now-p.s)/p.d<.8),p=>p.s); ls.exit().remove();
    ls.enter().append('text').attr('font-family','IBM Plex Mono, monospace').attr('font-size',10).attr('fill','#556576').text(p=>p.name).merge(ls).each(function(p){ const path=F.paths[p.i], L=path.getTotalLength(), pt=path.getPointAtLength(L*Math.min(1,(now-p.s)/p.d)); this.setAttribute('x',pt.x+7); this.setAttribute('y',pt.y-7); });
  }
  requestAnimationFrame(flowTick);
}
let flowOn=false;
new IntersectionObserver(es=>{ flowOn=es.some(e=>e.isIntersecting); },{threshold:0}).observe(document.getElementById('flow'));
buildFlow(); requestAnimationFrame(flowTick);

