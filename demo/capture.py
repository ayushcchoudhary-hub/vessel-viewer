import asyncio, json
from playwright.async_api import async_playwright
URL='file://local.html'
async def box(pg, js): return await pg.evaluate(f"(()=>{{const r=({js}).getBoundingClientRect(); return [r.x,r.y,r.width,r.height];}})()")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1440,'height':990},device_scale_factor=2)
        await pg.goto(URL); await pg.wait_for_timeout(1500); meta={}
        # 1 horizon
        await pg.evaluate("window.scrollTo(0, document.getElementById('horizonPanel').getBoundingClientRect().top+scrollY-140)"); await pg.wait_for_timeout(700)
        meta['c1']={'ring':await box(pg,"document.getElementById('liveBadge')")}; await pg.screenshot(path='cap/c1.png')
        # 2 binoculars on the selected ship
        await pg.click('.zb[data-z="7"]'); await pg.wait_for_timeout(1300)
        meta['c2']={'ring':await pg.evaluate("(()=>{const o=HL.find(o=>o.sh.id===state.sel); const r=document.getElementById('hz').getBoundingClientRect(); return o&&o.lab?[r.x+o.lab[0],r.y+o.lab[1],o.lab[2],o.lab[3]]:[r.x+r.width/2-80,r.y+40,160,30];})()")}
        await pg.screenshot(path='cap/c2.png')
        await pg.click('.zb[data-z="1"]'); await pg.wait_for_timeout(700)
        # 3 whole area
        await pg.click('.czoom button[data-w="1"]'); await pg.wait_for_timeout(500)
        await pg.evaluate("window.scrollTo(0, document.querySelector('.below').getBoundingClientRect().top+scrollY-120)"); await pg.wait_for_timeout(500)
        meta['c3']={'ring':await box(pg,"document.getElementById('chartnote')")}; await pg.screenshot(path='cap/c3.png')
        # 4 journey frames
        await pg.click('#go'); await pg.wait_for_timeout(900)
        await pg.evaluate("window.scrollTo(0, document.getElementById('journey').getBoundingClientRect().top+scrollY-20)")
        for i,ms in enumerate([1500,1600,2600,2600,2600,2600]):
            await pg.wait_for_timeout(ms); await pg.screenshot(path=f'cap/c4_{i}.png')
        meta['c4']={'ring':await box(pg,"document.getElementById('steps')")}
        # 5 traffic
        await pg.evaluate("document.getElementById('traffic').scrollIntoView()"); await pg.evaluate("window.scrollBy(0,-20)"); await pg.wait_for_timeout(5200)
        meta['c5']={'ring':await box(pg,"document.getElementById('trLede')")}; await pg.screenshot(path='cap/c5.png')
        json.dump(meta,open('cap/meta.json','w')); print(meta); await b.close()
asyncio.run(main())
