// Capture the pair window opening, then switching to a related pair. Usage: node tools/window-frames.js <url> <outdir>
const puppeteer = require('puppeteer-core');
const m = require('@sparticuz/chromium'); const chromium = m.default || m;
const [url = 'http://127.0.0.1:8765/', out = 'qa'] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
  for (const d of [{ n: 'desk', vp: { width: 1920, height: 880 } }, { n: 'phone', vp: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true } }]) {
    const p = await b.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.setViewport(d.vp);
    await p.goto(url, { waitUntil: 'networkidle0' });
    await p.keyboard.press('Shift');
    await p.waitForFunction(() => window.__sb && window.__sb.introLanded, { timeout: 15000 });
    await sleep(1800);
    const c = await p.evaluate(() => { const { L, cells, HOLE, cellRect } = window.__sb; for (let i = 3; i < L.count; i++) if (cells[i] !== HOLE) { const r = cellRect(i); if (r.y > 70 && r.y + r.h < innerHeight - 260) return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; } });
    if (d.n === 'phone') await p.touchscreen.tap(c.x, c.y); else await p.mouse.click(c.x, c.y);
    for (const t of [90, 260, 520]) { await sleep(t === 90 ? 90 : t - 90); await p.screenshot({ path: `${out}/win-${d.n}-${t}.png` }); }
    await sleep(900);
    await p.screenshot({ path: `${out}/win-${d.n}-end.png` });
    const info = await p.evaluate(() => { const w = document.querySelector('#sheet-win').getBoundingClientRect(), det = document.querySelector('.details').getBoundingClientRect(), g = document.querySelector('.gallery').getBoundingClientRect(); return { open: document.querySelector('#sheet').classList.contains('open'), win: [w.x, w.y, w.width, w.height].map(Math.round), gallery: [g.x, g.y, g.width, g.height].map(Math.round), details: [det.x, det.y, det.width, det.height].map(Math.round), title: document.querySelector('#sheet-title').textContent, related: [...document.querySelectorAll('.rel span')].map(s => s.textContent), stock: document.querySelector('#size-picked').textContent }; });
    console.log(d.n, JSON.stringify(info), errs.join('|') || 'no errors');
    await p.evaluate(() => { const r = document.querySelector('.rel'); r.scrollIntoView({ block: 'center' }); });
    await sleep(300);
    const rr = await p.evaluate(() => { const r = document.querySelector('.rel').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.width / 2 }; });
    if (d.n === 'phone') await p.touchscreen.tap(rr.x, rr.y); else await p.mouse.click(rr.x, rr.y);
    await sleep(900);
    await p.screenshot({ path: `${out}/win-${d.n}-related.png` });
    console.log(d.n, 'after related:', await p.evaluate(() => document.querySelector('#sheet-title').textContent + ' ' + location.hash + ' open=' + document.querySelector('#sheet').classList.contains('open')));
    await p.close();
  }
  await b.close();
})();
