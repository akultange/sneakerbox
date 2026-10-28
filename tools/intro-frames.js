// Record the intro with Chrome's screencast. Usage: node tools/intro-frames.js <url> <outdir> <phone|desk> [seconds]
const puppeteer = require('puppeteer-core');
const m = require('@sparticuz/chromium'); const chromium = m.default || m;
const fs = require('fs');
const [url = 'http://127.0.0.1:8765/', out = 'frames', dev = 'phone', secs = '5'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', msg => { if (msg.type() === 'error') errs.push(msg.text()); });
  const phone = dev === 'phone';
  await p.setViewport(phone ? { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { width: 1916, height: 875, deviceScaleFactor: 1 });
  const cdp = await p.target().createCDPSession();
  const frames = [];
  cdp.on('Page.screencastFrame', async f => {
    frames.push({ t: f.metadata.timestamp, data: f.data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: phone ? 390 : 1916, maxHeight: phone ? 844 : 875, everyNthFrame: 1 });
  const t0 = Date.now() / 1000;
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, Number(secs) * 1000));
  await cdp.send('Page.stopScreencast');
  const state = await p.evaluate(() => ({ introDone: window.__sb && window.__sb.introDone, cls: document.documentElement.className }));
  frames.forEach((f, i) => fs.writeFileSync(`${out}/${dev}-${String(i).padStart(3, '0')}-${Math.round((f.t - t0) * 1000)}.jpg`, Buffer.from(f.data, 'base64')));
  console.log(dev, 'frames', frames.length, 'state', JSON.stringify(state), 'errors', errs.join(' | ') || 'none');
  await b.close();
})();
