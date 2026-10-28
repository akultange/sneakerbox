// Render the 1200x630 share image from the live wall. Usage: node tools/og.js <url> <out.jpg>
const puppeteer = require('puppeteer-core');
const m = require('@sparticuz/chromium'); const chromium = m.default || m;
const [url = 'http://127.0.0.1:8765/', out = 'assets/img/og.png'] = process.argv.slice(2);
(async () => {
  const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
  const p = await b.newPage();
  await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await p.goto(url, { waitUntil: 'networkidle0' });
  await p.addStyleTag({ content: '#hint,#count,.filters,#lang,#msg-top{display:none!important} .intro{padding-bottom:48px!important} .intro h1{font-size:76px!important;margin:0!important}' });
  await new Promise(r => setTimeout(r, 2500));
  // light the third pair in the top row, away from the headline
  const c = await p.evaluate(() => { const r = window.__sb.cellRect(3); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; });
  await p.mouse.move(c.x - 120, c.y + 30); await new Promise(r => setTimeout(r, 60));
  await p.mouse.move(c.x, c.y, { steps: 10 }); await new Promise(r => setTimeout(r, 1200));
  await p.screenshot({ path: out });
  await b.close();
})();
