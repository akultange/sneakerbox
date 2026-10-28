"""Image pipeline for the Sneakerbox demo.

Takes the shop's own on-foot photos (1080 px squares from their Facebook page) and:
  1. matches them to one baseline, conservatively: white balance from the concrete
     (a natural neutral grey in every shot), exposure to a shared mid-grey, a gentle
     contrast curve. Shoe colours must stay true, so every gain is clamped.
  2. exports product images (AVIF + WebP at 480/720/1080) and wall tiles (WebP 320 + 160)
  3. writes a tiny low-res atlas of every tile for the first paint of the wall
  4. writes assets/data/photos.json for the page

Run: python3 tools/process_images.py <photos_dir>
"""
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_IMG = os.path.join(ROOT, 'assets', 'img')
OUT_DATA = os.path.join(ROOT, 'assets', 'data')

# pair -> photo indices on their page (the file names carry the index)
PAIRS = json.load(open(os.path.join(ROOT, 'tools', 'pairs.json')))


def srgb_to_linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def normalise(im):
    """Conservative match: neutral concrete, shared exposure, soft S-curve."""
    a = np.asarray(im.convert('RGB'), dtype=np.float32) / 255.0
    h = a.shape[0]
    lin = srgb_to_linear(a)

    # concrete sample: low-saturation mid-tones in the lower half (the pavement)
    ground = a[h // 2:]
    mx, mn = ground.max(axis=2), ground.min(axis=2)
    sat = (mx - mn) / np.maximum(mx, 1e-4)
    luma = 0.2126 * ground[..., 0] + 0.7152 * ground[..., 1] + 0.0722 * ground[..., 2]
    mask = (sat < 0.14) & (luma > 0.22) & (luma < 0.82)
    gains = np.ones(3, dtype=np.float32)
    if mask.sum() > 2000:
        med = np.median(srgb_to_linear(ground[mask]), axis=0)
        grey = med.mean()
        gains = np.clip(grey / np.maximum(med, 1e-4), 0.94, 1.06)
    lin = lin * gains

    # exposure: shared median luminance, clamped
    y = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
    cur = float(np.median(y))
    target = 0.17  # linear, ~0.45 in sRGB
    lin = lin * float(np.clip(target / max(cur, 1e-4), 0.88, 1.14))

    out = linear_to_srgb(lin)
    # gentle S-curve on luminance only, keeps hue
    yl = 0.2126 * out[..., 0] + 0.7152 * out[..., 1] + 0.0722 * out[..., 2]
    k = 0.06
    curved = yl + k * (yl - 0.5) * (1 - np.abs(2 * yl - 1))
    ratio = np.where(yl > 1e-4, curved / np.maximum(yl, 1e-4), 1.0)[..., None]
    out = np.clip(out * ratio, 0, 1)
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8)), gains, cur


def square(im):
    w, h = im.size
    s = min(w, h)
    return im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))


def main(src):
    os.makedirs(os.path.join(OUT_IMG, 'p'), exist_ok=True)
    os.makedirs(os.path.join(OUT_IMG, 't'), exist_ok=True)
    os.makedirs(OUT_DATA, exist_ok=True)
    files = {int(f[1:4]): f for f in os.listdir(src) if f.startswith('p') and f.endswith('.jpg')}
    by_pair, report, pairs_out = {}, [], []
    for pair in PAIRS:
        keys = []
        for idx in pair['photos']:
            if idx not in files:
                continue
            fid = files[idx][5:-4]
            base = f'{pair["id"]}-{idx:03d}'
            done = os.path.exists(os.path.join(OUT_IMG, 't', f'{base}-320.webp'))
            if not done or '--force' in sys.argv:
                im = square(Image.open(os.path.join(src, files[idx])).convert('RGB'))
                graded, gains, cur = normalise(im)
                for size in (480, 720, 1080):
                    v = graded.resize((size, size), Image.LANCZOS) if graded.size[0] != size else graded
                    v.save(os.path.join(OUT_IMG, 'p', f'{base}-{size}.webp'), 'WEBP', quality=80, method=6)
                    v.save(os.path.join(OUT_IMG, 'p', f'{base}-{size}.avif'), 'AVIF', quality=58)
                for size in (160, 320):
                    graded.resize((size, size), Image.LANCZOS).save(
                        os.path.join(OUT_IMG, 't', f'{base}-{size}.webp'), 'WEBP', quality=74, method=6)
                report.append((base, [round(float(g), 3) for g in gains], round(cur, 3)))
            keys.append({'key': base, 'pair': pair['id'], 'fbid': fid})
        if keys:
            by_pair[pair['id']] = keys
            pairs_out.append({k: v for k, v in pair.items() if k != 'photos'} | {'photos': [k['key'] for k in keys]})

    # wall order: round-robin across pairs, so neighbours are always different pairs
    photos, depth = [], max(len(v) for v in by_pair.values())
    for d in range(depth):
        for pid in by_pair:
            if d < len(by_pair[pid]):
                photos.append(by_pair[pid][d])

    # low-res atlas: every tile at 48 px, 16 per row
    T, cols = 48, 16
    rows = (len(photos) + cols - 1) // cols
    atlas = Image.new('RGB', (cols * T, rows * T), (20, 19, 18))
    for i, p in enumerate(photos):
        t = Image.open(os.path.join(OUT_IMG, 't', f'{p["key"]}-160.webp')).resize((T, T), Image.LANCZOS)
        atlas.paste(t, ((i % cols) * T, (i // cols) * T))
    atlas.save(os.path.join(OUT_IMG, 'atlas-lo.webp'), 'WEBP', quality=62, method=6)

    json.dump({'atlas': {'tile': T, 'cols': cols, 'rows': rows}, 'photos': photos, 'pairs': pairs_out},
              open(os.path.join(OUT_DATA, 'catalog.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    for r in report:
        print(r)
    print(len(photos), 'photos')


if __name__ == '__main__':
    main(sys.argv[1])
