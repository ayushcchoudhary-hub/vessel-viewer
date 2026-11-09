import asyncio, os, shutil, json, sys
from playwright.async_api import async_playwright
FPS=30
async def main():
    shutil.rmtree('frames',ignore_errors=True); os.makedirs('frames')
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1600,'height':1100})
        await pg.goto('file://'+os.path.abspath('scene.html')+''); await pg.evaluate("ready()"); await pg.wait_for_timeout(300)
        total=await pg.evaluate("TOTAL"); json.dump(await pg.evaluate("TIMELINE"),open('timeline.json','w'),indent=1)
        n=int(total*FPS)
        only=[int(x) for x in sys.argv[1:]]
        for f in (only or range(n)):
            await pg.evaluate(f"render({f/FPS})"); await pg.screenshot(path=f'frames/{f:05d}.png')
        print('frames',n,'total',round(total,2)); await b.close()
asyncio.run(main())
