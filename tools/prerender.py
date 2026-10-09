"""Bake the landing page's first render into index.html so crawlers that don't run JavaScript see the content.

Run after editing the view() template in index.html:
    python3 tools/prerender.py
Needs Playwright with Chromium. The page's own script replaces this markup on load, so visitors see no difference.
"""
import asyncio, pathlib, re, sys
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = ROOT / 'index.html'
START, END = '<!--PRERENDER-->', '<!--/PRERENDER-->'

async def main():
    src = PAGE.read_text(encoding='utf-8')
    if START not in src or END not in src:
        sys.exit('Markers not found in index.html')
    clean = re.sub(re.escape(START) + r'.*?' + re.escape(END), START + END, src, flags=re.S)
    PAGE.write_text(clean, encoding='utf-8')
    async with async_playwright() as p:
        kw = {}
        exe = pathlib.Path('/opt/pw-browsers/chromium')
        if exe.exists(): kw['executable_path'] = str(exe)
        b = await p.chromium.launch(**kw)
        pg = await b.new_page(viewport={'width': 1280, 'height': 900})
        await pg.route('**/fonts.g*/**', lambda r: r.abort())
        await pg.goto(PAGE.as_uri()); await pg.wait_for_timeout(500)
        html = await pg.evaluate("document.getElementById('app').innerHTML")
        await b.close()
    html = html.replace(START, '').replace(END, '').strip()
    PAGE.write_text(clean.replace(START + END, START + '\n' + html + '\n' + END), encoding='utf-8')
    print('prerendered', len(html), 'chars')

asyncio.run(main())
