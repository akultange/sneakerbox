// Intro and title-box checks. Usage: node tools/qa-intro.js <url> <outdir>
const puppeteer = require('puppeteer-core');
const m = require('@sparticuz/chromium'); const chromium = m.default || m;
const [url = 'http://127.0.0.1:8765/', out = 'qa'] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const res = []; const ok = (n, p, i = '') => res.push(`${p ? 'PASS' : 'FAIL'}  ${n}${i ? '  ' + i : ''}`);
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESK = { width: 1916, height: 875, deviceScaleFactor: 1 };

(async () => {
  const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
  const errors = [];
  const open = async (vp, opts = {}) => {
    const p = await b.newPage();
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await p.setViewport(vp);
    if (opts.reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await p.goto(opts.url || url, { waitUntil: 'domcontentloaded' });
    return p;
  };
  const done = p => p.waitForFunction(() => window.__sb && window.__sb.introLanded && !document.documentElement.classList.contains('intro'), { timeout: 20000 });

  for (const [name, vp] of [['phone', PHONE], ['desktop', DESK]]) {
    // plays by itself, with the loader count, and ends on the wall
    let p = await open(vp);
    const startCls = await p.evaluate(() => document.documentElement.className);
    ok(`${name}: intro starts on load`, /intro/.test(startCls), startCls);
    await sleep(700);
    const count = await p.evaluate(() => document.querySelector('#tb-count').textContent);
    ok(`${name}: loader shows a photo count`, /^\d+ \/ \d+$/.test(count), count);
    const t0 = Date.now();
    await done(p);
    await sleep(1800);
    const cls = await p.evaluate(() => document.documentElement.className);
    ok(`${name}: intro finishes on its own`, !/intro|revealing/.test(cls), `${((Date.now() - t0) / 1000).toFixed(1)} s after the first check, class "${cls}"`);

    // the box sits exactly on its three slots
    const fit = await p.evaluate(() => {
      const { L, cellRect } = window.__sb;
      const first = cellRect(L.hole.row * L.cols), last = cellRect(L.hole.row * L.cols + L.hole.cols - 1);
      const want = { x: first.x, y: first.y, w: last.x + last.w - first.x, h: first.h };
      const r = document.querySelector('.tb-front').getBoundingClientRect();
      const d = Math.max(Math.abs(r.left - want.x), Math.abs(r.top - want.y), Math.abs(r.width - want.w), Math.abs(r.height - want.h));
      return { d: +d.toFixed(2), want: [want.x, want.y, want.w, want.h].map(Math.round), got: [r.left, r.top, r.width, r.height].map(Math.round) };
    });
    ok(`${name}: box face sits exactly on its three slots`, fit.d < 1.5, JSON.stringify(fit));
    await p.screenshot({ path: `${out}/intro-end-${name}.png` });

    // scrolling: the box rides with its slots, then goes back into the wall and photos fill them
    const centres = () => p.evaluate(() => {
      const { L, cellRect } = window.__sb;
      const a = cellRect(L.hole.row * L.cols), z = cellRect(L.hole.row * L.cols + L.hole.cols - 1);
      const r = document.querySelector('.tb-front').getBoundingClientRect();
      return { dx: +(r.left + r.width / 2 - (a.x + z.x + z.w) / 2).toFixed(2), dy: +(r.top + r.height / 2 - (a.y + a.h / 2)).toFixed(2) };
    });
    const settled = () => p.waitForFunction(() => window.__sb.X.p === window.__sb.X.tp, { timeout: 10000 }).then(() => sleep(250), () => {});
    await p.evaluate(() => scrollTo(0, 45)); await sleep(300); await settled();
    const ride = await centres();
    ok(`${name}: box rides with its slots while the wall scrolls`, Math.abs(ride.dx) < 1 && Math.abs(ride.dy) < 1, JSON.stringify(ride));
    const R = await p.evaluate(() => Math.max(window.__sb.L.hole.y - window.__sb.L.top, window.__sb.L.h * 0.32));
    await p.evaluate(R => scrollTo(0, R), R); await sleep(300); await settled();
    const gone = await p.evaluate(() => {
      const { L, X, cellAt, cellRect, layerOf } = window.__sb, i = L.hole.row * L.cols + 1, c = cellRect(i);
      return { p: +X.p.toFixed(3), intro: document.querySelector('#intro').className, cell: cellAt(c.x + c.w / 2, c.y + c.h / 2), layer: layerOf(i) };
    });
    ok(`${name}: scrolled on, the box goes back in and photos fill its slots`, gone.p === 1 && /gone/.test(gone.intro) && gone.cell >= 0 && gone.layer >= 0, JSON.stringify(gone));
    await p.screenshot({ path: `${out}/scrolled-${name}.png` });
    await p.evaluate(() => scrollTo(0, 0)); await sleep(300); await settled();
    const back = await p.evaluate(() => {
      const { L, X, cellRect } = window.__sb;
      const first = cellRect(L.hole.row * L.cols), last = cellRect(L.hole.row * L.cols + L.hole.cols - 1);
      const r = document.querySelector('.tb-front').getBoundingClientRect();
      const d = Math.max(Math.abs(r.left - first.x), Math.abs(r.top - first.y), Math.abs(r.width - (last.x + last.w - first.x)), Math.abs(r.height - first.h));
      return { p: X.p, d: +d.toFixed(2), op: getComputedStyle(document.querySelector('.tb-persp')).opacity };
    });
    ok(`${name}: back at the top, the box is flush in its slots again`, back.p === 0 && back.d < 1.5 && back.op === '1', JSON.stringify(back));

    // tapping the box opens nothing
    const c = await p.evaluate(() => { const r = document.querySelector('.tb-front').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (name === 'phone') await p.touchscreen.tap(c.x, c.y); else await p.mouse.click(c.x, c.y);
    await sleep(600);
    ok(`${name}: tapping the box opens nothing`, !(await p.evaluate(() => document.querySelector('#sheet').classList.contains('open'))));
    await p.close();

    // a key skips it
    p = await open(vp);
    await sleep(500);
    const ts = Date.now();
    await p.keyboard.press('Shift');
    await done(p);
    ok(`${name}: a key skips the intro`, Date.now() - ts < 2500, `${Date.now() - ts} ms`);
    await p.close();
  }

  // shared pair links go straight in; a reduced-motion setting still gets the intro on load
  let p = await open(PHONE, { url: url + '#palermo' });
  ok('deep link: no intro', !(await p.evaluate(() => document.documentElement.classList.contains('intro'))));
  await sleep(1200);
  ok('deep link: pair opens', await p.evaluate(() => document.querySelector('#sheet').classList.contains('open')));
  await p.close();
  p = await open(PHONE, { reduced: true });
  ok('reduced-motion setting: the intro still plays on load', await p.evaluate(() => document.documentElement.classList.contains('intro')));
  await sleep(700);
  ok('reduced-motion setting: the loader counts', /^\d+ \/ \d+$/.test(await p.evaluate(() => document.querySelector('#tb-count').textContent)));
  await done(p);
  ok('reduced-motion setting: box lands in its slots', await p.evaluate(() => document.documentElement.classList.contains('laid')));
  await p.close();

  // no dark dead end: size 37 disables Lacoste; Lacoste disables the sizes it doesn't have
  p = await open(PHONE);
  await p.keyboard.press('Shift'); await done(p); await sleep(1600);
  await p.tap('#size-chip'); await sleep(300);
  await p.evaluate(() => [...document.querySelectorAll('#size-grid .size')].find(x => x.textContent === '37').click());
  await sleep(400);
  const lac = await p.evaluate(() => document.querySelector('.chip[data-brand="Lacoste"]').disabled);
  ok('size 37 disables Lacoste (none in 37)', lac === true);
  await p.tap('#size-chip'); await sleep(300);
  await p.tap('#size-clear'); await sleep(300);
  await p.evaluate(() => document.querySelector('.chip[data-brand="Lacoste"]').click()); await sleep(300);
  await p.tap('#size-chip'); await sleep(300);
  const dis = await p.evaluate(() => [...document.querySelectorAll('#size-grid .size:disabled')].map(x => x.textContent).join(','));
  ok('Lacoste disables the sizes it lacks', dis.startsWith('36,37,38') && !dis.includes('39'), dis);
  await p.close();

  ok('no page errors', errors.length === 0, errors.slice(0, 4).join(' | '));
  await b.close();
  console.log(res.join('\n'));
})().catch(e => { console.error('FAILED', e); process.exit(1); });
