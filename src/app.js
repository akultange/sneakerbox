// Sneakerbox · the light wall
// Every tile is one of the shop's own photos. The wall sits in the dark; the light
// (finger, cursor, or an idle drift on load) reveals colour. Tap a pair to open it.

const $ = (s, el = document) => el.querySelector(s);
const html = document.documentElement;
const catalog = JSON.parse($('#catalog').textContent);
const photos = catalog.photos;                       // wall order = texture layer order
const pairs = new Map(catalog.pairs.map(p => [p.id, p]));
const brands = [...new Set(catalog.pairs.map(p => p.brand))];
const touchFirst = matchMedia('(pointer: coarse)').matches;
const PAGE = 'sneakerboxonlineshop';
const MAX_CELLS = 256;

// ---------------------------------------------------------------- copy
const T = {
  ka: {
    h1a: 'რეალური წყვილები.',
    h1b: 'რეალური ფოტოები.',
    hint: touchFirst
      ? 'თითი გადაატარე კედელს და სინათლე ფერს გაჩვენებს. შეეხე წყვილს, რომ ნახო ზომები და ფასი.'
      : 'კურსორი გადაატარე კედელს და სინათლე ფერს გაჩვენებს. დააჭირე წყვილს, რომ ნახო ზომები და ფასი.',
    count: n => `${n} წყვილი კედელზე`,
    countBrand: (n, b) => `${b}: ${n} წყვილი`,
    countSize: (n, s, b) => `${b ? b + ', ' : ''}ზომა ${s}: ${n} წყვილი მარაგშია`,
    sizeChip: 'ზომა',
    sizeChipOn: s => `ზომა ${s}`,
    sizePopTitle: 'შენი ზომა (EU)',
    allSizes: 'ყველა ზომა',
    sizeOption: (s, n) => `${s}, ${n} წყვილი`,
    all: 'ყველა',
    brands: 'ბრენდები',
    howTitle: 'როგორ შევუკვეთოთ',
    how1: 'აირჩიე წყვილი კედელზე.',
    how2: 'მონიშნე შენი ზომა.',
    how3: 'გაგზავნე შეკვეთა Messenger-ში და დაგიდასტურებთ.',
    demoNote: 'ფოტოები Sneakerbox-ის Facebook გვერდიდანაა. ფასები და ზომები სადემონსტრაციოა.',
    credit: 'საიტის კონცეფცია: LADZE studio',
    priceNote: 'სავარაუდო ფასი',
    sizeTitle: 'ზომა (EU)',
    picked: s => `არჩეულია ${s}`,
    order: 'შეკვეთა Messenger-ში',
    pickSize: 'ჯერ აირჩიე ზომა.',
    ready: s => `ზომა ${s}. შეკვეთის ტექსტი Messenger-ში გადავა.`,
    copied: 'შეკვეთის ტექსტი დაკოპირდა. თუ Messenger-ში არ გამოჩნდა, ჩასვი.',
    soldOut: 'ამოიწურა',
    onFacebook: 'ეს წყვილი Facebook-ზე',
    share: 'გაზიარება',
    linkCopied: 'ბმული დაკოპირდა.',
    related: 'კიდევ ნახე',
    inStock: n => `${n} ზომა მარაგშია`,
    thumb: i => `ფოტო ${i}`,
    close: 'დახურვა',
    langBtn: 'ENG',
    langLabel: 'Switch to English',
    tapOpen: touchFirst ? 'გასახსნელად შეეხე' : 'გასახსნელად დააჭირე',
    sound: 'ხმა',
    photo: (i, n) => `${i} / ${n}`,
    orderMsg: (p, s) => `გამარჯობა! მინდა შევუკვეთო: ${name(p)} (${p.color.ka}), ზომა ${s}.`,
  },
  en: {
    h1a: 'Real pairs.',
    h1b: 'Real photos.',
    hint: touchFirst
      ? 'Slide your finger across the wall and the light shows the color. Tap a pair to see sizes and price.'
      : 'Move across the wall and the light shows the color. Click a pair to see sizes and price.',
    count: n => `${n} pairs on the wall`,
    countBrand: (n, b) => `${b}: ${n} ${n === 1 ? 'pair' : 'pairs'}`,
    countSize: (n, s, b) => `${b ? b + ', ' : ''}size ${s}: ${n} ${n === 1 ? 'pair' : 'pairs'} in stock`,
    sizeChip: 'Size',
    sizeChipOn: s => `Size ${s}`,
    sizePopTitle: 'Your size (EU)',
    allSizes: 'All sizes',
    sizeOption: (s, n) => `${s}, ${n} ${n === 1 ? 'pair' : 'pairs'}`,
    all: 'All',
    brands: 'Brands',
    howTitle: 'How to order',
    how1: 'Pick a pair on the wall.',
    how2: 'Choose your size.',
    how3: 'Send the order in Messenger and we confirm it.',
    demoNote: 'Photos are from the Sneakerbox Facebook page. Prices and sizes are for demonstration.',
    credit: 'Site concept: LADZE studio',
    priceNote: 'Approximate price',
    sizeTitle: 'Size (EU)',
    picked: s => `Size ${s} selected`,
    order: 'Order in Messenger',
    pickSize: 'Choose a size first.',
    ready: s => `Size ${s}. The order text goes to Messenger.`,
    copied: 'Order text copied. If it is not in Messenger, paste it.',
    soldOut: 'sold out',
    onFacebook: 'This pair on Facebook',
    share: 'Share',
    linkCopied: 'Link copied.',
    related: 'More pairs',
    inStock: (n, total) => `${n} of ${total} sizes in stock`,
    thumb: i => `Photo ${i}`,
    close: 'Close',
    langBtn: 'ქარ',
    langLabel: 'ქართულად',
    tapOpen: touchFirst ? 'Tap to open' : 'Click to open',
    sound: 'Sound',
    photo: (i, n) => `${i} / ${n}`,
    orderMsg: (p, s) => `Hi! I would like to order: ${name(p)} (${p.color.en}), size ${s}.`,
  },
};
let lang = 'ka';
try { if (localStorage.getItem('sb-lang') === 'en') lang = 'en'; } catch {}
const t = (k, ...a) => { const v = T[lang][k]; return typeof v === 'function' ? v(...a) : v; };
const name = p => p.model ? `${p.brand} ${p.model}` : p.brand;
const price = p => `${p.price} ₾`;

