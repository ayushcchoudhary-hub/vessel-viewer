import asyncio, json, time
from playwright.async_api import async_playwright
URL='file://'+__import__('os').path.abspath('../web/local.html')+''
SID='sg477913700'
top=lambda id: f"window.scrollTo({{top:document.getElementById('{id}').getBoundingClientRect().top+scrollY-70,behavior:'instant'}})"
ACTS=[(0,f"(()=>{{const v=VIEW.find(v=>v.sh.id==='{SID}'); state.face=(v.b-46+360)%360; turnTo(v.b-6,2400);}})()"),
      (2600,f"select('{SID}',false); setZoom(7);"),
      (5000,"setZoom(1); pickSeen=true; "+top('pick')),
      (7600,f"journey(DATA.cities.sg.ships.find(s=>s.id==='{SID}'),true)"),
      (19800,"TLS.seen=true; "+top('zoom')),
      (20400,"tlStart()"),
      (26800,top('how'))]
END=31000
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1440,'height':990},device_scale_factor=1.5); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.clock.install()
        await pg.goto(URL); await pg.wait_for_timeout(1500)
        await pg.add_style_tag(content="html{scroll-behavior:auto!important}#caption{display:none!important}")
        await pg.evaluate(top('look')); await pg.evaluate("setCity('sg')"); await pg.wait_for_timeout(800)
        await pg.clock.pause_at(await pg.evaluate('Date.now()')+100)
        await pg.clock.run_for(300)
        acts=list(ACTS); f=0; T=0; t0=time.time()
        while T<=END:
            while acts and acts[0][0]<=T: await pg.evaluate(acts.pop(0)[1])
            await pg.clock.run_for(33)
            await pg.screenshot(path=f'live/{f:05d}.jpg',type='jpeg',quality=88)
            f+=1; T=f*1000/30
            if f%150==0: print(f, round(time.time()-t0), flush=True)
        print('frames',f,errs); await b.close()
asyncio.run(main())
