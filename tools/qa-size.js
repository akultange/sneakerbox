// Size filter checks. Usage: node tools/qa-size.js <url> <outdir>
const puppeteer = require('puppeteer-core');
const m = require('@sparticuz/chromium'); const chromium = m.default || m;
const [url = 'http://127.0.0.1:8765/', out = 'qa'] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// a tap with its own timestamps (80 ms apart): this software renderer can take most of a
// second per frame, which would otherwise make a tap look like a long press
const tapAt = async (p, x, y) => {
  const c = await p.target().createCDPSession(), t = Date.now() / 1000;
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }], timestamp: t });
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: t + 0.08 });
  await c.detach();
};
const res = []; const ok = (n, p, i = '') => res.push(`${p ? 'PASS' : 'FAIL'}  ${n}${i ? '  ' + i : ''}`);
(async () => {
  const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
  const errors = [];
  const p = await b.newPage();
  p.on('pageerror', e => errors.push(e.message));
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto(url, { waitUntil: 'networkidle0' }); await p.keyboard.press('Shift');
  await p.waitForFunction(() => window.__sb && window.__sb.introDone, { timeout: 15000 }); await sleep(800);
  await p.tap('#size-chip'); await sleep(400);
  const pop = await p.evaluate(() => ({ open: document.querySelector('#size-pop').classList.contains('open'), n: document.querySelectorAll('#size-grid .size').length, disabled: [...document.querySelectorAll('#size-grid .size:disabled')].map(b => b.textContent), exp: document.querySelector('#size-chip').getAttribute('aria-expanded') }));
  ok('size chip opens the size grid', pop.open && pop.n >= 10 && pop.exp === 'true', JSON.stringify(pop));
  await p.screenshot({ path: `${out}/size-pop.png` });
  const btn = await p.$$('#size-grid .size'); 
  const idx = await p.evaluate(() => [...document.querySelectorAll('#size-grid .size')].findIndex(b => b.textContent === '40'));
  await btn[idx].tap(); await sleep(900);
  const st = await p.evaluate(() => {
    const { S, L } = window.__sb; const cat = JSON.parse(document.querySelector('#catalog').textContent);
    const pairs = new Map(cat.pairs.map(p => [p.id, p]));
    let litOk = true, lit = 0;
    const { layerOf } = window.__sb;
    for (let i = 0; i < L.count; i++) {
      const pr = pairs.get(cat.photos[layerOf(i)].pair);
      const has = pr.sizes.includes(40) && !pr.soldOut.includes(40);
      if ((S.filtT[i] === 1) !== has) litOk = false;
      if (S.filtT[i] === 1) lit++;
    }
    return { closed: !document.querySelector('#size-pop').classList.contains('open'), chip: document.querySelector('#size-chip').textContent, count: document.querySelector('#count').textContent, litOk, lit, of: L.count };
  });
  ok('size 40 lights exactly the pairs with 40 in stock', st.closed && st.litOk && /40/.test(st.chip), JSON.stringify(st));
  await sleep(400);
  await p.screenshot({ path: `${out}/size-40.png` });
  // open a lit pair: size 40 is already picked, order link carries it
  const cell = await p.evaluate(() => { const { S, L, cellRect } = window.__sb; for (let i = 0; i < L.count; i++) if (S.filtT[i] === 1) { const r = cellRect(i); if (r.y > 70 && r.y + r.h < 600) return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; } return null; });
  await tapAt(p, cell.x, cell.y);
  await p.waitForFunction(() => document.querySelector('#sheet').classList.contains('open'), { timeout: 6000 }).catch(() => {}); await sleep(300);
  const sh = await p.evaluate(() => ({ title: document.querySelector('#sheet-title').textContent, picked: document.querySelector('#sizes .size[aria-pressed="true"]')?.textContent, href: decodeURIComponent(document.querySelector('#order').href) }));
  ok('opened pair has size 40 pre-picked', sh.picked === '40' && /40/.test(sh.href), JSON.stringify(sh));
  await p.screenshot({ path: `${out}/size-40-sheet.png` });
  await p.goBack();
  await p.waitForFunction(() => !document.querySelector('#sheet').classList.contains('open'), { timeout: 6000 }).catch(() => {}); await sleep(200);
  // clear + Escape
  await p.tap('#size-chip'); await sleep(300);
  await p.keyboard.press('Escape'); await sleep(300);
  ok('Escape closes the size grid', await p.evaluate(() => !document.querySelector('#size-pop').classList.contains('open')));
  await p.tap('#size-chip'); await sleep(300);
  await p.tap('#size-clear'); await sleep(500);
  const cl = await p.evaluate(() => ({ size: window.__sb.S.size, chip: document.querySelector('#size-chip').textContent, lit: [...window.__sb.S.filtT].filter(v => v === 1).length }));
  ok('all sizes clears the filter', cl.size === null && cl.lit === 0, JSON.stringify(cl));
  // English
  await p.tap('#lang'); await sleep(300);
  ok('size chip in English', await p.evaluate(() => document.querySelector('#size-chip').textContent === 'Size'));
  ok('no page errors', errors.length === 0, errors.join(' | '));
  await b.close();
  console.log(res.join('\n'));
})().catch(e => { console.error('FAILED', e); process.exit(1); });
