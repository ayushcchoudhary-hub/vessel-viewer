import asyncio, json
from playwright.async_api import async_playwright
URL='file://'+__import__('os').path.abspath('../web/local.html')+''
AR=1480/832
def cam(b,pad=24):
    x,y,w,h=b; x-=pad; y-=pad; w+=2*pad; h+=2*pad
    if w/h<AR: nw=h*AR; x-=(nw-w)/2; w=nw
    else: nh=w/AR; y-=(nh-h)/2; h=nh
    x=max(0,min(x,1440-w)) if w<=1440 else x; y=max(0,min(y,990-h)) if h<=990 else y
    return [round(v,1) for v in (x,y,w,h)]
async def box(pg, js): return await pg.evaluate(f"(()=>{{const r=({js}).getBoundingClientRect(); return [r.x,r.y,r.width,r.height];}})()")
async def top(pg, id, off=70): await pg.evaluate(f"window.scrollTo({{top:document.getElementById('{id}').getBoundingClientRect().top+scrollY-{off},behavior:'instant'}})")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1440,'height':990},device_scale_factor=2); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1500); M={}
        sid=await pg.evaluate("(()=>{const s=DATA.cities.sg.ships.find(s=>s.name==='ORE BRASIL'); return s?s.id:null})()"); print('ore',sid)
        await top(pg,'look'); await pg.wait_for_timeout(600)
        if sid: await pg.evaluate(f"select({json.dumps(sid)},true)"); await pg.wait_for_timeout(1500)
        M['shores']=await box(pg,"document.getElementById('shores')"); M['hz']=await box(pg,"document.getElementById('horizonPanel')")
        await pg.screenshot(path='cap6/a_sg.png')
        await pg.click('#shores button[data-c="hk"]'); await pg.wait_for_timeout(1500); await pg.screenshot(path='cap6/a_hk.png')
        await pg.click('#shores button[data-c="sg"]'); await pg.wait_for_timeout(600)
        if sid: await pg.evaluate(f"select({json.dumps(sid)},true)"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='cap6/b_sg.png')
        M['sel']=await pg.evaluate("(()=>{const s=DATA.cities.sg.ships.find(s=>s.id===state.sel); return [s.name,s.len,s.type,s.typeGuess,s.calls.map(c=>c.port)]})()")
        await top(pg,'pick'); 
        for i,ms in enumerate([500,1400,1500,1500,1500,1500,1500,1500]):
            await pg.wait_for_timeout(ms); await pg.screenshot(path=f'cap6/c_{i}.png')
        M['ticket']=await box(pg,"document.getElementById('ticket')"); M['ttype']=await box(pg,"document.querySelector('#ticket .t-type')")
        M['globe']=await box(pg,"document.getElementById('globeWrap').closest('.frame')"); M['steps']=await box(pg,"document.getElementById('steps')"); M['pick']=await box(pg,"document.querySelector('.pick')")
        M['jdate']=[await pg.inner_text('#jdate')]
        await top(pg,'zoom')
        for i,ms in enumerate([1200,2200,2200,2200]):
            await pg.wait_for_timeout(ms); await pg.screenshot(path=f'cap6/d_{i}.png')
        M['tl']=await box(pg,"document.getElementById('tlWrap').closest('.frame')"); M['zsub']=await box(pg,"document.getElementById('zoomSub')"); M['zoomout']=await box(pg,"document.querySelector('.zoomout')")
        M['zsubtxt']=[await pg.inner_text('#zoomSub'), await pg.inner_text('#tlCount')]
        await top(pg,'how'); await pg.wait_for_timeout(2600); await pg.screenshot(path='cap6/e_0.png'); await pg.wait_for_timeout(900); await pg.screenshot(path='cap6/e_1.png')
        M['flow']=await box(pg,"document.getElementById('flow')")
        M['src']=await pg.evaluate("(()=>{let x0=1e9,y0=1e9,x1=0,y1=0,names=[];document.querySelectorAll('#flow svg g').forEach(g=>{const t=g.querySelector('text'); if(!t) return; if(/AIS|Fishing|Marine|Terrain/.test(t.textContent)){names.push(t.textContent);const r=g.getBoundingClientRect(); if(r.width>600) return; x0=Math.min(x0,r.x);y0=Math.min(y0,r.y);x1=Math.max(x1,r.right);y1=Math.max(y1,r.bottom);}}); return [x0,y0,x1-x0,y1-y0,names]})()")
        C={'a':cam([M['hz'][0],M['shores'][1],M['hz'][2],M['hz'][1]+M['hz'][3]-M['shores'][1]],10),'ticket':cam(M['ticket'],60),'pick':cam(M['pick'],14),'globe':cam(M['globe'],30),'zoom':cam(M['zoomout'],14),'tl':cam(M['tl'],20),'flow':cam(M['flow'],16)}
        M['cam']=C; json.dump(M,open('cap6/meta.json','w')); print(json.dumps(M)); print(errs); await b.close()
asyncio.run(main())
