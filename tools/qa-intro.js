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
    const count = await p.evaluate(() => document.querySelector('#tb-count').dataset.n || '');
    ok(`${name}: loader shows a photo count`, /^\d+ \/ \d+$/.test(count), count);
    const t0 = Date.now();
    await done(p);
    await sleep(1800);
    const cls = await p.evaluate(() => document.documentElement.className);
    ok(`${name}: intro finishes on its own`, !/\bintro\b|revealing|unboxing/.test(cls), `${((Date.now() - t0) / 1000).toFixed(1)} s after the first check, class "${cls}"`);
    const code = await p.evaluate(() => ({ bars: document.querySelectorAll('#tb-code b').length, lit: document.querySelectorAll('#tb-code b.on').length, tag: document.querySelector('#tag-sizes').textContent }));
    ok(`${name}: the barcode printed every bar, the end label has the sizes`, code.bars > 10 && code.lit === code.bars && /\d+–\d+/.test(code.tag), JSON.stringify(code));

    // the box is gone, every pair is on the wall, and the hint sits at the bottom above the filters
    const end = await p.evaluate(() => {
      const { L, S } = window.__sb, now = performance.now();
      let waiting = 0; for (let i = 0; i < L.count; i++) if (!(S.landAt[i] <= now)) waiting++;
      const h = document.querySelector('#intro-text').getBoundingClientRect(), f = document.querySelector('#filters').getBoundingClientRect();
      return { box: getComputedStyle(document.querySelector('#title-box')).display, cards: document.querySelectorAll('#cards .card').length, waiting, hintBottom: Math.round(h.bottom), filtersTop: Math.round(f.top), vh: innerHeight };
    });
    ok(`${name}: the box has gone and every pair is on the wall`, end.box === 'none' && end.cards === 0 && end.waiting === 0, JSON.stringify(end));
    ok(`${name}: the hint sits at the bottom, above the filters`, end.hintBottom <= end.filtersTop && end.hintBottom > end.vh * 0.6, JSON.stringify(end));
    await p.screenshot({ path: `${out}/intro-end-${name}.png`, captureBeyondViewport: false });

    // scrolling: the hint rides with the wall and fades; back at the top it is there again
    const settled = () => p.waitForFunction(() => window.__sb.F.p === window.__sb.F.tp, { timeout: 10000 }).then(() => sleep(250), () => {});
    await p.evaluate(() => scrollTo(0, window.__sb.L.h * 0.45)); await sleep(300); await settled();
    const gone = await p.evaluate(() => ({ p: window.__sb.F.p, intro: document.querySelector('#intro').className }));
    ok(`${name}: scrolled on, the hint has gone`, gone.p === 1 && /gone/.test(gone.intro), JSON.stringify(gone));
    await p.evaluate(() => scrollTo(0, 0)); await sleep(300); await settled();
    const back = await p.evaluate(() => ({ p: window.__sb.F.p, op: getComputedStyle(document.querySelector('#intro-text')).opacity }));
    ok(`${name}: back at the top, the hint is back`, back.p === 0 && back.op === '1', JSON.stringify(back));

    // a tile opens its pair once the wall is complete
    const c = await p.evaluate(() => { const r = window.__sb.cellRect(window.__sb.L.cols + 1); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; });
    if (name === 'phone') await p.touchscreen.tap(c.x, c.y); else await p.mouse.click(c.x, c.y);
    await p.waitForFunction(() => document.querySelector('#sheet').classList.contains('open'), { timeout: 8000 }).catch(() => {});
    ok(`${name}: a tile opens its pair`, await p.evaluate(() => document.querySelector('#sheet').classList.contains('open')));
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
  ok('reduced-motion setting: the intro plays through to the wall', await p.evaluate(() => window.__sb.introLanded && getComputedStyle(document.querySelector('#title-box')).display === 'none'));
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
