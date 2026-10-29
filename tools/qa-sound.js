// Render every sound offline and measure it. Usage: node tools/qa-sound.js <url> [out.wav]
// (the page's AudioContext is swapped for an offline one whose clock the test sets, so each
//  sound is placed in its own slot of one long render)
const puppeteer = require('puppeteer-core');
const m = require('@sparticuz/chromium'); const chromium = m.default || m;
const fs = require('fs');
const [url = 'http://127.0.0.1:8765/', wav] = process.argv.slice(2);
const SLOT = 3, SR = 44100;
const SOUNDS = [
  ['tick', [0]], ['scan', []], ['whirl', [900]], ['leak', [0]], ['lid', [0.15]], ['glow', [0]], ['drop', [560]], ['pop', []],
  ['rustle', [0]], ['flick', [0, -0.5]], ['sink', []], ['plink', [0, 0, -0.3]], ['wave', [0]],
  ['open', []], ['close', []], ['size', []], ['ready', []], ['copy', []], ['swipe', []], ['flip', []], ['on', []],
];
(async () => {
  const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.evaluateOnNewDocument((n, sr) => {
    window.__t = 0;
    window.AudioContext = class extends OfflineAudioContext {
      constructor() { super(2, n, sr); window.__actx = this; }
      get currentTime() { return window.__t; }
      get state() { return 'running'; }
      resume() { return Promise.resolve(); }
      suspend() { return Promise.resolve(); }
    };
  }, SR * SLOT * (SOUNDS.length + 3), SR);
  await p.setViewport({ width: 1280, height: 800 });
  await p.goto(url + '#none', { waitUntil: 'networkidle0' });
  await p.waitForFunction(() => window.__sb, { timeout: 20000 });
  await p.keyboard.press('a');                                   // a real gesture unlocks it (a key: a mouse would move the light, and play the wall)
  const res = await p.evaluate(async (SOUNDS, SLOT) => {
    const snd = window.__sb.snd;
    if (!window.__actx) return { error: 'no context' };
    SOUNDS.forEach(([name, args], k) => { window.__t = k * SLOT; snd[name](...args); });
    window.__t = SOUNDS.length * SLOT; snd.ambient(true);         // the room, last, for two slots
    window.__t = 0;
    const buf = await window.__actx.startRendering();
    const L = buf.getChannelData(0), R = buf.getChannelData(1), sr = buf.sampleRate;
    const seg = (a, b) => {
      let peak = 0, sum = 0, last = -1, nan = false;
      for (let i = Math.floor(a * sr); i < Math.min(L.length, Math.floor(b * sr)); i++) {
        const v = Math.max(Math.abs(L[i]), Math.abs(R[i]));
        if (Number.isNaN(v)) nan = true;
        if (v > peak) peak = v;
        sum += (L[i] * L[i] + R[i] * R[i]) / 2;
        if (v > 0.001) last = i;
      }
      const db = x => x > 0 ? (20 * Math.log10(x)).toFixed(1) : '-inf';
      return { peak: db(peak), rms: db(Math.sqrt(sum / ((b - a) * sr))), len: last < 0 ? 0 : +((last / sr) - a).toFixed(2), nan };
    };
    const out = SOUNDS.map(([name], k) => ({ name, ...seg(k * SLOT, (k + 1) * SLOT) }));
    out.push({ name: 'ambient', ...seg(SOUNDS.length * SLOT + 1, SOUNDS.length * SLOT + 2 * SLOT) });
    // hand the render back as 16-bit samples for a listen
    const pcm = new Int16Array(L.length * 2);
    for (let i = 0; i < L.length; i++) { pcm[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; pcm[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
    let bin = ''; const u8 = new Uint8Array(pcm.buffer);
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return { out, pcm: btoa(bin), sr };
  }, SOUNDS, SLOT);
  if (res.error) { console.log('FAIL', res.error); process.exit(1); }
  let fails = 0;
  for (const r of res.out) {
    const bad = r.nan || r.peak === '-inf' || Number(r.peak) > -1 || (r.name !== 'ambient' && r.len > SLOT - 0.05);
    if (bad) fails++;
    console.log(`${bad ? 'FAIL' : 'ok  '}  ${r.name.padEnd(8)} peak ${String(r.peak).padStart(6)} dBFS  rms ${String(r.rms).padStart(6)}  ${r.name === 'ambient' ? '' : 'rings ' + r.len + ' s'}`);
  }
  if (wav) {
    const data = Buffer.from(res.pcm, 'base64'), h = Buffer.alloc(44);
    h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
    h.writeUInt32LE(res.sr, 24); h.writeUInt32LE(res.sr * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
    fs.writeFileSync(wav, Buffer.concat([h, data]));
  }
  console.log(errs.length ? 'page errors: ' + errs.join(' | ') : 'no page errors', fails ? `${fails} FAILED` : 'all sounds ok');
  await b.close();
})();
