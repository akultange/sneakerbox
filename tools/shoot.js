// Screenshot the built site in headless Chromium at phone and desktop sizes.
// Usage: node tools/shoot.js <url> <outdir>
const puppeteer = require('puppeteer-core');
const chromiumPkg = require('@sparticuz/chromium');
const chromium = chromiumPkg.default || chromiumPkg;
const fs = require('fs');

const url = process.argv[2] || 'http://127.0.0.1:8765/';
const out = process.argv[3] || 'shots';
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    headless: true,
  });
  const log = [];
  for (const dev of [
    { name: 'phone', width: 390, height: 844, dpr: 2, touch: true },
    { name: 'desktop', width: 1440, height: 900, dpr: 1, touch: false },
  ]) {
    const page = await browser.newPage();
    page.on('console', m => log.push(`[${dev.name}] ${m.type()}: ${m.text()}`));
    page.on('pageerror', e => log.push(`[${dev.name}] pageerror: ${e.message}`));
    const cdp0 = await page.target().createCDPSession();
    try { await cdp0.send('Emulation.setEmulatedMedia', { features: [{ name: 'hover', value: dev.touch ? 'none' : 'hover' }, { name: 'pointer', value: dev.touch ? 'coarse' : 'fine' }] }); } catch (e) { log.push(`[${dev.name}] media emulation: ${e.message}`); }
    await page.setViewport({ width: dev.width, height: dev.height, deviceScaleFactor: dev.dpr, isMobile: dev.touch, hasTouch: dev.touch });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.keyboard.press('Shift');
    await page.waitForFunction(() => window.__sb && window.__sb.introDone, { timeout: 15000 });
    await sleep(2500);
    const gl = await page.evaluate(() => document.documentElement.classList.contains('no-gl') ? 'fallback' : 'webgl');
    log.push(`[${dev.name}] mode: ${gl}`);
    await page.screenshot({ path: `${out}/${dev.name}-1-attract.png` });

    // light over a pair (mouse) or finger resting on it (touch)
    const c = await page.evaluate(() => { const { L, cells, HOLE, cellRect } = window.__sb; for (let i = L.cols; i < L.count; i++) if (cells[i] !== HOLE) { const r = cellRect(i); if (r.y > 70 && r.y + r.h < innerHeight - 220) return { x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2) }; } });
    const x = c.x, y = c.y;
    if (dev.touch) {
      const cdp = await page.target().createCDPSession();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await sleep(80);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 30, y: y + 10 }] });
      await sleep(500);
      await page.screenshot({ path: `${out}/${dev.name}-2-lit.png` });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await page.mouse.move(x - 200, y); await sleep(50);
      await page.mouse.move(x, y, { steps: 8 }); await sleep(600);
      await page.screenshot({ path: `${out}/${dev.name}-2-lit.png` });
    }

    // brand filter
    await page.evaluate(() => [...document.querySelectorAll('.chip')].find(c => c.dataset.brand === 'Nike')?.click());
    await sleep(700);
    await page.screenshot({ path: `${out}/${dev.name}-3-filter.png` });
    await page.evaluate(() => [...document.querySelectorAll('.chip')].find(c => c.dataset.brand === 'all')?.click());
    await sleep(300);

    // open a pair, choose a size
    if (dev.touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    await sleep(1400);
    await page.screenshot({ path: `${out}/${dev.name}-4-sheet.png` });
    const picked = await page.evaluate(() => { const b = document.querySelector('.size:not(:disabled)'); b && b.click(); return { size: b && b.textContent, href: document.querySelector('#order').href, title: document.querySelector('#sheet-title').textContent }; });
    log.push(`[${dev.name}] sheet: ${JSON.stringify(picked)}`);
    await sleep(200);
    await page.evaluate(() => document.querySelector('.details').scrollIntoView({ block: 'end' }));
    await sleep(200);
    await page.screenshot({ path: `${out}/${dev.name}-5-size.png` });
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(`${out}/log.txt`, log.join('\n'));
  console.log(log.join('\n'));
})().catch(e => { console.error('FAILED', e); process.exit(1); });