// ---------------------------------------------------------------- sound
// Every sound is made here, in the page; there are no sound files. Paper, board and air for
// the box, soft wooden notes for the wall, a small bell when an order is ready, and a quiet
// room under it all. Browsers allow no sound before the page is first touched or clicked,
// so it starts then. The switch in the header turns it off, and that is remembered.
const snd = (() => {
  let ctx = null, bus = null, wet = null, noise = null, crinkle = null, amb = null;
  let want = true, armedAt = 0;
  try { want = localStorage.getItem('sb-sound') !== 'off'; } catch {}
  // running, or just asked to start by a tap (what's played in that moment plays as it starts)
  const live = () => !!(want && ctx && (ctx.state === 'running' || (ctx.state === 'suspended' && performance.now() - armedAt < 1200)));

  function buffer(sec, chans, fill) {
    const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(chans, n, ctx.sampleRate);
    for (let c = 0; c < chans; c++) fill(b.getChannelData(c), c);
    return b;
  }
  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch { return false; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.22;
    const master = ctx.createGain(); master.gain.value = 0.85;
    bus = ctx.createGain(); bus.connect(comp); comp.connect(master); master.connect(ctx.destination);
    // a small, soft room for the bells and the light to ring in
    const verb = ctx.createConvolver();
    verb.buffer = buffer(1.8, 2, d => {
      let lp = 0;
      for (let i = 0; i < d.length; i++) {
        const x = i / d.length;
        lp += (Math.random() * 2 - 1 - lp) * (0.6 - 0.45 * x);              // darker as it dies away
        d[i] = lp * Math.pow(1 - x, 3) * Math.min(1, i / 90);
      }
    });
    wet = ctx.createGain(); wet.gain.value = 0.3; wet.connect(verb); verb.connect(comp);
    noise = buffer(2, 1, d => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; });
    // tissue paper: crackles in bursts, over a little hiss
    crinkle = buffer(1.6, 1, d => {
      const sr = ctx.sampleRate;
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.025;
      let i = 0;
      while (i < d.length) {
        const dense = 0.5 + 0.5 * Math.sin(i / sr * 23 + Math.sin(i / sr * 7) * 2);
        i += 1 + Math.floor(-Math.log(Math.random() + 1e-9) * sr / (250 + 1500 * dense));
        const a = Math.pow(Math.random(), 2.4) * (Math.random() < 0.07 ? 1 : 0.45), len = 6 + Math.floor(Math.random() * 46);
        for (let k = 0; k < len && i + k < d.length; k++) d[i + k] += a * (Math.random() * 2 - 1) * Math.exp(-k / (len * 0.28));
      }
    });
    ctx.onstatechange = () => { if (ctx.state === 'running' && introLanded) ambient(true); };
    return true;
  }

  // one voice: something through a filter and an envelope, panned, a little of it into the room
  function out(node, pan, send) {
    let n = node;
    if (pan) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); n.connect(p); n = p; }
    n.connect(bus);
    if (send) { const s = ctx.createGain(); s.gain.value = send; n.connect(s); s.connect(wet); }
  }
  function shape(g, t, attack, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.01));
  }
  function hiss({ at = 0, dur, type = 'bandpass', f0, f1 = f0, q = 1, gain, attack = 0.003, pan = 0, send = 0, buf = noise }) {
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); shape(g, t, attack, gain, dur);
    src.connect(f); f.connect(g); out(g, pan, send);
    src.start(t, Math.random() * (buf.duration - 0.1)); src.stop(t + dur + 0.05);
  }
  function tone({ at = 0, f0, f1 = f0, glide, dur, type = 'sine', gain, attack = 0.003, pan = 0, send = 0 }) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + (glide || dur));
    const g = ctx.createGain(); shape(g, t, attack, gain, dur);
    o.connect(g); out(g, pan, send);
    o.start(t); o.stop(t + dur + 0.05);
  }
  // the switch's bars move for a moment whenever something plays
  let playingTimer = 0;
  const playing = () => {
    const b = btn(); if (!b) return;
    b.classList.add('playing'); clearTimeout(playingTimer);
    playingTimer = setTimeout(() => b.classList.remove('playing'), 900);
  };
  const play = fn => (...a) => { if (live()) { fn(...a); playing(); } };
  const rnd = (a, b) => a + Math.random() * (b - a);

  // the room: air through a soft band, a low hum under it; moving the light opens the air a little
  function ambient(on) {
    if (on && !amb && live()) {
      const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(bus);
      const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 480; lp.Q.value = 0.5;
      const lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 900; lp2.Q.value = 0.3;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 100;
      const air = ctx.createGain(); air.gain.value = 0.42;
      src.connect(lp); lp.connect(lp2); lp2.connect(hp); hp.connect(air); air.connect(g);
      const oscs = [55, 82.5, 110.2].map((f, i) => {
        const o = ctx.createOscillator(); o.frequency.value = f;
        const og = ctx.createGain(); og.gain.value = [0.2, 0.11, 0.06][i];
        o.connect(og); og.connect(g); o.start(); return o;
      });
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
      const depth = ctx.createGain(); depth.gain.value = 120; lfo.connect(depth); depth.connect(lp.frequency); lfo.start();
      src.start();
      g.gain.setTargetAtTime(0.024, ctx.currentTime, 2.2);
      amb = { g, src, oscs, lfo, lp, air };
    } else if (!on && amb) {
      const a = amb; amb = null;
      a.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
      setTimeout(() => { try { a.src.stop(); a.lfo.stop(); a.oscs.forEach(o => o.stop()); } catch {} a.g.disconnect(); }, 1500);
    }
  }
  let airAt = 0, plinkAt = 0;
  function motion(speed) {                       // px per ms of the light, from the frame loop
    if (!amb || !live()) return;
    const n = performance.now(); if (n - airAt < 90) return; airAt = n;
    const s = Math.min(1, speed / 1.6), t = ctx.currentTime;
    amb.lp.frequency.setTargetAtTime(480 + 900 * s, t, 0.3);
    amb.air.gain.setTargetAtTime(0.42 + 0.5 * s, t, 0.3);
  }

  function unlock() {
    if (!want) return;
    if (navigator.userActivation && !navigator.userActivation.isActive && !ctx) return;   // not a gesture yet
    if (!ctx && !init()) return;
    if (ctx.state !== 'running') { armedAt = performance.now(); ctx.resume().catch(() => {}); }
  }
  const btn = () => $('#snd');
  function show() { const b = btn(); if (b) b.setAttribute('aria-pressed', String(want)); }
  function set(v) {
    want = v;
    try { localStorage.setItem('sb-sound', v ? 'on' : 'off'); } catch {}
    show();
    if (v) { unlock(); setTimeout(() => { s.on(); if (introLanded) ambient(true); }, 30); }
    else if (ctx) { ambient(false); setTimeout(() => { if (!want) ctx.suspend().catch(() => {}); }, 400); }
  }
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else if (want) ctx.resume().catch(() => {});
  });

  // ---- the box
  const s = {
    get wanted() { return want; }, live, unlock, set, show, ambient, motion,
    // a bar of the barcode prints
    tick: play(pan => { hiss({ dur: 0.016, type: 'highpass', f0: 3600, q: 0.7, gain: 0.035, pan }); tone({ f0: 5400, dur: 0.01, gain: 0.006, pan }); }),
    // the scanner reads the code: a red sweep, then the beep
    scan: play(() => {
      hiss({ dur: 0.42, f0: 1300, f1: 5200, q: 3.5, gain: 0.018, attack: 0.08 });
      tone({ at: 0.38, f0: 1975.5, dur: 0.12, gain: 0.045, attack: 0.004, send: 0.12 });
      tone({ at: 0.38, f0: 3951, dur: 0.05, gain: 0.01 });
    }),
    // it slows down: air
    whirl: play(ms => hiss({ dur: ms / 1000, f0: 760, f1: 240, q: 0.8, gain: 0.03, attack: ms / 3000 })),
    // light leaks out under the lid (at: seconds from now)
    leak: play(at => hiss({ at, dur: 0.6, f0: 2400, f1: 3600, q: 6, gain: 0.012, attack: 0.35, send: 0.6 })),
    // the lid comes up: it sticks, then lets go with a breath of air (at: when it lets go)
    lid: play(at => {
      hiss({ at: at - 0.12, dur: 0.16, f0: 1500, f1: 1050, q: 1.6, gain: 0.05, buf: crinkle });
      hiss({ at: at - 0.02, dur: 0.38, type: 'lowpass', f0: 260, f1: 1500, q: 0.9, gain: 0.11, attack: 0.07 });
      tone({ at, f0: 125, f1: 72, dur: 0.22, gain: 0.12, attack: 0.012 });
    }),
    // the light inside: an open fifth that swells and rings in the room
    glow: play(at => {
      [110, 164.8, 220, 329.6].forEach((f, i) => tone({ at: at + i * 0.04, f0: f * rnd(0.998, 1.002), dur: 2.6, gain: [0.03, 0.022, 0.016, 0.01][i], attack: 0.55, send: 0.55 }));
      tone({ at: at + 0.2, f0: 1318.5, dur: 1.6, gain: 0.004, attack: 0.5, send: 0.8 });
    }),
    // the fall, and the landing: a thud with a knock of board in it, the lid settling
    drop: play(ms => {
      const land = ms / 1000;
      hiss({ dur: land, f0: 300, f1: 1000, q: 0.7, gain: 0.045, attack: land * 0.8 });
      tone({ at: land, f0: 88, f1: 44, dur: 0.34, gain: 0.3, attack: 0.004 });
      hiss({ at: land, dur: 0.13, type: 'lowpass', f0: 950, f1: 280, q: 0.6, gain: 0.24, attack: 0.002 });
      hiss({ at: land, dur: 0.05, f0: 1900, q: 2, gain: 0.06 });
      hiss({ at: land + 0.075, dur: 0.045, f0: 1250, q: 3, gain: 0.035 });
    }),
    // the lid pops off and flies
    pop: play(() => {
      tone({ f0: 320, f1: 140, dur: 0.09, gain: 0.15, attack: 0.002 });
      hiss({ dur: 0.07, f0: 1150, q: 1.2, gain: 0.1 });
      hiss({ at: 0.03, dur: 0.5, f0: 520, f1: 2600, q: 0.8, gain: 0.045, attack: 0.12 });
    }),
    // tissue paper flung open, one sheet each way
    rustle: play(at => {
      hiss({ at, dur: 0.46, type: 'highpass', f0: 1600, q: 0.5, gain: 0.2, attack: 0.03, buf: crinkle, pan: -0.45 });
      hiss({ at: at + 0.05, dur: 0.42, type: 'highpass', f0: 1800, q: 0.5, gain: 0.18, attack: 0.03, buf: crinkle, pan: 0.45 });
      hiss({ at, dur: 0.32, f0: 2600, f1: 1300, q: 0.7, gain: 0.025, attack: 0.05 });
    }),
    // a pair flies out: a flick, panned to where it's going
    flick: play((at, pan) => { const r = rnd(0.85, 1.15); hiss({ at, dur: rnd(0.045, 0.07), f0: 3300 * r, f1: 1400 * r, q: 1.3, gain: rnd(0.045, 0.07), pan }); }),
    // the empty box sinks away
    sink: play(() => { hiss({ dur: 0.7, type: 'lowpass', f0: 800, f1: 170, q: 0.7, gain: 0.05, attack: 0.18 }); }),

    // ---- the wall and the window
    // a soft wooden note per tile, on a pentatonic scale across the wall
    plink: play((col, row, pan) => {
      const n = performance.now(); if (n - plinkAt < 40) return; plinkAt = n;
      const steps = [0, 2, 4, 7, 9], k = col + row * 2;
      const f = 392 * Math.pow(2, (steps[k % 5] + 12 * (Math.floor(k / 5) % 2)) / 12);
      tone({ f0: f, dur: 0.24, gain: 0.026, attack: 0.002, pan, send: 0.18 });
      tone({ f0: f * 2.76, dur: 0.045, gain: 0.005, pan });
    }),
    // a filter's light wave crossing the wall
    wave: play(pan => {
      hiss({ dur: 0.75, f0: 900, f1: 5200, q: 4, gain: 0.02, attack: 0.14, send: 0.4, pan });
      tone({ at: 0.04, f0: 1318.5, dur: 0.9, gain: 0.012, send: 0.6, pan });
      tone({ at: 0.13, f0: 1760, dur: 0.8, gain: 0.009, send: 0.6, pan });
    }),
    open: play(() => { hiss({ dur: 0.34, type: 'lowpass', f0: 300, f1: 1700, q: 0.9, gain: 0.07, attack: 0.05 }); tone({ f0: 140, f1: 92, dur: 0.17, gain: 0.08, attack: 0.008 }); }),
    close: play(() => { hiss({ dur: 0.24, type: 'lowpass', f0: 1500, f1: 320, q: 0.9, gain: 0.05, attack: 0.03 }); tone({ at: 0.16, f0: 150, f1: 104, dur: 0.1, gain: 0.07, attack: 0.004 }); }),
    size: play(() => { tone({ f0: 1250, f1: 880, glide: 0.03, dur: 0.06, gain: 0.032, attack: 0.002 }); hiss({ dur: 0.012, type: 'highpass', f0: 2600, gain: 0.025 }); }),
    // the order is ready: two notes of a small bell
    ready: play(() => {
      tone({ f0: 659.3, dur: 1, gain: 0.04, send: 0.5 }); tone({ f0: 659.3 * 2.4, dur: 0.18, gain: 0.005 });
      tone({ at: 0.09, f0: 987.8, dur: 1.2, gain: 0.036, send: 0.5 }); tone({ at: 0.09, f0: 987.8 * 2.4, dur: 0.22, gain: 0.005 });
    }),
    copy: play(() => { tone({ f0: 880, dur: 0.12, gain: 0.025 }); tone({ at: 0.07, f0: 1318.5, dur: 0.32, gain: 0.025, send: 0.4 }); }),
    swipe: play(() => hiss({ dur: 0.09, f0: 2700, f1: 1800, q: 1, gain: 0.02 })),
    flip: play(() => hiss({ dur: 0.16, f0: 1700, f1: 3300, q: 0.9, gain: 0.13, buf: crinkle })),
    on: play(() => { tone({ f0: 523.3, dur: 0.2, gain: 0.035 }); tone({ at: 0.08, f0: 784, dur: 0.4, gain: 0.035, send: 0.4 }); }),
  };
  return s;
})();

// The box is printed in both languages: the current one on the front, the other on the back.
const boxFront = $('#tb-headline'), tbAlt = $('#tb-alt');
function printBox(el, l) {
  const [a, b] = el.querySelectorAll('span');
  if (a.textContent !== T[l].h1a) a.textContent = T[l].h1a;
  if (b.textContent !== T[l].h1b) b.textContent = T[l].h1b;
  el.classList.toggle('en', l === 'en');
}
function applyLang() {
  html.lang = lang;
  // only touch text that changes: rewriting the same words counts as a new paint
  document.querySelectorAll('[data-i18n]').forEach(el => { const v = t(el.dataset.i18n); if (el.textContent !== v) el.textContent = v; });
  printBox(boxFront, lang); printBox(tbAlt, lang === 'ka' ? 'en' : 'ka');
  document.querySelectorAll('[data-i18n-label]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nLabel)));
  $('#tb-tap-text').textContent = t('tapOpen');
  $('#lang').textContent = t('langBtn');
  $('#lang').setAttribute('aria-label', t('langLabel'));
  $('#filters').setAttribute('aria-label', t('brands'));
  renderFilters();
  renderCount();
  renderPairList();
  hintTop();
  if (sheetPair) fillSheet(sheetPair, sheetKey, false);
}

// ---------------------------------------------------------------- layout
const wall = $('#wall'), stage = $('#stage'), canvas = $('#gl');
const label = $('#label'), intro = $('#intro'), introText = $('#intro-text');
const titleBox = $('#title-box');
const L = { w: 0, h: 0, cols: 3, gap: 6, pad: 8, tile: 100, step: 106, top: 64, rows: 0, height: 0, hintTop: 0 };
const HOLE = 0xFFFF;                                    // (no cell is left empty any more; kept for the checks)
let cells = new Uint16Array(0);                         // cell -> photo layer
const layerOf = i => cells[i];

function layout() {
  const w = stage.clientWidth, h = stage.clientHeight;
  const cols = w < 520 ? 3 : w < 900 ? 4 : w < 1340 ? 6 : 7;
  const gap = w < 520 ? 6 : 10, pad = w < 520 ? 8 : 24;
  const tile = (w - pad * 2 - gap * (cols - 1)) / cols;
  const step = tile + gap, top = w < 520 ? 60 : 76;
  const minRows = Math.ceil((h * 1.45 - top) / step);
  const rows = Math.max(Math.ceil(photos.length / cols), minRows);
  const count = Math.min(rows * cols, MAX_CELLS);
  cells = new Uint16Array(count);
  for (let i = 0; i < count; i++) cells[i] = i % photos.length;
  const height = Math.max(top + Math.ceil(count / cols) * step - gap + Math.round(h * 0.18), h);
  Object.assign(L, { w, h, cols, gap, pad, tile, step, top, rows: Math.ceil(count / cols), height, count });
  wall.style.height = height + 'px';
  // the box is three tiles wide and one high
  const bc = Math.min(3, cols);
  titleBox.style.setProperty('--bw', bc * tile + (bc - 1) * gap + 'px');
  titleBox.style.setProperty('--bh', tile + 'px');
  hintTop();
  html.classList.add('laid');
}
// where the hint starts on screen (the idle light keeps above it while it shows)
function hintTop() {
  if (!introText.offsetParent) return;
  L.hintTop = intro.clientHeight - introText.offsetHeight - (parseFloat(getComputedStyle(introText).bottom) || 0);
}

// cell geometry in viewport pixels
function cellRect(i) {
  const col = i % L.cols, row = Math.floor(i / L.cols);
  const x = L.pad + col * L.step, y = L.top + row * L.step - S.scroll + S.stageTop;
  return { x, y, w: L.tile, h: L.tile };
}
function cellAt(vx, vy) {          // viewport coords -> cell index or -1
  const x = vx - L.pad, y = vy - S.stageTop + S.scroll - L.top;
  if (x < 0 || y < 0) return -1;
  const col = Math.floor(x / L.step), row = Math.floor(y / L.step);
  if (col >= L.cols || x - col * L.step > L.tile || y - row * L.step > L.tile) return -1;
  const i = row * L.cols + col;
  return i < L.count ? i : -1;
}

// ---------------------------------------------------------------- state
const S = {
  scroll: 0, stageTop: 0,
  input: false, lastInput: -1e9, mode: 'idle',          // idle | mouse | touch | focus
  lx: 0, ly: 0, tx: 0, ty: 0, k: 0, tk: 0,              // light pos, target, intensity
  hover: -1, hide: -1, dim: 0, tdim: 0,
  mx: -1, my: -1, mouseIn: false, scrollAt: -1e9,     // the mouse pointer (viewport px), last scroll
  landAt: new Float64Array(MAX_CELLS), flashUntil: 0,  // per tile: when its pair landed (the intro), for the flash
  hl: new Float32Array(MAX_CELLS),                      // per tile: the light's highlight, eased in and out
  lift: new Float32Array(MAX_CELLS), liftV: new Float32Array(MAX_CELLS),   // per tile: mouse lift, on a spring
  filter: 'all', size: null,
  filt: new Float32Array(MAX_CELLS), filtT: new Float32Array(MAX_CELLS),
  filtAt: new Float64Array(MAX_CELLS), filtNext: new Float32Array(MAX_CELLS),   // a filter change travels as a wave
  hiReady: new Uint8Array(photos.length),
  touchHoldUntil: 0,
};

function readScroll() {
  const top = wall.offsetTop;
  S.scroll = Math.min(Math.max(scrollY - top, 0), Math.max(L.height - L.h, 0));
  S.stageTop = stage.getBoundingClientRect().top;
}

// ---------------------------------------------------------------- WebGL
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
let prog, U = {}, texLo, texHi, texMeta, metaBuf, dpr = 1;

const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

// Under the mouse a tile lifts off the wall: 7% bigger, over the gap, with a soft shadow.
// It rises and settles back on the same critically damped spring, so in and out feel alike.
const LIFT = 0.07, LIFT_W = 13;
const liftI = new Float32Array(8), liftK = new Float32Array(8), liftU = new Float32Array(16);
let liftN = 0;

const FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform vec2 uRes; uniform float uDpr;
uniform vec4 uLayout;          // pad, gap, tile, cols (css px)
uniform vec3 uView;            // count, scroll, top
uniform vec3 uLight;           // x, y, radius (css px, stage space)
uniform float uLightK, uHide, uDim;
uniform vec2 uLift[8];         // lifted tiles: cell index, amount (biggest first)
uniform sampler2D uLo; uniform vec2 uLoGrid;
uniform sampler2DArray uHi;
uniform sampler2D uMeta;
out vec4 o;

float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }

