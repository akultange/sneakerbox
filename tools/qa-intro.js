// Intro and title-box checks. Usage: node tools/qa-intro.js <url> <outdir>
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
    // settled = the page has arrived where it was sent and the hint has caught up with it
    const settled = y => p.waitForFunction(y => Math.abs(scrollY - y) < 2 && window.__sb.F.p === window.__sb.F.tp, { timeout: 10000 }, y).then(() => sleep(250), () => {});
    const down = await p.evaluate(() => Math.round(window.__sb.L.h * 0.45));
    await p.evaluate(y => scrollTo(0, y), down); await sleep(300); await settled(down);
    const gone = await p.evaluate(() => ({ p: window.__sb.F.p, intro: document.querySelector('#intro').className }));
    ok(`${name}: scrolled on, the hint has gone`, gone.p === 1 && /gone/.test(gone.intro), JSON.stringify(gone));
    await p.evaluate(() => scrollTo(0, 0)); await sleep(300); await settled(0);
    const back = await p.evaluate(() => ({ p: window.__sb.F.p, op: getComputedStyle(document.querySelector('#intro-text')).opacity }));
    ok(`${name}: back at the top, the hint is back`, back.p === 0 && back.op === '1', JSON.stringify(back));

    // a tile opens its pair once the wall is complete
    const c = await p.evaluate(() => { const r = window.__sb.cellRect(window.__sb.L.cols + 1); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; });
    if (name === 'phone') await tapAt(p, c.x, c.y); else await p.mouse.click(c.x, c.y);
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

  // the box waits to be opened: a prompt, then it opens by itself; a tap opens it at once
  const phaseAt = (p, ph) => p.waitForFunction(ph => document.querySelector('#title-box').dataset.phase === ph, { timeout: 20000, polling: 20 }, ph);
  for (const [name, vp] of [['phone', PHONE], ['desktop', DESK]]) {
    let p = await open(vp);
    await phaseAt(p, 'ready'); await sleep(450);
    const prompt = await p.evaluate(() => ({ ready: document.querySelector('#tb-load').classList.contains('ready'), op: +getComputedStyle(document.querySelector('#tb-tap')).opacity, text: document.querySelector('#tb-tap-text').textContent }));
    ok(`${name}: when it's loaded the box asks to be opened`, prompt.ready && prompt.op > 0.4 && prompt.text === (name === 'phone' ? 'გასახსნელად შეეხე' : 'გასახსნელად დააჭირე'), JSON.stringify(prompt));
    const t1 = Date.now();
    await phaseAt(p, 'scan');
    const waited = Date.now() - t1 + 450;
    ok(`${name}: untouched, it opens by itself after a moment`, waited > 1200 && waited < 4500, `${waited} ms`);
    // the light comes on in it as the lid lifts: the tissue glows, the board and the lid's underside are lit
    await phaseAt(p, 'drop');
    const lit = await p.evaluate(() => ({ dim: +getComputedStyle(document.querySelector('.ts-dim')).opacity, warm: +getComputedStyle(document.querySelector('.tb-warm')).opacity,
      tissue: getComputedStyle(document.querySelector('.ts')).backgroundImage.includes('tissue.webp') && performance.getEntriesByType('resource').some(e => /tissue\.webp/.test(e.name) && e.responseEnd > 0) }));
    ok(`${name}: the light comes on inside as the lid lifts`, lit.dim < 0.25 && lit.warm > 0.75 && lit.tissue, JSON.stringify(lit));
    await p.close();

    p = await open(vp);
    await phaseAt(p, 'ready'); await sleep(200);
    const ts = Date.now();
    if (name === 'phone') await tapAt(p, vp.width / 2, vp.height * 0.44); else await p.mouse.click(vp.width / 2, vp.height * 0.44);
    await phaseAt(p, 'scan');
    ok(`${name}: a tap opens it at once`, Date.now() - ts < 900, `${Date.now() - ts} ms`);
    await done(p);
    ok(`${name}: and it plays through to the wall`, await p.evaluate(() => window.__sb.introLanded && getComputedStyle(document.querySelector('#title-box')).display === 'none'));
    await p.close();
  }

  // the sound switch: on by default, off is remembered, and with it off the box doesn't wait
  {
    let p = await open(DESK);
    await p.keyboard.press('Shift'); await done(p); await sleep(1600);
    const on = await p.evaluate(() => document.querySelector('#snd').getAttribute('aria-pressed'));
    await p.click('#snd'); await sleep(200);
    const off = await p.evaluate(() => ({ pressed: document.querySelector('#snd').getAttribute('aria-pressed'), saved: localStorage.getItem('sb-sound'), label: document.querySelector('#snd').getAttribute('aria-label') }));
    ok('sound: on by default, the switch turns it off and says so', on === 'true' && off.pressed === 'false' && off.saved === 'off' && off.label === 'ხმა', JSON.stringify({ on, ...off }));
    await p.goto(url, { waitUntil: 'domcontentloaded' });
    const seen = await p.evaluate(() => new Promise(res => {
      const phases = new Set(), tb = document.querySelector('#title-box');
      const tick = () => { if (tb.dataset.phase) phases.add(tb.dataset.phase); if (tb.dataset.phase === 'scan' || window.__sb?.introLanded) return res([...phases]); requestAnimationFrame(tick); };
      tick();
    }));
    ok('sound: off is remembered, and the box opens without waiting', !seen.includes('ready') && await p.evaluate(() => document.querySelector('#snd').getAttribute('aria-pressed') === 'false'), JSON.stringify(seen));
    await done(p); await sleep(1600);
    await p.click('#snd'); await sleep(200);
    ok('sound: and back on', await p.evaluate(() => document.querySelector('#snd').getAttribute('aria-pressed') === 'true' && localStorage.getItem('sb-sound') === 'on'));
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
