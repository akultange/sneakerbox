// Record the mouse lift: onto a tile, across to its neighbour, then off the wall.
// Usage: node tools/hover-frames.js <url> <outdir>
const puppeteer = require('puppeteer-core');
const m = require('@sparticuz/chromium'); const chromium = m.default || m;
const fs = require('fs');
const [url = 'http://127.0.0.1:8765/', out = 'frames'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', msg => { if (msg.type() === 'error') errs.push(msg.text()); });
  await p.setViewport({ width: 1280, height: 760, deviceScaleFactor: 1 });
  await p.goto(url, { waitUntil: 'networkidle0' });
  await p.keyboard.press('Shift');
  await p.waitForFunction(() => window.__sb && window.__sb.introLanded, { timeout: 15000 });
  await sleep(1500);
  const pts = await p.evaluate(() => {
    const { L, cellRect } = window.__sb, a = cellRect(L.cols * 2 + 3), z = cellRect(L.cols * 2 + 4);
    return { a: { x: a.x + a.w / 2, y: a.y + a.h / 2 }, z: { x: z.x + z.w / 2, y: z.y + z.h / 2 }, cell: [a.x, a.y, a.w, a.h] };
  });
  await p.mouse.move(pts.a.x - 400, pts.a.y + 260); await sleep(300);
  const cdp = await p.target().createCDPSession();
  const frames = [];
  cdp.on('Page.screencastFrame', async f => {
    frames.push({ t: f.metadata.timestamp, data: f.data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, everyNthFrame: 1 });
  const t0 = Date.now() / 1000;
  const lifts = [];
  const sample = async tag => lifts.push(tag + ' ' + await p.evaluate(() => { const { S, L } = window.__sb; const r = []; for (let i = 0; i < L.count; i++) if (S.lift[i] > 0.01) r.push(i + ':' + S.lift[i].toFixed(2)); return r.join(' '); }));
  await p.mouse.move(pts.a.x, pts.a.y, { steps: 8 });
  for (let i = 0; i < 6; i++) { await sleep(90); await sample('on A'); }
  await p.mouse.move(pts.z.x, pts.z.y, { steps: 6 });
  for (let i = 0; i < 6; i++) { await sleep(90); await sample('to B'); }
  await p.mouse.move(pts.z.x + 20, 4, { steps: 4 });     // off the wall (onto the header)
  for (let i = 0; i < 6; i++) { await sleep(90); await sample('off'); }
  await cdp.send('Page.stopScreencast');
  frames.forEach((f, i) => fs.writeFileSync(`${out}/s-${String(i).padStart(3, '0')}-${Math.round((f.t - t0) * 1000)}.jpg`, Buffer.from(f.data, 'base64')));
  fs.writeFileSync(`${out}/cell.json`, JSON.stringify(pts));
  console.log(lifts.join('\n'));
  console.log('frames', frames.length, 'errors', errs.join(' | ') || 'none');
  await b.close();
})();