void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec3 bg = vec3(0.110, 0.106, 0.098);
  float pad = uLayout.x, gap = uLayout.y, tile = uLayout.z, cols = uLayout.w;
  float stepPx = tile + gap;
  vec2 pos = vec2(frag.x - pad, frag.y + uView.y - uView.z);
  vec2 cell = floor(pos / stepPx);
  float idx = cell.y * cols + cell.x;

  // a tile lifted by the mouse grows over the gap, on top of its neighbours, and casts a
  // soft shadow a little below itself
  float lift = 0.0, shadow = 0.0;
  bool lifted = false;
  for (int j = 0; j < 8; j++) {
    float lk = uLift[j].y;
    if (lk <= 0.0) break;
    vec2 lcell = vec2(mod(uLift[j].x, cols), floor(uLift[j].x / cols));
    vec2 ctr = lcell * stepPx + tile * 0.5;
    float hs = tile * 0.5 * (1.0 + ${LIFT} * lk), rad = 5.0 * (1.0 + ${LIFT} * lk);
    vec2 dq = abs(pos - ctr) - (hs - rad);
    float rr = length(max(dq, 0.0)) + min(max(dq.x, dq.y), 0.0) - rad;
    if (!lifted && rr < 1.0) { lifted = true; lift = lk; cell = lcell; idx = uLift[j].x; }
    vec2 ds = abs(pos - ctr - vec2(0.0, tile * 0.05 * lk)) - (hs - rad);
    float rs = length(max(ds, 0.0)) + min(max(ds.x, ds.y), 0.0) - rad;
    shadow = max(shadow, (1.0 - smoothstep(-tile * 0.04, tile * 0.16, rs)) * lk);
  }

  vec2 local = pos - cell * stepPx;
  ivec2 mi = ivec2(int(clamp(idx, 0.0, 255.0)), 0);
  vec4 meta = texelFetch(uMeta, mi, 0);
  vec4 m2 = texelFetch(uMeta, mi + ivec2(0, 1), 0);
  float hov = m2.r;                   // the light's highlight on this tile
  float appear = m2.g;                // the intro: hidden until its pair has come out of the box
  float flash = m2.b * 0.65;          // and lit as it lands, settling into the dark
  bool inside = (lifted || (pos.x >= 0.0 && pos.y >= 0.0 && cell.x < cols && local.x <= tile && local.y <= tile))
                && idx < uView.x && abs(idx - uHide) > 0.5;
  float sc = 1.0 + ${LIFT} * lift;
  vec2 lc = (local - tile * 0.5) / sc + tile * 0.5;

  float d = distance(frag, uLight.xy);
  float lightF = uLightK * (1.0 - smoothstep(uLight.z * 0.16, uLight.z, d));

  float layer = floor(meta.r * 255.0 + 0.5);
  vec2 uv = (lc / tile - 0.5) / (1.0 + 0.03 * hov) + 0.5;
  vec2 gx = vec2(1.0 / (tile * uDpr * sc * (1.0 + 0.03 * hov)), 0.0), gy = vec2(0.0, gx.x);
  vec3 hi = textureGrad(uHi, vec3(clamp(uv, 0.0, 1.0), layer), gx, gy).rgb;
  vec2 cellLo = vec2(mod(layer, uLoGrid.x), floor(layer / uLoGrid.x));
  vec3 lo = textureGrad(uLo, (cellLo + clamp(uv, 0.02, 0.98)) / uLoGrid, gx / uLoGrid, gy / uLoGrid).rgb;
  vec3 c = mix(lo, hi, meta.b);

  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 dark = mix(vec3(lum), c, 0.10) * 0.27 + vec3(0.012, 0.013, 0.016);
  vec3 lit = clamp((c - 0.5) * 1.04 + 0.5, 0.0, 1.0);
  float k = clamp(max(lightF, meta.g * 0.95) + hov * 0.3 + lift * 0.12 + flash, 0.0, 1.0);
  vec3 tileCol = mix(dark, lit, k);

  // rounded tile corners, antialiased
  vec2 q = abs(lc - tile * 0.5) - (tile * 0.5 - 5.0);
  float r = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 5.0;
  float edge = clamp(0.5 - r * sc * uDpr, 0.0, 1.0) * (inside ? appear : 0.0);

  // the light also falls on the gaps, faintly, like on a real wall
  vec3 col = mix(bg + vec3(0.050, 0.044, 0.034) * lightF, tileCol, edge);
  col *= 1.0 - 0.5 * shadow * (lifted ? 1.0 - edge : 1.0);     // on the wall around it, not on itself
  col *= mix(1.0, 0.32, uDim);
  vec2 vv = frag / (uRes / uDpr) - 0.5;
  col *= 1.0 - dot(vv, vv) * 0.6;
  col += (hash(gl_FragCoord.xy) - 0.5) * 0.024;
  o = vec4(col, 1.0);
}`;

function shader(type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

function initGL() {
  prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  for (const n of ['uRes', 'uDpr', 'uLayout', 'uView', 'uLight', 'uLightK', 'uHide', 'uDim', 'uLo', 'uLoGrid', 'uHi', 'uMeta', 'uLift'])
    U[n] = gl.getUniformLocation(prog, n);

  // low-res atlas: a 1x1 placeholder until it arrives
  texLo = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texLo);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([28, 27, 25, 255]));
  setFilter(gl.TEXTURE_2D, false);

  // full-res tiles: one layer per photo, 320 px, mipmapped
  texHi = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texHi);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 9, gl.RGBA8, 320, 320, photos.length);
  setFilter(gl.TEXTURE_2D_ARRAY, true);

  // per-cell data. Row 0: layer, brand-filter light, full-res ready. Row 1: highlight, shown, flash.
  texMeta = gl.createTexture();
  metaBuf = new Uint8Array(MAX_CELLS * 4 * 2);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texMeta);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, MAX_CELLS, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, metaBuf);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  gl.uniform1i(U.uLo, 0); gl.uniform1i(U.uHi, 1); gl.uniform1i(U.uMeta, 2);
}

function setFilter(target, mips) {
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

const tileURL = (key, size = 320) => `assets/img/t/${key}-${size}.webp`;
const loadBitmap = url => fetch(url).then(r => r.blob()).then(b => createImageBitmap(b));

async function loadTextures() {
  try {
    const lo = await loadBitmap('assets/img/atlas-lo.webp');
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texLo);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, lo);
    loGrid = [catalog.atlas.cols, catalog.atlas.rows];
    loReady = true;
    invalidate();
  } catch {}
  if (introDone) {
    // No intro: sharp tiles wait until the text has painted, so they don't compete
    // with the fonts on a slow connection; the low-res wall is already on screen.
    await Promise.all([document.fonts.ready, document.readyState === 'complete' ? 0 : new Promise(r => addEventListener('load', r, { once: true }))]);
    await new Promise(r => window.requestIdleCallback ? requestIdleCallback(r, { timeout: 400 }) : setTimeout(r, 120));
  }
  // (during the intro the box covers the page, so they load straight away and the wall opens sharp)
  // in wall order so the first screen sharpens first
  let next = 0, pendingMips = 0, mipTimer = 0, loaded = 0;
  const flushMips = () => {
    mipTimer = 0; pendingMips = 0;
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texHi);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    for (let i = 0; i < photos.length; i++) if (S.hiReady[i] === 1) S.hiReady[i] = 2;
    invalidate();
  };
  const worker = async () => {
    while (next < photos.length) {
      const i = next++;
      try {
        const bmp = await loadBitmap(tileURL(photos[i].key));
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D_ARRAY, texHi);
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, 320, 320, 1, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
        bmp.close && bmp.close();
        S.hiReady[i] = 1; pendingMips++;
        introProgress(++loaded);
        // the sharp tiles' smaller sizes are made in batches: often once the wall shows, rarely while
        // the closed box still hides it (each batch redoes the whole set, which is work for the GPU)
        if (!mipTimer) mipTimer = setTimeout(flushMips, introOpenedAt || introDone ? 120 : 1000);
      } catch {}
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  if (pendingMips) flushMips();
}
let loGrid = [16, 1], loReady = false;


function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  const w = stage.clientWidth, h = stage.clientHeight;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
}

function draw() {
  if (!gl) return;
  const now = performance.now();
  for (let i = 0; i < L.count; i++) {
    const layer = cells[i], land = S.landAt[i], j = (MAX_CELLS + i) * 4;
    metaBuf[i * 4] = layer;
    metaBuf[i * 4 + 1] = Math.round(S.filt[i] * 255);
    metaBuf[i * 4 + 2] = S.hiReady[layer] === 2 ? 255 : 0;
    metaBuf[j] = Math.round(S.hl[i] * 255);
    metaBuf[j + 1] = now >= land ? 255 : 0;                                           // landed (0 = always there)
    metaBuf[j + 2] = land > 0 && now >= land ? Math.round(Math.max(0, 1 - (now - land) / 700) * 255) : 0;
  }
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texMeta);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, MAX_CELLS, 2, gl.RGBA, gl.UNSIGNED_BYTE, metaBuf);
  for (let j = 0; j < 8; j++) { liftU[j * 2] = j < liftN ? liftI[j] : 0; liftU[j * 2 + 1] = j < liftN ? liftK[j] : 0; }
  gl.uniform2fv(U.uLift, liftU);
  gl.uniform2f(U.uRes, canvas.width, canvas.height);
  gl.uniform1f(U.uDpr, dpr);
  gl.uniform4f(U.uLayout, L.pad, L.gap, L.tile, L.cols);
  gl.uniform3f(U.uView, loReady ? L.count : 0, S.scroll, L.top);
  const radius = touchFirst ? Math.max(190, L.w * 0.52) : Math.max(220, Math.min(L.w, L.h) * 0.28);
  gl.uniform3f(U.uLight, S.lx, S.ly, radius);
  gl.uniform1f(U.uLightK, S.k);
  gl.uniform1f(U.uHide, S.hide);
  gl.uniform1f(U.uDim, S.dim);
  gl.uniform2f(U.uLoGrid, loGrid[0], loGrid[1]);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// ---------------------------------------------------------------- frame loop
let raf = 0, last = 0;
const invalidate = () => { if (!raf) raf = requestAnimationFrame(frame); };
const approach = (v, target, dt, tau) => target + (v - target) * Math.exp(-dt / tau);

function frame(now) {
  raf = 0;
  const dt = Math.min(64, last ? now - last : 16);
  last = now;
  let moving = false;

  // the light drifts by itself when nobody is using it (longer to wait while a mouse rests on the wall)
  const idle = introDone && !sheetPair && now - S.lastInput > (S.mouseIn ? 20000 : 5000);
  if (idle) {
    S.mode = 'idle';
    const s = now / 1000;
    const band = driftBottom();                        // the wall above the text, the box included
    S.tx = L.w * (0.5 + 0.36 * Math.sin(s * 0.31 + 0.6));
    S.ty = L.top + (band - L.top) * (0.5 + 0.42 * Math.sin(s * 0.47 + 1.9)) - S.stageTop;
    S.tk = 1;
    moving = true;
  } else if (S.mode === 'touch' && !S.input && now > S.touchHoldUntil) {
    S.tk = 0;
  }

  const px = S.lx, py = S.ly;
  S.lx = approach(S.lx, S.tx, dt, S.mode === 'idle' ? 260 : 60);
  S.ly = approach(S.ly, S.ty, dt, S.mode === 'idle' ? 260 : 60);
  S.k = approach(S.k, S.tk, dt, S.tk > S.k ? 70 : 380);
  S.dim = approach(S.dim, S.tdim, dt, 110);
  if (Math.abs(S.lx - S.tx) + Math.abs(S.ly - S.ty) > 0.3 || Math.abs(S.k - S.tk) > 0.004 || Math.abs(S.dim - S.tdim) > 0.004) moving = true;

  for (let i = 0; i < L.count; i++) {
    if (S.filtAt[i]) { if (now >= S.filtAt[i]) { S.filtT[i] = S.filtNext[i]; S.filtAt[i] = 0; } else moving = true; }
    const f = approach(S.filt[i], S.filtT[i], dt, 110);
    if (Math.abs(f - S.filtT[i]) > 0.004) moving = true;
    S.filt[i] = Math.abs(f - S.filtT[i]) > 0.004 ? f : S.filtT[i];
  }

  // the hint rides with the wall and fades as it scrolls on (eased, so coarse scroll steps still glide)
  F.tp = introDone ? clamp01(S.scroll / (L.h * 0.4)) : 0;
  F.p = Math.abs(F.p - F.tp) < 0.002 ? F.tp : approach(F.p, F.tp, dt, 70);
  if (F.p !== F.tp) moving = true;
  syncFirstScreen();

  // which pair sits under the light: it brightens, and lets go as smoothly as it came
  const h = S.k > 0.35 && !sheetPair ? cellAt(S.lx, S.ly + S.stageTop) : -1;
  if (h !== S.hover && h >= 0 && introLanded && (S.mode === 'mouse' || S.mode === 'touch')) {
    const col = h % L.cols;
    snd.plink(col, Math.floor(h / L.cols), ((col + 0.5) / L.cols - 0.5) * 1.2);
  }
  S.hover = h;
  if (S.mode === 'mouse' || S.mode === 'touch') snd.motion(Math.hypot(S.lx - px, S.ly - py) / dt);
  // the mouse only: the tile under the pointer lifts. Nothing new lifts while the page
  // scrolls (like a browser's own hover), then the tile that ends up under it does.
  const lt = S.mouseIn && introLanded && !sheetPair && now - S.scrollAt > 140 ? cellAt(S.mx, S.my) : -1;
  if (S.mouseIn) canvas.classList.toggle('over-tile', lt >= 0);
  const sdt = dt / 1000, ew = Math.exp(-LIFT_W * sdt);
  liftN = 0;
  for (let i = 0; i < L.count; i++) {
    const ht = i === h ? 1 : 0;
    if (S.hl[i] !== ht) {
      const v = approach(S.hl[i], ht, dt, 90);
      S.hl[i] = Math.abs(v - ht) < 0.004 ? ht : v;
      if (S.hl[i] !== ht) moving = true;
    }
    const target = i === lt ? 1 : 0;
    let x = S.lift[i], v = S.liftV[i];
    if (x !== target || v !== 0) {                     // critically damped spring, exact for any frame time
      const d = x - target, c = v + LIFT_W * d;
      x = target + (d + c * sdt) * ew; v = (v - LIFT_W * c * sdt) * ew;
      if (Math.abs(x - target) < 0.0015 && Math.abs(v) < 0.02) { x = target; v = 0; } else moving = true;
      S.lift[i] = x; S.liftV[i] = v;
    }
    if (x > 0.002) pushLift(i, x);
  }

  if (placeLabel(dt)) moving = true;
  draw();
  if (now < S.flashUntil) moving = true;
  if (moving || px !== S.lx) invalidate();
}

// the lifted tiles for the shader, biggest first (at most eight; a ninth is a tile all but settled)
function pushLift(i, x) {
  if (liftN === 8 && x <= liftK[7]) return;
  let j = Math.min(liftN, 7);
  while (j > 0 && liftK[j - 1] < x) { liftK[j] = liftK[j - 1]; liftI[j] = liftI[j - 1]; j--; }
  liftK[j] = x; liftI[j] = i;
  if (liftN < 8) liftN++;
}

// the idle light keeps to the wall above the hint while the hint is on screen
function driftBottom() { return F.p < 0.5 && L.hintTop > L.top + L.tile ? L.hintTop - 8 : L.h; }

// ---------------------------------------------------------------- the first screen on scroll
// The hint is moved in the same frame the wall is drawn, by the same scroll the shader uses,
// and fades as the wall scrolls on; the shade behind it fades with it.
const F = { p: 0, tp: 0 };
const introShade = $('#intro-shade');
const clamp01 = v => Math.min(1, Math.max(0, v));
const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const written = new WeakMap();
function put(el, prop, v) {                             // style writes only when the value changes
  let c = written.get(el); if (!c) written.set(el, c = {});
  if (c[prop] !== v) { c[prop] = v; el.style[prop] = v; }
}
function syncFirstScreen() {
  if (!introDone || html.classList.contains('no-gl')) return;
  const y = +(S.stageTop - S.scroll).toFixed(2), text = smooth(F.p / 0.6);
  put(introText, 'transform', y || text ? `translate3d(0, ${(y - 18 * text).toFixed(2)}px, 0)` : '');
  put(introText, 'opacity', text ? (1 - text).toFixed(3) : '');
  put(introShade, 'opacity', F.p ? (1 - smooth(F.p)).toFixed(3) : '');
  const gone = F.p >= 0.999;
  if (intro.classList.contains('gone') !== gone) intro.classList.toggle('gone', gone);
}

// ---------------------------------------------------------------- label
// The name and price glide from tile to tile; the words swap with a short fade.
let labelFor = -1, labX = 0, labY = 0, labOn = false;
function placeLabel(dt) {
  const show = introLanded && S.hover >= 0 && S.hl[S.hover] > 0.35 && S.k > 0.4;
  if (!show) { if (labOn) { label.classList.remove('on'); labOn = false; } return false; }
  const cell = S.hover, photo = photos[layerOf(cell)], pair = pairs.get(photo.pair);
  if (labelFor !== cell) {
    const words = document.createElement('span');
    words.append(document.createTextNode(name(pair)));
    const b = document.createElement('b'); b.textContent = price(pair); words.append(b);
    label.replaceChildren(words);
    if (labOn) words.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
    labelFor = cell;
  }
  const r = cellRect(cell), g = L.tile * LIFT * 0.5 * S.lift[cell];   // a lifted tile is a little bigger
  const lw = label.offsetWidth, lh = label.offsetHeight;
  let x = r.x - g + 8, y = r.y + r.h + g - lh - 8;
  x = Math.min(Math.max(8, x), L.w - lw - 8);
  y = Math.min(Math.max(64, y), innerHeight - lh - 80);
  if (!labOn) { labX = x; labY = y; labOn = true; label.classList.add('on'); }
  else { labX = approach(labX, x, dt, 55); labY = approach(labY, y, dt, 55); }
  label.style.transform = `translate3d(${labX.toFixed(1)}px, ${labY.toFixed(1)}px, 0)`;
  return Math.abs(labX - x) + Math.abs(labY - y) > 0.4;
}

// ---------------------------------------------------------------- input
function stagePoint(e) { return { x: e.clientX, y: e.clientY - S.stageTop }; }
let down = null;
// Browsers send a synthetic mouse move on load (at 0,0 on touch phones). Only a move
// that actually travels counts as a mouse; until then the idle light keeps drifting.
let mouseSeen = false;

canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  if (!mouseSeen) { if (!e.movementX && !e.movementY) return; mouseSeen = true; }
  const p = stagePoint(e);
  S.mode = 'mouse'; S.lastInput = performance.now();
  S.mx = e.clientX; S.my = e.clientY; S.mouseIn = true;
  S.tx = p.x; S.ty = p.y; S.tk = 1;
  if (S.k < 0.05) { S.lx = p.x; S.ly = p.y; }
  canvas.classList.toggle('over-tile', cellAt(e.clientX, e.clientY) >= 0);
  invalidate();
});
canvas.addEventListener('pointerleave', e => {
  if (e.pointerType === 'touch' || !mouseSeen) return;
  S.mouseIn = false;
  S.tk = 0; S.lastInput = performance.now(); invalidate();
});
// a tap is judged by the events' own times, so one slow frame can't turn it into a long press
canvas.addEventListener('pointerdown', e => {
  down = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId, type: e.pointerType };
  if (e.pointerType === 'touch') { S.mouseIn = false; touchLight(e.clientX, e.clientY, true); }
});
canvas.addEventListener('pointercancel', () => { down = null; });
canvas.addEventListener('pointerup', e => {
  if (!down || down.id !== e.pointerId) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), held = e.timeStamp - down.t;
  down = null;
  if (moved < 12 && held < 600) {
    const i = cellAt(e.clientX, e.clientY);
    if (i >= 0) openFromCell(i);
  }
});

// touch: the light follows the finger, even while the page scrolls
function touchLight(x, y, jump) {
  if (!introDone) return;
  S.mode = 'touch'; S.input = true; S.lastInput = performance.now();
  S.tx = x; S.ty = y - S.stageTop; S.tk = 1;
  if (jump) { S.lx = S.tx; S.ly = S.ty; }
  invalidate();
}
stage.addEventListener('touchstart', e => { const t0 = e.touches[0]; touchLight(t0.clientX, t0.clientY, true); }, { passive: true });
stage.addEventListener('touchmove', e => { const t0 = e.touches[0]; touchLight(t0.clientX, t0.clientY, false); }, { passive: true });
const touchEnd = () => { S.input = false; S.touchHoldUntil = performance.now() + 1400; S.lastInput = performance.now(); invalidate(); };
stage.addEventListener('touchend', touchEnd, { passive: true });
stage.addEventListener('touchcancel', touchEnd, { passive: true });

let settleTimer = 0;
addEventListener('scroll', () => {
  readScroll();
  S.scrollAt = performance.now();
  if (S.mode === 'mouse' && S.k > 0.05) canvas.classList.remove('over-tile');
  clearTimeout(settleTimer); settleTimer = setTimeout(invalidate, 160);   // then the tile under the mouse lifts
  invalidate();
}, { passive: true });

let resizeTimer = 0;
addEventListener('resize', () => {
  if (html.classList.contains('no-gl')) return;        // the plain grid lays itself out
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { layout(); resize(); readScroll(); applyFilter(S.filter, true); invalidate(); }, 80);
});

// ---------------------------------------------------------------- filters: size first, then brand
// "Do you have my size?" is the question customers ask most, so size leads: pick one and
// only the pairs in stock in that size light up. Brand narrows it further.
const filters = $('#filters'), sizePop = $('#size-pop');
const allSizes = [...new Set(catalog.pairs.flatMap(p => p.sizes))].sort((a, b) => a - b);
const inStock = (p, s) => p.sizes.includes(s) && !p.soldOut.includes(s);
const matches = p => (S.filter === 'all' || p.brand === S.filter) && (S.size == null || inStock(p, S.size));

function renderFilters() {
  filters.innerHTML = '';
  const sz = document.createElement('button');
  sz.type = 'button'; sz.className = 'chip size-chip'; sz.id = 'size-chip';
  sz.setAttribute('aria-haspopup', 'dialog');
  sz.setAttribute('aria-expanded', String(sizePop.classList.contains('open')));
  sz.setAttribute('aria-pressed', String(S.size != null));
  sz.textContent = S.size == null ? t('sizeChip') : t('sizeChipOn', S.size);
  sz.addEventListener('click', () => sizePop.classList.contains('open') ? closeSizePop() : openSizePop());
  filters.append(sz);
  for (const b of ['all', ...brands]) {
    const chip = document.createElement('button');
    chip.type = 'button'; chip.className = 'chip'; chip.dataset.brand = b;
    chip.textContent = b === 'all' ? t('all') : b;
    chip.setAttribute('aria-pressed', String(S.filter === b));
    // with a size picked, a brand that has nothing in it can't be chosen: no dark dead end
    chip.disabled = b !== 'all' && S.size != null && !catalog.pairs.some(p => p.brand === b && inStock(p, S.size));
    chip.addEventListener('click', () => applyFilter(b, false, centreOf(chip)));
    filters.append(chip);
  }
  renderSizePop();
}

function renderSizePop() {
  $('#size-pop-title').textContent = t('sizePopTitle');
  const clear = $('#size-clear');
  clear.textContent = t('allSizes');
  clear.hidden = S.size == null;
  sizePop.setAttribute('aria-label', t('sizePopTitle'));
  const grid = $('#size-grid'); grid.innerHTML = '';
  for (const s of allSizes) {
    const n = catalog.pairs.filter(p => inStock(p, s) && (S.filter === 'all' || p.brand === S.filter)).length;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'size'; b.textContent = s;
    b.disabled = n === 0;
    b.setAttribute('aria-pressed', String(S.size === s));
    b.setAttribute('aria-label', t('sizeOption', s, n));
    b.addEventListener('click', () => setSize(s));
    grid.append(b);
  }
}
function openSizePop() {
  renderSizePop();
  snd.size();
  sizePop.classList.add('open'); sizePop.setAttribute('aria-hidden', 'false');
  $('#size-chip')?.setAttribute('aria-expanded', 'true');
  ($('#size-grid [aria-pressed="true"]') || $('#size-grid .size:not(:disabled)'))?.focus({ preventScroll: true });
}
function closeSizePop(refocus = false) {
  if (!sizePop.classList.contains('open')) return;
  sizePop.classList.remove('open'); sizePop.setAttribute('aria-hidden', 'true');
  $('#size-chip')?.setAttribute('aria-expanded', 'false');
  if (refocus) $('#size-chip')?.focus({ preventScroll: true });
}
const centreOf = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
function setSize(s) {
  S.size = s;
  closeSizePop();
  renderFilters();
  applyFilter(S.filter, false, $('#size-chip') ? centreOf($('#size-chip')) : null);
  $('#size-chip')?.focus({ preventScroll: true });
}
$('#size-clear').addEventListener('click', () => setSize(null));
document.addEventListener('pointerdown', e => {
  if (sizePop.classList.contains('open') && !sizePop.contains(e.target) && !e.target.closest('#size-chip')) closeSizePop();
});

// A filter change spreads across the wall as a wave of light from the chip that was pressed.
function applyFilter(b, instant = false, from = null) {
  S.filter = b;
  const active = b !== 'all' || S.size != null, now = performance.now();
  for (let i = 0; i < MAX_CELLS; i++) {
    const on = active && i < L.count && matches(pairs.get(photos[layerOf(i)].pair)) ? 1 : 0;
    if (instant || !from || i >= L.count) {
      S.filtT[i] = on; S.filtAt[i] = 0;
      if (instant) S.filt[i] = on;
      continue;
    }
    const r = cellRect(i);
    S.filtNext[i] = on;
    S.filtAt[i] = now + Math.min(650, Math.hypot(r.x + r.w / 2 - from.x, r.y + r.h / 2 - from.y) / 1.5);
  }
  if (from && !instant) snd.wave((from.x / innerWidth - 0.5) * 1.2);
  filters.querySelectorAll('.chip[data-brand]').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.brand === b)));
  // the plain grid (no WebGL) shows the same thing: matching photos in colour
  document.querySelectorAll('#fallback button').forEach(btn => btn.classList.toggle('lit', active && matches(pairs.get(btn.dataset.pair))));
  renderCount();
  invalidate();
}
function renderCount() {
  const n = catalog.pairs.filter(matches).length;
  const b = S.filter === 'all' ? null : S.filter;
  $('#count').textContent = S.size != null ? t('countSize', n, S.size, b) : b ? t('countBrand', n, b) : t('count', n);
}

// accessible list of pairs (screen readers, keyboard)
function renderPairList() {
  const ul = $('#pair-list'); ul.innerHTML = '';
  for (const p of catalog.pairs) {
    const li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button';
    b.textContent = `${name(p)}, ${p.color[lang]}, ${price(p)}`;
    b.addEventListener('click', () => {
      const cell = firstCellOf(p.id);
      cell >= 0 && isCellVisible(cell) ? openFromCell(cell) : openSheet(p.id, p.photos[0], null);
    });
    b.addEventListener('focus', () => {
      const cell = firstCellOf(p.id);
      if (cell < 0) return;
      const r = cellRect(cell);
      if (!isCellVisible(cell)) scrollTo({ top: scrollY + r.y - innerHeight * 0.3, behavior: 'smooth' });
      S.mode = 'focus'; S.lastInput = performance.now() + 6e4;
      const r2 = cellRect(cell);
      S.tx = r2.x + r2.w / 2; S.ty = r2.y + r2.h / 2 - S.stageTop; S.tk = 1; invalidate();
    });
    li.append(b); ul.append(li);
  }
}
const firstCellOf = id => { for (let i = 0; i < L.count; i++) if (cells[i] !== HOLE && photos[cells[i]].pair === id) return i; return -1; };
const isCellVisible = i => { const r = cellRect(i); return r.y > 40 && r.y + r.h < innerHeight - 40; };

// ---------------------------------------------------------------- the pair window
// Opens over the wall like the box being opened: a bottom sheet on phones, a window from
// tablet width up. The photo flies from its place on the wall into the window and back.
const sheet = $('#sheet'), sheetWin = $('#sheet-win'), sheetBackdrop = $('#sheet-backdrop'), sheetBody = $('#sheet-body');
const gallery = $('#gallery'), thumbs = $('#gallery-thumbs'), sheetLid = $('#sheet-lid');
let sheetPair = null, sheetKey = null, sheetCell = -1, pickedSize = null, lastFocus = null, opening = null;
let sheetAnims = [];
const windowed = () => matchMedia('(min-width: 760px)').matches;
const sheetRun = (el, keyframes, opts) => { const a = el.animate(keyframes, opts); sheetAnims.push(a); return a; };

function pictureFor(key, eager) {
  const pic = document.createElement('picture');
  pic.style.backgroundImage = `url(${tileURL(key)})`;
  const sizes = '(min-width: 1000px) 1080px, (min-width: 760px) 620px, 100vw';   // wide: sharp enough for the lens
  const set = ext => [480, 720, 1080].map(s => `assets/img/p/${key}-${s}.${ext} ${s}w`).join(', ');
  const src = document.createElement('source');
  src.type = 'image/avif'; src.srcset = set('avif'); src.sizes = sizes;
  const img = document.createElement('img');
  img.srcset = set('webp'); img.sizes = sizes; img.src = `assets/img/p/${key}-720.webp`;
  img.width = 1080; img.height = 1080; img.decoding = 'async'; img.alt = '';
  img.loading = eager ? 'eager' : 'lazy';
  if (eager) img.fetchPriority = 'high';
  pic.append(src, img);
  return pic;
}

function fillSheet(pairId, key, resetSize = true) {
  const p = pairs.get(pairId);
  sheetPair = pairId; sheetKey = key;
  $('#sheet-maker').textContent = p.model ? p.brand : '';
  $('#sheet-title').textContent = p.model || p.brand;
  $('#sheet-color').textContent = p.color[lang];
  $('#sheet-price').textContent = price(p);
  const photosOf = [key, ...p.photos.filter(k => k !== key)];
  if (resetSize) {
    gallery.innerHTML = ''; photoAt = 1;
    photosOf.forEach((k, i) => gallery.append(pictureFor(k, i === 0)));
    gallery.scrollLeft = 0;
  }
  // thumbnails (wide screens): the same photos, one click away
  thumbs.innerHTML = '';
  photosOf.forEach((k, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', t('thumb', i + 1));
    const im = new Image(); im.src = tileURL(k, 160); im.alt = '';
    b.append(im);
    b.addEventListener('click', () => gallery.scrollTo({ left: i * gallery.clientWidth, behavior: 'smooth' }));
    thumbs.append(b);
  });
  updateCount();
  const fbid = photos.find(x => x.key === key)?.fbid;
  $('#sheet-fb').href = fbid ? `https://www.facebook.com/photo/?fbid=${fbid}` : `https://www.facebook.com/${PAGE}`;
  const box = $('#sizes'); box.innerHTML = '';
  box.setAttribute('aria-label', t('sizeTitle'));
  // arriving with a size filter on: that size is already picked when the pair has it
  if (resetSize) pickedSize = S.size != null && inStock(p, S.size) ? S.size : null;
  for (const s of p.sizes) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'size'; b.textContent = s;
    const sold = p.soldOut.includes(s);
    b.disabled = sold;
    if (sold) b.setAttribute('aria-label', `${s}, ${t('soldOut')}`);
    b.setAttribute('aria-pressed', String(pickedSize === s));
    b.addEventListener('click', () => {
      const first = pickedSize == null;
      pickedSize = s; fillSizesState(); ignite(); navigator.vibrate?.(8);
      snd.size(); if (first) setTimeout(snd.ready, 70);             // the order is ready: a small bell
    });
    box.append(b);
  }
  fillSizesState();
  renderRelated(p);
}

