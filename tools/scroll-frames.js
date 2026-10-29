// Record the wall scrolling on a phone, finger drags through the compositor (with fling).
// Usage: node tools/scroll-frames.js <url> <outdir> [phone|desk]  (desk scrolls with the mouse wheel)
const puppeteer = require('puppeteer-core');
const m = require('@sparticuz/chromium'); const chromium = m.default || m;
const fs = require('fs');
const [url = 'http://127.0.0.1:8765/', out = 'frames', dev = 'phone'] = process.argv.slice(2);
const desk = dev === 'desk';
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', msg => { if (msg.type() === 'error') errs.push(msg.text()); });
  await p.setViewport(desk ? { width: 1440, height: 900, deviceScaleFactor: 1 } : { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await p.goto(url, { waitUntil: 'networkidle0' });
  await p.keyboard.press('Shift');
  await p.waitForFunction(() => window.__sb && window.__sb.introLanded, { timeout: 15000 });
  await sleep(1800);
  const cdp = await p.target().createCDPSession();
  const frames = [];
  cdp.on('Page.screencastFrame', async f => {
    frames.push({ t: f.metadata.timestamp, data: f.data, sy: f.metadata.scrollOffsetY });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: desk ? 1440 : 390, maxHeight: desk ? 900 : 844, everyNthFrame: 1 });
  const t0 = Date.now() / 1000;
  const drag = async (y0, y1, ms) => {
    const steps = Math.max(2, Math.round(ms / 16));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 210, y: y0 }] });
    for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 210, y: y0 + (y1 - y0) * i / steps }] }); await sleep(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await sleep(150);
  if (desk) {
    const wheel = dy => cdp.send('Input.synthesizeScrollGesture', { x: 700, y: 500, yDistance: dy, speed: 1200, gestureSourceType: 'mouse' });
    await wheel(-120); await sleep(400); await wheel(-120); await sleep(400); await wheel(-200); await sleep(900);
    await wheel(440); await sleep(1100);
  } else {
    await drag(640, 520, 500);          // slow: the box should move with its slots
    await sleep(500);
    await drag(640, 400, 220);          // a flick down the wall
    await sleep(1300);
    await drag(300, 700, 220);          // flick back up
    await sleep(1300);
  }
  await cdp.send('Page.stopScreencast');
  const log = [];
  frames.forEach((f, i) => { const n = `s-${String(i).padStart(3, '0')}-${Math.round((f.t - t0) * 1000)}.jpg`; fs.writeFileSync(`${out}/${n}`, Buffer.from(f.data, 'base64')); log.push(`${n} ${Math.round(f.sy)}`); });
  fs.writeFileSync(`${out}/frames.txt`, log.join('\n'));
  console.log('frames', frames.length, 'scrollY now', await p.evaluate(() => scrollY), 'errors', errs.join(' | ') || 'none');
  await b.close();
})();
