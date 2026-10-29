// QA pass over shared behaviour. Usage: node tools/qa.js <url> <outdir>
const puppeteer = require('puppeteer-core');
const m = require('@sparticuz/chromium'); const chromium = m.default || m;
const fs = require('fs');
const [url = 'http://127.0.0.1:8765/', out = 'qa'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
// a tap with its own timestamps (80 ms apart): this software renderer can take most of a
// second per frame, which would otherwise make a tap look like a long press
const tapAt = async (p, x, y) => {
  const c = await p.target().createCDPSession(), t = Date.now() / 1000;
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }], timestamp: t });
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: t + 0.08 });
  await c.detach();
};
const results = [];
const ok = (name, pass, info = '') => results.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`);

(async () => {
  const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
  const errors = [];
  const page = async (opts = {}) => {
    const p = await b.newPage();
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    const phone = !opts.desktop;
    await p.setViewport(phone ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
    if (opts.reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    if (opts.noGL) await p.evaluateOnNewDocument(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : g.call(this, t, ...a); }; });
    if (opts.lang) await p.evaluateOnNewDocument(l => { try { localStorage.setItem('sb-lang', l); } catch {} }, opts.lang);
    await p.goto(opts.url || url, { waitUntil: 'networkidle0' });
    await sleep(400);
    await p.keyboard.press('Shift');                    // skips the intro when it is playing
    await p.waitForFunction(() => window.__sb && window.__sb.introDone, { timeout: 15000 });
    await sleep(800);
    return p;
  };
  const sheetOpen = p => p.evaluate(() => document.querySelector('#sheet').classList.contains('open'));
  // the software renderer here can take most of a second per frame: wait for the result, not a fixed time
  const until = (p, fn) => p.waitForFunction(fn, { timeout: 6000 }).catch(() => {});
  const closed = p => until(p, () => !document.querySelector('#sheet').classList.contains('open'));
  const opened = p => until(p, () => document.querySelector('#sheet').classList.contains('open'));

  // 1. English toggle on phone
  let p = await page();
  await p.click('#lang'); await sleep(300);
  const en = await p.evaluate(() => ({ lang: document.documentElement.lang, h1: document.querySelector('#wall-title').innerText.replace(/\n/g, ' | '), btn: document.querySelector('#lang').textContent, count: document.querySelector('#count').textContent, h1w: document.querySelector('#wall-title').scrollWidth, vw: innerWidth }));
  ok('lang toggle to English', en.lang === 'en' && /Real pairs/.test(en.h1), JSON.stringify(en));
  await p.screenshot({ path: `${out}/en-phone.png` });
  await p.reload({ waitUntil: 'networkidle0' }); await p.keyboard.press('Shift');
  await p.waitForFunction(() => window.__sb && window.__sb.introDone, { timeout: 15000 }); await sleep(600);
  ok('language remembered after reload', await p.evaluate(() => document.documentElement.lang === 'en'));
  await p.click('#lang'); await sleep(200);
  ok('toggle back to Georgian', await p.evaluate(() => document.documentElement.lang === 'ka'));

  // 2. Tap opens, back button closes
  const c = await p.evaluate(() => { const r = window.__sb.cellRect(window.__sb.L.cols); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; });
  await tapAt(p, c.x, c.y); await opened(p); await sleep(300);
  const h1 = await p.evaluate(() => location.hash);
  ok('tap opens sheet + hash', await sheetOpen(p), h1);
  await p.goBack(); await closed(p);
  ok('back button closes sheet', !(await sheetOpen(p)), await p.evaluate(() => location.hash || '(no hash)'));
  // order without size shakes hint, does not navigate
  await tapAt(p, c.x, c.y); await opened(p); await sleep(300);
  const before = p.url();
  await p.evaluate(() => document.querySelector('#order').click()); await sleep(300);
  ok('order without size stays on page', p.url() === before && await sheetOpen(p), await p.evaluate(() => document.querySelector('#order-hint').textContent));
  await p.close();

  // 3. Deep link + Escape on desktop
  p = await page({ desktop: true, url: url + '#palermo' });
  const t = await p.evaluate(() => document.querySelector('#sheet-title').textContent);
  ok('deep link #palermo opens Palermo', (await sheetOpen(p)) && t === 'Palermo', t);
  await sleep(500);
  await p.screenshot({ path: `${out}/desktop-sheet.png` });
  await p.keyboard.press('Escape'); await closed(p);
  ok('Escape closes sheet', !(await sheetOpen(p)));
  // focus trap: Tab cycles inside the sheet
  await p.evaluate(() => [...document.querySelectorAll('#pair-list button')][2].click()); await opened(p); await sleep(300);
  let inside = true;
  for (let i = 0; i < 25; i++) { await p.keyboard.press('Tab'); inside = inside && await p.evaluate(() => document.querySelector('#sheet').contains(document.activeElement)); }
  ok('keyboard focus stays in sheet (25 tabs)', inside);
  await p.keyboard.press('Escape'); await closed(p); await sleep(200);
  const after = await p.evaluate(() => ({ open: document.querySelector('#sheet').classList.contains('open'), hash: location.hash }));
  ok('deep link then another pair: closing stays closed', !after.open && after.hash === '', JSON.stringify(after));
  // below the wall
  await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await sleep(500);
  await p.screenshot({ path: `${out}/desktop-bottom.png` });
  await p.close();

  // 4. No WebGL fallback
  p = await page({ noGL: true });
  const fb = await p.evaluate(() => ({ cls: document.documentElement.className, n: document.querySelectorAll('#fallback button').length }));
  ok('no-WebGL fallback grid', /no-gl/.test(fb.cls) && fb.n > 0, JSON.stringify(fb));
  await p.screenshot({ path: `${out}/nogl-phone.png` });
  await p.evaluate(() => document.querySelector('#fallback button').click()); await opened(p);
  ok('fallback tile opens sheet', await sheetOpen(p));
  await p.close();

  // 5. A reduced-motion setting gets the same site: the light still drifts over the wall
  p = await page({ reduced: true });
  await sleep(1200);
  const L1 = await p.evaluate(() => ({ k: +window.__sb.S.k.toFixed(2), x: window.__sb.S.lx, y: window.__sb.S.ly }));
  await sleep(1500);
  const L2 = await p.evaluate(() => ({ k: +window.__sb.S.k.toFixed(2), x: window.__sb.S.lx, y: window.__sb.S.ly }));
  ok('reduced-motion setting: same light drift', L1.k > 0.5 && Math.abs(L1.x - L2.x) + Math.abs(L1.y - L2.y) > 2, JSON.stringify([L1, L2]));
  await p.screenshot({ path: `${out}/reduced-phone.png` });
  await p.close();

  // 6. Narrow phone 360
  p = await b.newPage();
  await p.setViewport({ width: 360, height: 740, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto(url, { waitUntil: 'networkidle0' }); await p.keyboard.press('Shift');
  await p.waitForFunction(() => window.__sb && window.__sb.introDone, { timeout: 15000 }); await sleep(800);
  const fit = await p.evaluate(() => [...document.querySelectorAll('#wall-title span')].map(s => Math.round(s.getBoundingClientRect().right)));
  ok('360px phone: headline fits', fit.every(r => r <= 360 - 8), JSON.stringify(fit));
  await p.screenshot({ path: `${out}/phone-360.png` });
  await p.close();

  // 7. Mouse lift: the tile under the pointer lifts and settles back; a finger never lifts one
  p = await page({ desktop: true });
  const tileAt = i => p.evaluate(i => { const r = window.__sb.cellRect(i); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }, i);
  const A = await p.evaluate(() => window.__sb.L.cols * 2 + 4), B = A + 1;
  const a = await tileAt(A), bb = await tileAt(B);
  await p.mouse.move(a.x - 30, a.y - 30); await p.mouse.move(a.x, a.y, { steps: 4 });
  await until(p, i => window.__sb.S.lift[i] === 1, A);
  ok('mouse: the tile under the pointer lifts', await p.evaluate(i => window.__sb.S.lift[i], A) === 1);
  await p.screenshot({ path: `${out}/lift-desktop.png` });
  await p.mouse.move(bb.x, bb.y, { steps: 4 });
  await until(p, (i, j) => window.__sb.S.lift[i] === 0 && window.__sb.S.lift[j] === 1, A, B);
  const ab = await p.evaluate((i, j) => [window.__sb.S.lift[i], window.__sb.S.lift[j]], A, B);
  ok('mouse: moving on, the last tile settles back and the next lifts', ab[0] === 0 && ab[1] === 1, JSON.stringify(ab));
  await p.close();
  p = await page();
  const f = await p.evaluate(() => { const r = window.__sb.cellRect(window.__sb.L.cols + 1); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; });
  await p.touchscreen.touchStart(f.x, f.y); await sleep(300); await p.touchscreen.touchMove(f.x + 4, f.y + 2); await sleep(500);
  ok('finger: no tile lifts', await p.evaluate(() => Math.max(...window.__sb.S.lift)) === 0);
  await p.touchscreen.touchEnd();
  await p.close();

  ok('no console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  await b.close();
  console.log(results.join('\n'));
})().catch(e => { console.error('FAILED', e); process.exit(1); });