function fillSizesState() {
  const p = pairs.get(sheetPair);
  $('#sizes').querySelectorAll('.size').forEach(b => b.setAttribute('aria-pressed', String(Number(b.textContent) === pickedSize)));
  $('#size-picked').textContent = pickedSize ? t('picked', pickedSize) : t('inStock', p.sizes.length - p.soldOut.length, p.sizes.length);
  const order = $('#order');
  if (pickedSize) {
    order.setAttribute('aria-disabled', 'false');
    order.href = `https://m.me/${PAGE}?text=${encodeURIComponent(t('orderMsg', p, pickedSize))}`;
    $('#order-hint').textContent = t('ready', pickedSize);
  } else {
    order.setAttribute('aria-disabled', 'true');
    order.href = `https://m.me/${PAGE}`;
    $('#order-hint').textContent = t('pickSize');
  }
}

// three more pairs to look at without leaving: same brand first, then the size picked
function renderRelated(p) {
  const list = $('#related'); list.innerHTML = '';
  // varied: one of each model, at most two from the same brand
  const score = x => (x.brand === p.brand ? 2 : 0) + (S.size != null && inStock(x, S.size) ? 1 : 0);
  const pick = [], models = new Set([p.model || p.brand]);
  for (const x of catalog.pairs.filter(x => x.id !== p.id).sort((a, b) => score(b) - score(a))) {
    const m = x.model || x.brand;
    if (pick.length === 3 || models.has(m) || (x.brand === p.brand && pick.filter(y => y.brand === p.brand).length === 2)) continue;
    pick.push(x); models.add(m);
  }
  for (const x of pick) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rel';
    b.setAttribute('aria-label', `${name(x)}, ${x.color[lang]}, ${price(x)}`);
    const im = new Image(); im.src = tileURL(x.photos[0]); im.alt = ''; im.loading = 'lazy';
    const nm = document.createElement('span'); nm.textContent = name(x);
    const pr = document.createElement('b'); pr.textContent = price(x);
    b.append(im, nm, pr);
    b.addEventListener('click', () => switchPair(x.id));
    list.append(b);
  }
}

