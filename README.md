# Sneakerbox — light wall

Spec demo for [Sneakerbox](https://www.facebook.com/sneakerboxonlineshop). Live at **https://akultange.github.io/sneakerbox/**

The shop's own on-foot photos form a dark wall. Light follows the finger (or cursor) and shows the colour; tap a pair for its price, the sizes in stock and an order that opens in their Messenger with the text already written. Pick a size and only the pairs in stock in that size light up. Georgian first, with an English toggle.

The headline is printed on the shop's own box (the red creased paper and cream wordmark from their logo), which takes three slots of the wall. On every open the box turns while the photos load, the lid lifts with light inside, and the box slides into its slots as that light starts drifting over the wall. A tap or a key skips it; shared pair links go straight to the pair. Scroll down and the box goes back into the wall while three more pairs fill its slots; scroll back up and it comes out again.

With a mouse, the tile under the pointer lifts a little off the wall and settles back on the same spring when the pointer moves on.

Tap a pair and it opens in a window over the wall (a bottom sheet on phones): the photo flies from its tile into the window, with the sizes in stock, the order button and three more pairs to look at.

Prices are estimates from Tbilisi resellers and the sizes are placeholders until the shop sends its stock list.

## How it's built

- One WebGL2 canvas: the tile grid is drawn in a single fragment shader from a texture array, so the wall is one draw call at any size. A plain photo grid takes over where WebGL isn't available.
- The box is CSS 3D (no extra library); its loader spin runs on the compositor, so it stays smooth while the photos decode.
- No framework. `src/app.js` is the whole app, `src/style.css` and `src/index.html` the page.
- First screen ~130 KB (page, script, fonts, low-res wall); every tile sharp at ~630 KB. Sharp tiles load after the text has painted.

```
src/            index.html (template), style.css, app.js
assets/
  fonts/        Noto Sans Georgian (subset to Mkhedruli), Inter Tight, ₾ glyph
  img/p/        pair photos, 480/720/1080, AVIF + WebP
  img/t/        wall tiles, 160/320 WebP
  img/brand/    wordmark and icons cut from the shop's logo
  data/         catalog.json (generated)
tools/
  pairs.json         the stock list: pairs, prices, sizes, sold-out sizes, photo numbers
  process_images.py  grades the photos and writes assets/ + catalog.json
  build.py           writes dist/
  og.js              renders the 1200×630 share image from the live wall
  qa.js, qa-size.js, qa-intro.js  headless checks (touch, history, fallback, size filter, intro, box on its slots and on scroll)
  intro-frames.js    records the intro frame by frame
  scroll-frames.js   records a phone scroll (finger drags) frame by frame
  window-frames.js   captures the pair window opening, then a related pair
  hover-frames.js    records the mouse lift: onto a tile, across, and off
  shoot.js           phone + desktop screenshots
```

## Add or change a pair

1. Name the photos `pNNN_anything.jpg` (the 1080 px squares from Facebook are fine) and put them in one folder.
2. Add the pair to `tools/pairs.json`: `id`, `brand`, `model`, `color` (`ka` and `en`), `price`, `sizes`, `soldOut`, and `photos` (the NNN numbers).
3. `python3 tools/process_images.py <photo folder>`
4. `python3 tools/build.py https://akultange.github.io/sneakerbox/`
5. Publish `dist/` to the `gh-pages` branch.

## Work on it locally

```
npm install
python3 tools/build.py
python3 -m http.server 8765 --directory dist
node tools/qa.js http://127.0.0.1:8765/ qa
node tools/qa-size.js http://127.0.0.1:8765/ qa
node tools/qa-intro.js http://127.0.0.1:8765/ qa
```

The checks need Chromium: `@sparticuz/chromium` provides it.