// another pair in the same window: a quick crossfade, Back still closes the window
function switchPair(id) {
  if (!sheetPair || id === sheetPair) return;
  const p = pairs.get(id);
  const swap = () => {
    fillSheet(id, p.photos[0], true);
    sheetBody.scrollTop = 0; $('.details').scrollTop = 0;
    const cell = firstCellOf(id);
    sheetCell = cell >= 0 && isCellVisible(cell) ? cell : -1;
    S.hide = sheetCell; invalidate();
    history.replaceState({ sheet: id }, '', '#' + id);
  };
  const out = sheetBody.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'linear', fill: 'forwards' });
  out.onfinish = () => {
    swap(); out.cancel();
    sheetBody.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' });
  };
}

let photoAt = 1;
function updateCount() {
  const n = gallery.children.length;
  const i = Math.min(n, Math.round(gallery.scrollLeft / Math.max(1, gallery.clientWidth)) + 1);
  if (i !== photoAt) { photoAt = i; if (sheetPair && !opening) snd.swipe(); }
  $('#gallery-count').textContent = t('photo', i, n);
  thumbs.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-current', String(k === i - 1)));
}
gallery.addEventListener('scroll', updateCount, { passive: true });

// the order button lights up once there is a size to order
function ignite() { const o = $('#order'); o.classList.remove('ignite'); void o.offsetWidth; o.classList.add('ignite'); }

// a lens on the photo with a mouse: it zooms in where the pointer is and follows it
const lensOK = matchMedia('(min-width: 1000px) and (hover: hover)');
let zoomed = null;
const unzoom = () => { if (zoomed) { zoomed.classList.remove('zoom'); zoomed = null; } };
gallery.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || !lensOK.matches || opening) return;
  const pic = e.target.closest('picture'); if (!pic) return;
  const r = pic.getBoundingClientRect(), img = pic.querySelector('img');
  img.style.transformOrigin = `${((e.clientX - r.left) / r.width * 100).toFixed(1)}% ${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`;
  if (zoomed !== pic) { unzoom(); zoomed = pic; pic.classList.add('zoom'); }
});
gallery.addEventListener('pointerleave', unzoom);
gallery.addEventListener('scroll', unzoom, { passive: true });

// share a pair: the phone's share sheet, or the link copied on a computer
$('#sheet-share').addEventListener('click', async () => {
  const p = pairs.get(sheetPair); if (!p) return;
  const url = location.origin + location.pathname + '#' + p.id;
  if (navigator.share && touchFirst) { try { await navigator.share({ title: `${name(p)} • Sneakerbox`, text: `${name(p)}, ${price(p)}`, url }); } catch {} return; }
  try { await navigator.clipboard.writeText(url); toast(t('linkCopied')); snd.copy(); } catch { toast(url); }
});

$('#order').addEventListener('click', async e => {
  if (!pickedSize) {
    e.preventDefault();
    const hint = $('#order-hint');
    hint.textContent = t('pickSize');
    hint.animate?.([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 260 });
    $('#sizes .size:not(:disabled)')?.focus();
    return;
  }
  try { await navigator.clipboard.writeText(t('orderMsg', pairs.get(sheetPair), pickedSize)); toast(t('copied')); } catch {}
});

function openFromCell(i) {
  const photo = photos[layerOf(i)];
  const r = cellRect(i), g = L.tile * LIFT * 0.5 * S.lift[i];
  openSheet(photo.pair, photo.key, { x: r.x - g, y: r.y - g, w: r.w + 2 * g, h: r.h + 2 * g }, i);
}

// The photo in flight between the wall (or the box) and the window. x and y are eased
// differently so it travels on a slight arc, and it casts a shadow as it lifts mid-way.
function flyPhoto(key, from, to, duration, radius = ['5px', '0px'], fadeOut = false) {
  const big = from.w >= to.w ? from : to;
  const outer = document.createElement('div'), inner = document.createElement('div');
  outer.className = 'flyer'; inner.className = 'flyer-in';
  Object.assign(inner.style, { width: big.w + 'px', height: big.h + 'px' });
  const img = new Image(); img.src = tileURL(key); img.alt = '';
  inner.append(img); outer.append(inner); document.body.append(outer);
  const anims = [
    outer.animate([{ transform: `translateX(${from.x}px)` }, { transform: `translateX(${to.x}px)` }], { duration, easing: 'cubic-bezier(.42,.05,.18,1)' }),
    inner.animate([
      { transform: `translateY(${from.y}px) scale(${from.w / big.w})`, borderRadius: radius[0] },
      { transform: `translateY(${to.y}px) scale(${to.w / big.w})`, borderRadius: radius[1] },
    ], { duration, easing: 'cubic-bezier(.2,.78,.15,1)' }),
    inner.animate([{ boxShadow: '0 0 0 rgba(0,0,0,0)' }, { boxShadow: '0 24px 48px rgba(0,0,0,.5)', offset: 0.45 }, { boxShadow: '0 0 0 rgba(0,0,0,0)' }], { duration }),
  ];
  if (fadeOut) anims.push(outer.animate([{ opacity: 1 }, { opacity: 1, offset: 0.72 }, { opacity: 0 }], { duration }));
  const done = new Promise(r => { anims[0].onfinish = anims[0].oncancel = r; }).then(() => outer.remove());
  return { done, finish: () => anims.forEach(a => a.finish()) };
}

function openSheet(pairId, key, fromRect, cell = -1) {
  if (opening) return;
  closeSizePop();
  sheetAnims.forEach(a => a.cancel()); sheetAnims = [];
  lastFocus = document.activeElement;
  fillSheet(pairId, key, true);
  sheetBody.scrollTop = 0; $('.details').scrollTop = 0;
  sheetCell = cell;
  sheetWin.style.transform = '';
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  html.style.overflow = 'hidden';
  filters.classList.add('hidden');
  label.classList.remove('on');
  S.tdim = 1; S.tk = 0; invalidate();
  snd.open();
  if (location.hash !== '#' + pairId) history.pushState({ sheet: pairId }, '', '#' + pairId);
  $('#sheet-close').focus({ preventScroll: true });

  // the window arrives: on phones a sheet rises from the bottom; wider, a window settles in
  const win = windowed();
  const target = gallery.firstElementChild;
  const to = target.getBoundingClientRect();           // measured at its final place
  sheetRun(sheetBackdrop, [{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'linear' });
  sheetRun(sheetWin, win
    ? [{ opacity: 0, transform: 'translateY(16px) scale(.965)' }, { opacity: 1, transform: 'none' }]
    : [{ transform: 'translateY(100%)' }, { transform: 'none' }],
  { duration: win ? 440 : 480, easing: 'cubic-bezier(.2,.8,.2,1)' });
  // then the details, one line after another
  [...$('.details').children].forEach((el, i) => sheetRun(el,
    [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
    { duration: 320, delay: 200 + i * 35, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
  if (!fromRect || !target) return;
  // the photo flies from its place on the wall into the window
  target.style.visibility = 'hidden';
  S.hide = cell; invalidate();
  const f = flyPhoto(key, fromRect, { x: to.left, y: to.top, w: to.width, h: to.height }, win ? 620 : 560);
  opening = f;
  f.done.then(() => { target.style.visibility = ''; if (opening === f) opening = null; });
}

function closeSheet(fromHistory = false) {
  if (!sheetPair) return;
  if (opening) opening.finish();
  const cur = gallery.children[Math.round(gallery.scrollLeft / Math.max(1, gallery.clientWidth))];
  const backCell = sheetCell >= 0 && isCellVisible(sheetCell) && cur === gallery.firstElementChild ? sheetCell : -1;
  const key = sheetKey, dragged = sheetWin.style.transform || 'none';
  sheetPair = null; sheetCell = -1;
  sheetAnims.forEach(a => a.cancel()); sheetAnims = [];
  snd.close();
  sheet.setAttribute('aria-hidden', 'true');
  html.style.overflow = '';
  filters.classList.remove('hidden');
  S.tdim = 0; S.lastInput = performance.now(); invalidate();
  if (!fromHistory && history.state && history.state.sheet) history.back();
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  const done = () => { if (sheetPair) return; sheetAnims.forEach(a => a.cancel()); sheetAnims = []; sheet.classList.remove('open'); sheetWin.style.transform = ''; };

  const win = windowed();
  // the photo flies back to its place on the wall
  if (backCell >= 0 && cur) {
    const from = cur.getBoundingClientRect(), to = cellRect(backCell);
    cur.style.visibility = 'hidden';
    flyPhoto(key, { x: from.left, y: from.top, w: from.width, h: from.height }, to, 460, ['0px', '5px'])
      .done.then(() => { cur.style.visibility = ''; S.hide = -1; invalidate(); });
  } else {
    S.hide = -1; invalidate();
  }
  const out = sheetRun(sheetWin, win
    ? [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(10px) scale(.975)' }]
    : [{ transform: dragged }, { transform: 'translateY(100%)' }],
  { duration: win ? 220 : 320, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
  sheetRun(sheetBackdrop, [{ opacity: 1 }, { opacity: 0 }], { duration: win ? 260 : 320, easing: 'linear', fill: 'forwards' });
  out.onfinish = done;
}

$('#sheet-close').addEventListener('click', () => closeSheet());
// the backdrop closes only for a press that starts on it: the tap that opened the window
// is followed by the browser's own click, which would otherwise land here and close it
let backdropDown = false;
sheetBackdrop.addEventListener('pointerdown', () => { backdropDown = true; });
sheetBackdrop.addEventListener('click', () => { if (backdropDown) closeSheet(); backdropDown = false; });

// phones: drag the red strip down to close
let drag = null;
sheetLid.addEventListener('pointerdown', e => {
  if (windowed() || !sheetPair || e.target.closest('.sheet-close')) return;
  drag = { y: e.clientY, t: performance.now(), dy: 0 };
  sheetLid.setPointerCapture(e.pointerId);
});
sheetLid.addEventListener('pointermove', e => {
  if (!drag) return;
  drag.dy = Math.max(0, e.clientY - drag.y);
  sheetWin.style.transform = `translateY(${drag.dy}px)`;
});
const endDrag = () => {
  if (!drag) return;
  const { dy, t: t0 } = drag; drag = null;
  if (dy > 110 || dy / Math.max(1, performance.now() - t0) > 0.6) return closeSheet();
  sheetWin.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
  sheetWin.style.transform = '';
};
sheetLid.addEventListener('pointerup', endDrag);
sheetLid.addEventListener('pointercancel', endDrag);

addEventListener('popstate', () => {
  const id = location.hash.slice(1);
  if (sheetPair && id !== sheetPair) closeSheet(true);
  else if (!sheetPair && pairs.has(id)) openSheet(id, pairs.get(id).photos[0], null);
});
addEventListener('keydown', e => {
  if (e.key === 'Escape' && sizePop.classList.contains('open')) { e.preventDefault(); closeSizePop(true); return; }
  if (!sheetPair) return;
  if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {        // flip through the photos
    const n = gallery.children.length;
    const i = Math.round(gallery.scrollLeft / Math.max(1, gallery.clientWidth)) + (e.key === 'ArrowRight' ? 1 : -1);
    if (i >= 0 && i < n) { e.preventDefault(); gallery.scrollTo({ left: i * gallery.clientWidth, behavior: 'smooth' }); }
  }
  if (e.key === 'Tab') {                         // keep focus inside the window
    const f = [...sheet.querySelectorAll('button:not(:disabled), a[href]')].filter(el => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  }
});

// ---------------------------------------------------------------- toast
let toastTimer = 0;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 3600);
}

// ---------------------------------------------------------------- language
$('#lang').addEventListener('click', () => {
  lang = lang === 'ka' ? 'en' : 'ka';
  snd.flip();
  try { localStorage.setItem('sb-lang', lang); } catch {}
  applyLang();
});

// ---------------------------------------------------------------- sound switch
snd.show();
$('#snd').addEventListener('click', () => snd.set(!snd.wanted));

// ---------------------------------------------------------------- no WebGL: plain grid
function buildFallback() {
  html.classList.add('no-gl');
  const box = $('#fallback');
  photos.forEach(ph => {
    const p = pairs.get(ph.pair), b = document.createElement('button');
    b.type = 'button'; b.dataset.pair = p.id; b.setAttribute('aria-label', `${name(p)}, ${price(p)}`);
    const img = new Image(); img.src = tileURL(ph.key); img.alt = ''; img.loading = 'lazy'; img.width = 320; img.height = 320;
    b.append(img);
    b.addEventListener('click', () => { const r = img.getBoundingClientRect(); openSheet(p.id, ph.key, { x: r.left, y: r.top, w: r.width, h: r.height }); });
    box.append(b);
  });
  wall.style.height = 'auto';
  $('.wall-stage').style.display = 'none';
  [introText, introShade].forEach(el => { el.style.transform = el.style.opacity = ''; written.delete(el); });
  intro.classList.remove('gone');
  html.classList.add('laid');
}

// ---------------------------------------------------------------- intro: the box
// While the photos load, the shop's box turns and floats in the middle of a dark screen over a
// barcode that prints one bar per photo. Once they're in, it waits a moment to be opened: the
// tap that opens it is what lets it make a sound (untouched, it opens by itself, quietly). A
// scanner reads the code, the box slows to face you, light leaks out under the lid and the lid
// comes up on tissue paper glowing from underneath. It drops to the bottom of the screen, the
// lid pops off, the tissue is flung open, and the pairs fly out of the light to their places on
// the wall, nearest first, each landing lit and settling into the dark. The empty box sinks out
// of view. Once it's opening, a tap or a key skips to the wall.
let introDone = !html.classList.contains('intro');    // the light is free (from the moment the box opens)
let introLanded = introDone;                           // the wall is complete: labels, the mouse lift
let introSkip = false, introLoaded = 0, introAsked = false, introOpenedAt = 0, tapResolve = null;
const introAnims = [], cardAnims = [];
const tbFly = $('#tb-fly'), tbObj = $('#tb-obj'), tbLid = $('#tb-lid'), tbPersp = $('.tb-persp'), cardsEl = $('#cards');
const SPIN_MS = 2800;                                  // one turn of the loader (matches the CSS)

// The light on the outside: how dark a face is at an angle (0 = facing you, the key light front-left).
// The CSS keyframes (tb-light) are this, sampled, for the turn while loading; the slow-down uses it here.
const shadeAt = phi => { const c = Math.max(0, Math.cos((phi + 38) * Math.PI / 180)); return Math.min(0.62, Math.max(0, (1 - (0.5 + 0.5 * c ** 1.3)) * 1.1)); };
const faceLights = [...document.querySelectorAll('.tb-lt')].map(el => {
  const c = el.parentElement.classList, is = (...n) => n.some(x => c.contains(x));
  return { el, ph: is('tb-right', 'lid-right') ? 90 : is('tb-back', 'lid-back') ? 180 : is('tb-left', 'lid-left') ? 270 : 0 };
});

// The loader: a barcode prints one bar per photo (at most 40) and the count rolls like an odometer.
const tbCode = $('#tb-code'), tbScan = $('#tb-scan'), tbCount = $('#tb-count'), tbLoad = $('#tb-load');
const BARS = Math.min(photos.length, 40), bars = [];
const rollCols = [];
(function buildLoader() {
  // a fixed, uneven rhythm of thin and thick bars, so it reads like a real code
  const W = [1, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1], G = [2, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2];
  for (let i = 0; i < BARS; i++) {
    const b = document.createElement('b');
    b.style.width = W[i % W.length] + 'px';
    if (i < BARS - 1) b.style.marginRight = G[(i * 5) % G.length] + 'px';
    if (i < 2 || i >= BARS - 2 || Math.abs(i - (BARS - 1) / 2) < 1) b.className = 'g';
    tbCode.insertBefore(b, tbScan); bars.push(b);
  }
  const digits = Math.max(2, String(photos.length).length);
  const roll = $('#tb-roll');
  for (let d = 0; d < digits; d++) {
    const col = document.createElement('i'), strip = document.createElement('b');
    for (let k = 0; k < 10; k++) { const s = document.createElement('span'); s.textContent = k; strip.append(s); }
    col.append(strip); roll.append(col); rollCols.push(strip);
  }
  $('#tb-of').textContent = ` / ${photos.length}`;
  $('#tag-sizes').textContent = `${allSizes[0]}–${allSizes[allSizes.length - 1]}`;
  $('#tag-pairs').textContent = catalog.pairs.length;
})();

function introProgress(n) {
  introLoaded = n;
  if (introDone) return;
  tbCount.dataset.n = `${n} / ${photos.length}`;
  const s = String(n).padStart(rollCols.length, '0');
  rollCols.forEach((col, d) => { col.style.transform = `translateY(${-Number(s[d])}em)`; });
  const lit = Math.round(n / photos.length * BARS);
  let fresh = -1;
  bars.forEach((b, i) => { const on = i < lit; if (on !== b.classList.contains('on')) { b.classList.toggle('on', on); if (on) fresh = i; } });
  if (fresh >= 0) snd.tick((fresh / BARS - 0.5) * 0.6);
}

// Waits in the intro run on the same timeline as its animations (an empty animation of that
// length), so a slow frame or a slowed-down timeline can never pull the steps apart.
const introWait = ms => {
  if (introSkip || ms <= 0) return Promise.resolve();
  const a = new Animation(new KeyframeEffect(null, [], { duration: ms }), document.timeline);
  a.play(); introAnims.push(a);
  return a.finished.then(() => {}, () => {});
};

// ready = fonts in, the photos in (or 3.4 s passed with the low-res wall ready), and the box shown ~1 s
function introGate() {
  return new Promise(resolve => {
    const tick = () => {
      const t = performance.now();
      const fontsOk = document.fonts.check('900 20px "Noto Sans Georgian"', 'რ') && document.fonts.check('800 20px "Inter Tight"', 'R');
      const photosOk = !gl || introLoaded >= photos.length || (loReady && t > 3400);
      if (introSkip || (fontsOk && photosOk && t > 1000) || t > 6500) return resolve();
      setTimeout(tick, 60);
    };
    tick();
  });
}

// the box is ready: it waits for a tap to open it (which also lets it make a sound), a short while
function tapToOpen(ms) {
  titleBox.dataset.phase = 'ready';
  tbLoad.classList.add('ready');
  return Promise.race([new Promise(r => { tapResolve = r; }), introWait(ms)]).then(() => { tapResolve = null; });
}

function skipIntro() {
  introSkip = true;
  if (tapResolve) tapResolve();
  introAnims.forEach(a => a.finish());
  cardAnims.forEach(a => a.finish());
}
// Before the box opens, a tap (or Enter, or Space) opens it, with sound; once it's opening, a
// tap or a key skips to the wall. Until the wall is complete a tap can't open a pair half-way.
// (A mouse button counts as a gesture as it goes down, a finger as it lifts.)
function introTap() {
  if (introLanded) return;
  if (!introOpenedAt) { introAsked = true; if (tapResolve) tapResolve(); return; }
  if (performance.now() - introOpenedAt > 450) skipIntro();
}
addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') snd.unlock();
  if (introLanded) return;
  e.stopPropagation();
  if (e.pointerType === 'mouse') introTap();
}, true);
addEventListener('pointerup', e => {
  if (e.pointerType === 'mouse') return;
  snd.unlock();
  if (!introLanded) introTap();
}, true);
addEventListener('touchend', () => snd.unlock(), { capture: true, passive: true });
addEventListener('click', () => snd.unlock(), true);
addEventListener('keydown', e => {
  if (e.key !== 'Escape') snd.unlock();
  if (introLanded) return;
  if (!introOpenedAt && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); introTap(); } else skipIntro();
}, true);

async function playIntro() {
  if (introDone) return;
  clearTimeout(window.__introFailsafe);
  introProgress(introLoaded);
  await introGate();
  if (introDone) return;
  bars.forEach(b => b.classList.add('on'));
  // ready: unless it's been asked for already (or the sound is off), the box waits to be opened
  if (!introAsked && !introSkip && snd.wanted && !snd.live()) await tapToOpen(1800);
  else tbLoad.classList.add('ready');
  introOpenedAt = performance.now();
  titleBox.classList.add('inside');                      // the inside of the box is drawn from here (the lid still on it)
  // a page that isn't being drawn (a background tab, say) never lets its animations finish:
  // if the intro hasn't reached the wall 12 s after it began opening, it skips to it
  setTimeout(() => { if (!introLanded) skipIntro(); }, 12000);

  const b = { h: tbFly.offsetHeight, d: $('.tb-right').offsetWidth, ld: $('.lid-left').offsetWidth };
  const objT = (x, y) => `translateZ(${-b.d / 2}px) rotateX(${x}deg) rotateY(${y}deg)`;
  // the lid tips back on its back edge as it lifts; later it pops off and flies away (z: back into the dark)
  const lidT = (lift, deg, z = 0) => `translateY(${-b.h / 2 - lift}px) translateZ(${-b.ld / 2 + z}px) rotateX(${deg}deg) translateZ(${b.ld / 2}px)`;
  const LIFT = Math.round(b.h * 0.3);
  const shadow = $('.tb-shadow'), contact = $('.tb-contact'), spill = $('.tb-spill'), beam = $('#tb-beam'), seam = $('.tb-seam'), lamp = $('.tb-lamp'), pool = $('.tb-pool');
  const warm = [...document.querySelectorAll('.tb-warm')], dims = [...document.querySelectorAll('.ts-dim')];
  // Each step's animation on an element replaces the last one there (it starts where that one
  // ended, and holds its first frame through any delay), so an element only ever has one and it
  // runs off the main thread. (Asking the element for its animations would restyle the page.)
  const last = new Map();
  const run = (el, keyframes, opts) => {
    last.get(el)?.cancel();
    const a = el.animate(keyframes, { fill: 'both', ...opts });
    last.set(el, a); introAnims.push(a);
    if (introSkip) a.finish();
    return a;
  };
  const fade = (els, from, to, opts) => els.forEach(el => run(el, [{ opacity: from }, { opacity: to }], opts));

  // 0. the scanner reads the code, and the loader steps back as the box turns to you
  titleBox.dataset.phase = 'scan';
  snd.scan();
  run(tbScan, [{ transform: 'translateX(0)', opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.86 }, { transform: `translateX(${tbCode.offsetWidth + 2}px)`, opacity: 0 }],
    { duration: 460, easing: 'cubic-bezier(.45,0,.3,1)' });
  run(tbLoad, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: 520, easing: 'linear' });

  // 1. catch the turn where it is: the box, the light on its faces, its float, its shadow
  const spin = tbObj.getAnimations()[0];
  const ang = spin && spin.currentTime != null ? (Number(spin.currentTime) % SPIN_MS) / SPIN_MS * 360 : 0;
  const shTurn = $('.tb-shadow > i'), shFloat = $('.tb-shadow > i > i');
  const ps = getComputedStyle(tbPersp), floatT = ps.transform, floatY = ps.translate;
  const shadowScale = getComputedStyle(shTurn).scale, shadowOp = getComputedStyle(shFloat).opacity;
  tbObj.style.animation = 'none'; tbObj.style.transform = objT(-20, ang);
  tbPersp.style.animation = shadow.style.animation = shTurn.style.animation = shFloat.style.animation = 'none';
  shadow.style.opacity = '1';
  faceLights.forEach(f => { f.el.style.animation = 'none'; f.el.style.opacity = shadeAt(f.ph + ang).toFixed(3); });
  void tbObj.offsetWidth;                                // (the CSS turns are gone before anything takes over)
  run(tbPersp, [{ transform: floatT, translate: floatY === 'none' ? '0px 0px' : floatY }, { transform: 'none', translate: '0px 0px' }], { duration: 700, easing: 'cubic-bezier(.3,.6,.2,1)' });
  run(shTurn, [{ scale: shadowScale === 'none' ? '1 1' : shadowScale }, { scale: '1 1' }], { duration: 700, easing: 'cubic-bezier(.3,.6,.2,1)' });
  run(shFloat, [{ opacity: shadowOp }, { opacity: 1 }], { duration: 700, easing: 'cubic-bezier(.3,.6,.2,1)' });

  // 2. it slows to face you, leaving the turn at the speed it had (the light on its faces with it).
  //    Light leaks out under the lid; the lid sticks for a moment, then comes up on glowing tissue.
  const target = 360 * Math.ceil((ang + 70) / 360), R = target - ang;
  const v0 = 360 / SPIN_MS;                             // degrees per ms
  const dur = Math.min(1150, Math.max(620, R / v0 * 1.25));
  const x1 = 0.3, y1 = Math.min(1, v0 * dur / R * x1);
  const turn = `cubic-bezier(${x1},${y1.toFixed(3)},.22,1)`;
  run(tbObj, [{ transform: objT(-20, ang) }, { transform: objT(-16, target) }], { duration: dur, easing: turn });
  const N = Math.max(2, Math.ceil(R / 15));
  faceLights.forEach(f => run(f.el, Array.from({ length: N + 1 }, (_, k) => ({ opacity: shadeAt(f.ph + ang + R * k / N) })), { duration: dur, easing: turn }));
  snd.whirl(dur);
  const pop = Math.max(0, dur - 300), LID = 760, held = 0.3;      // the lid lets go 30% in
  const free = pop + LID * held;
  run(seam, [{ opacity: 0 }, { opacity: 1, offset: 0.55 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 400 + LID * held + 160, delay: Math.max(0, pop - 400), easing: 'linear' });
  snd.leak(Math.max(0, pop - 400) / 1000);
  run(tbLid, [
    { transform: lidT(0, 0), easing: 'cubic-bezier(.3,0,.4,1)' },
    { transform: lidT(b.h * 0.02, 1.6), offset: held * 0.5, easing: 'ease-in-out' },
    { transform: lidT(b.h * 0.012, 0.9), offset: held, easing: 'cubic-bezier(.25,1.3,.45,1)' },
    { transform: lidT(LIFT, 16) },
  ], { duration: LID, delay: pop });
  snd.lid(free / 1000);
  fade(dims, 0.8, 0, { duration: 460, delay: free, easing: 'ease-out' });        // the tissue lights up
  fade(warm, 0, 1, { duration: 520, delay: free + 30, easing: 'ease-out' });     // and the board and the lid around it
  run(spill, [{ opacity: 0 }, { opacity: 1 }], { duration: 460, delay: free + 40, easing: 'ease-out' });
  snd.glow(free / 1000);
  await introWait(free);
  titleBox.dataset.phase = 'lift';
  await introWait(380);

  // 3. the drop: down to the bottom middle of the screen, landing with a little give and some dust
  titleBox.dataset.phase = 'drop';
  const vh = innerHeight, ls = parseFloat(getComputedStyle(titleBox).getPropertyValue('--ls')) || 0.7;
  const dropY = Math.round(vh - Math.max(44, vh * 0.065) - b.h * ls * 0.5 - vh * 0.44);
  html.classList.add('revealing', 'unboxing');
  html.classList.remove('intro');
  readScroll();
  const DROP = 560;
  snd.drop(DROP);
  const drop = run(titleBox, [{ transform: 'translateY(0)' }, { transform: `translateY(${dropY}px)` }], { duration: DROP, easing: 'cubic-bezier(.52,0,.78,.38)' });
  run(tbObj, [{ transform: objT(-16, target) }, { transform: objT(-24, target) }], { duration: DROP, easing: 'ease-in' });
  tbPersp.style.transformOrigin = '50% 100%';
  run(tbPersp, [{ transform: 'none' }, { transform: 'scale(1.03, .95)', offset: 0.28 }, { transform: 'translateY(-1.2%) scale(.994, 1.012)', offset: 0.62 }, { transform: 'none' }],
    { duration: 400, delay: DROP, easing: 'ease-out' });
  // its shadow: fading as it falls, then spreading out from under it as it lands
  const SH = DROP + 440, at = ms => ms / SH;
  run(shadow, [
    { opacity: 1, scale: '1 1', easing: 'ease-out' },
    { opacity: 0.1, scale: '.8 .8', offset: at(DROP * 0.6) },
    { opacity: 0.1, scale: '.7 .7', offset: at(DROP - 40), easing: 'ease-out' },
    { opacity: 1, scale: '1.32 1.15', offset: at(DROP + 176), easing: 'ease-out' },
    { opacity: 1, scale: '1.08 1' },
  ], { duration: SH });
  run(contact, [{ opacity: 0 }, { opacity: 1 }], { duration: 110, delay: DROP - 30, easing: 'ease-out' });
  await drop.finished.then(() => {}, () => {});
  if (!introSkip) requestAnimationFrame(dust);          // (its own frame)

  // 4. down: the lid pops off and flies; the tissue is flung open both ways and the light stands up out of the box
  titleBox.dataset.phase = 'open';
  snd.pop(); snd.rustle(0.07);
  run(tbLid, [{ transform: lidT(LIFT, 16) }, { transform: lidT(b.h * 2.6, -46, -b.ld * 0.5) }], { duration: 600, easing: 'cubic-bezier(.2,.62,.3,1)' });
  tbLid.querySelectorAll('.tb-face').forEach(f => run(f, [{ opacity: 1 }, { opacity: 0 }], { duration: 340, delay: 200, easing: 'ease-in' }));
  // the tissue parts down the middle: both sheets pushed back to their ends, bunching, lifting a little
  document.querySelectorAll('.tsh').forEach((h, i) => run(h,
    [{ transform: 'none' }, { transform: `translateY(${-b.h * 0.07}px) scaleX(.56)`, offset: 0.42 }, { transform: `translateY(${-b.h * 0.035}px) scaleX(.64)` }],
    { duration: 640, delay: 60 + i * 40, easing: 'cubic-bezier(.2,.75,.3,1)' }));
  fade(dims, 0, 0.14, { duration: 500, delay: 170 });                  // parted, a little off the lamp
  run(lamp, [{ opacity: 0 }, { opacity: 1 }], { duration: 320, delay: 90, easing: 'ease-out' });
  run(pool, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 80, easing: 'ease-out' });
  run(spill, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-in' });
  run(beam, [{ opacity: 0, transform: 'scaleY(.35)' }, { opacity: 1, transform: 'scaleY(1)' }], { duration: 640, delay: 90, easing: 'cubic-bezier(.2,.7,.3,1)' });
  if (!introSkip) introWait(140).then(() => { if (!introSkip) motes(beam); });
  const fr = $('.tb-front').getBoundingClientRect();
  const mouth = { x: fr.left + fr.width / 2, y: fr.top, w: fr.width };
  // the pairs come out over the box, but behind its front wall: out of it
  cardsEl.style.zIndex = '71';
  cardsEl.style.clipPath = `polygon(0 0, 100% 0, 100% 100%, ${(fr.right + 1).toFixed(1)}px 100%, ${(fr.right + 1).toFixed(1)}px ${(fr.top + 1).toFixed(1)}px, ${(fr.left - 1).toFixed(1)}px ${(fr.top + 1).toFixed(1)}px, ${(fr.left - 1).toFixed(1)}px 100%, 0 100%)`;
  releaseLight(mouth.x, mouth.y - fr.height * 0.6);

  // 5. the pairs come out of the light, nearest first
  await introWait(150);
  const pairsOut = burst(mouth);
  await introWait(pairsOut.launched + 240);

  // 6. the empty box sinks out of view, the light going out of it
  titleBox.dataset.phase = 'sink';
  snd.sink();
  run(titleBox, [{ transform: `translateY(${dropY}px)` }, { transform: `translateY(${dropY + Math.round(vh * 0.62)}px)` }], { duration: 600, easing: 'cubic-bezier(.5,0,.8,.4)' });
  run(beam, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-in' });
  fade([lamp, pool, ...warm], 1, 0.15, { duration: 520 });
  fade(dims, 0.14, 0.75, { duration: 520 });
  run(shadow, [{ opacity: 1, scale: '1.08 1' }, { opacity: 0, scale: '1.08 1' }], { duration: 260 });
  run(contact, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
  await Promise.all([introWait(620), pairsOut.landed]);
  finishIntro();
}

// dust off the floor where the box lands, out from under its bottom edge
function dust() {
  const fr = $('.tb-front').getBoundingClientRect(), box = $('#tb-dust'), y = fr.bottom - 3;
  for (let k = 0; k < 16; k++) {
    const p = document.createElement('i'), side = k % 2 ? 1 : -1, u = Math.random();
    const x = fr.left + fr.width * (side > 0 ? 0.6 + 0.42 * u : 0.4 - 0.42 * u);
    const dx = side * (18 + Math.random() * 64) * (0.5 + fr.width / 900), dy = -(3 + Math.random() * 14), s0 = 0.45 + Math.random() * 0.45;
    box.append(p);
    introAnims.push(p.animate([
      { transform: `translate(${x}px, ${y}px) scale(${s0})`, opacity: 0 },
      { opacity: 0.85, offset: 0.14 },
      { transform: `translate(${x + dx}px, ${y + dy}px) scale(${s0 * 2.7})`, opacity: 0 },
    ], { duration: 640 + Math.random() * 480, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'forwards' }));
  }
}
// dust turning in the light that stands out of the open box
function motes(beam) {
  const W = beam.offsetWidth, H = beam.offsetHeight;
  for (let k = 0; k < 18; k++) {
    const m = document.createElement('i'), x = W * (0.22 + Math.random() * 0.56), y0 = H * Math.random() * 0.2;
    const rise = H * (0.18 + Math.random() * 0.34), drift = (Math.random() - 0.5) * W * 0.12, s = 0.5 + Math.random() * 0.9;
    beam.append(m);
    introAnims.push(m.animate([
      { transform: `translate(${x}px, ${-y0}px) scale(${s})`, opacity: 0 },
      { opacity: 0.4 + Math.random() * 0.5, offset: 0.25 },
      { transform: `translate(${x + drift}px, ${-y0 - rise}px) scale(${s})`, opacity: 0 },
    ], { duration: 1500 + Math.random() * 1300, delay: Math.random() * 500, easing: 'cubic-bezier(.3,.4,.4,1)', fill: 'both' }));
  }
}

// The pairs fly out of the box to their places on the wall. Those on screen travel as cards
// (photos on the page), each handing over to its tile on the wall as it lands, lit, so the
// tile can settle into the dark; the rest of the wall is simply there.
function burst(mouth) {
  const now = performance.now(), out = [];
  for (let i = 0; i < L.count; i++) {
    const r = cellRect(i);
    if (!introSkip && r.y + r.h > 0 && r.y < innerHeight) out.push({ i, r, d: Math.hypot(r.x + r.w / 2 - mouth.x, r.y + r.h / 2 - mouth.y) + Math.random() * L.tile * 0.9 });
    else S.landAt[i] = introSkip ? 0 : now - 1000;
  }
  out.sort((a, b) => a.d - b.d);                        // nearest first, with a little scatter
  const gap = out.length ? Math.min(46, 880 / out.length) : 0;
  invalidate();
  // each card is made as it goes (on the intro's clock), so no one frame has to build them all
  return { launched: out.length * gap, landed: Promise.all(out.map((c, n) => introWait(n * gap).then(() => launchCard(c.i, c.r, mouth, 0)))) };
}

function launchCard(i, r, mouth, delay) {
  const outer = document.createElement('div'), inner = document.createElement('div');
  outer.className = 'card'; inner.className = 'card-in';
  inner.style.width = r.w + 'px'; inner.style.height = r.h + 'px';
  const img = new Image(); img.decoding = 'async'; img.src = tileURL(photos[cells[i]].key); img.alt = '';
  inner.append(img); outer.append(inner); cardsEl.append(outer);
  // from inside the box (its front wall hides it), small and turning, up out of it and across on an arc to its place
  const s0 = Math.min(0.32, mouth.w * 0.3 / r.w);
  const sx = mouth.x + (Math.random() - 0.5) * mouth.w * 0.4 - r.w / 2, sy = mouth.y + r.h * s0 * 0.55 - r.h / 2;
  const turn = (Math.random() - 0.5) * 30;
  const duration = Math.min(1100, 560 + Math.hypot(r.x - sx, r.y - sy) * 0.3);
  // first straight up and out of the box (a fifth of the way), then across to its place
  const s1 = s0 * 1.3, y1 = mouth.y - r.h * s1 * 0.62 - r.h / 2, out = 0.2;
  const ax = outer.animate([
    { transform: `translateX(${sx}px)`, easing: 'linear' },
    { transform: `translateX(${sx + (r.x - sx) * 0.05}px)`, offset: out, easing: 'cubic-bezier(.3,.45,.25,1)' },
    { transform: `translateX(${r.x}px)` },
  ], { duration, delay, fill: 'both' });
  const ay = inner.animate([
    { transform: `translateY(${sy}px) scale(${s0}) rotate(${turn}deg)`, easing: 'cubic-bezier(.25,.6,.45,1)' },
    { transform: `translateY(${y1}px) scale(${s1}) rotate(${turn * 0.75}deg)`, offset: out, easing: 'cubic-bezier(.2,.62,.2,1)' },
    { transform: `translateY(${r.y}px) scale(1) rotate(0deg)` },
  ], { duration, delay, fill: 'both' });
  cardAnims.push(ax, ay);
  snd.flick(delay / 1000, Math.max(-0.8, Math.min(0.8, ((r.x + r.w / 2) / innerWidth - 0.5) * 1.6)));
  if (introSkip) { ax.finish(); ay.finish(); }
  return new Promise(res => {
    ax.onfinish = () => {
      const t = performance.now();
      S.landAt[i] = introSkip ? 0 : t;
      S.flashUntil = Math.max(S.flashUntil, t + 720);
      invalidate();
      if (introSkip) outer.remove();
      else outer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'linear' }).onfinish = () => outer.remove();
      res();
    };
    ax.oncancel = () => { outer.remove(); S.landAt[i] = 0; res(); };
  });
}

// the light the box held starts drifting over the wall from the box
function releaseLight(x, y) {
  introDone = true;
  S.lx = S.tx = x; S.ly = S.ty = y - S.stageTop;
  S.k = 1; S.tk = 1; S.mode = 'idle'; S.lastInput = -1e9;
  last = 0; invalidate();
}

function finishIntro() {
  html.classList.add('unboxed');                        // the box is gone
  html.classList.remove('intro', 'unboxing');
  introAnims.splice(0).forEach(a => a.cancel());
  cardsEl.replaceChildren(); cardsEl.style.clipPath = cardsEl.style.zIndex = '';
  $('#tb-dust').replaceChildren(); $('#tb-beam').replaceChildren();
  tbObj.style.transform = ''; tbObj.style.animation = ''; $('.tb-shadow').style.animation = '';
  tbPersp.style.transformOrigin = tbPersp.style.animation = '';
  faceLights.forEach(f => { f.el.style.animation = f.el.style.opacity = ''; });
  delete titleBox.dataset.phase;
  if (!introDone) releaseLight(L.w * 0.5, L.h * 0.45);
  introDone = introLanded = true;
  for (let i = 0; i < L.count; i++) if (S.landAt[i] === Infinity) S.landAt[i] = 0;   // anything not shown yet is just there
  // skipped: everything shows at once (fades already under way are finished); played: the staggered fades finish first
  if (introSkip) {
    html.classList.remove('revealing');
    if (typeof CSSTransition !== 'undefined') document.getAnimations().forEach(a => { if (a instanceof CSSTransition) a.finish(); });
  } else setTimeout(() => html.classList.remove('revealing'), 1400);
  hintTop();
  invalidate();
  snd.ambient(true);
}

// A shared link (#pair) opens over a clean entry, so Back closes it and stays on the site.
function openDeepLink() {
  const id = location.hash.slice(1);
  if (!pairs.has(id)) return;
  history.replaceState(null, '', location.pathname + location.search);
  openSheet(id, pairs.get(id).photos[0], null);
}

function start() {
  applyLang();
  if (!gl) { buildFallback(); openDeepLink(); playIntro(); return; }
  try { initGL(); } catch (err) { console.warn(err); buildFallback(); openDeepLink(); playIntro(); return; }
  layout(); resize(); readScroll();
  if (!introDone) S.landAt.fill(Infinity);               // the wall is empty until the pairs come out of the box
  S.lx = S.tx = L.w * 0.5; S.ly = S.ty = L.h * 0.4;
  // the photos start loading once the first frame is up, so nothing competes with it; the tissue
  // paper for the inside of the box comes in then too, ready long before it opens
  requestAnimationFrame(() => setTimeout(() => {
    loadTextures();
    if (!introDone) new Image().src = 'assets/img/brand/tissue.webp';
  }, 0));
  invalidate();
  openDeepLink();
  playIntro();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = 0; invalidate(); } });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); buildFallback(); });
}
start();
window.__sb = { cellRect, cellAt, layerOf, L, S, F, HOLE, snd, get cells() { return cells; }, get introDone() { return introDone; }, get introLanded() { return introLanded; } };
