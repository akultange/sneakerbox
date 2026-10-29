"""The texture for the inside of the title box. Usage: python3 tools/make_box_textures.py [preview.png]

tissue.webp  two sheets of crumpled tissue paper side by side (one per end of the box), lit from
             underneath: the light shows through, brighter toward the middle of the box, darker where
             the paper is folded double and along the creases, and darker still over the pair lying
             under it, heel to toe, whose shapes show through. Each sheet: its end wall on the left,
             its free edge, torn soft, on the right.
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets/img/brand')
rng = np.random.default_rng(20261029)

SW, SH = 360, 372                    # one sheet: length (hinge -> free edge) x depth of the box


def periodic_noise(h, w, beta, seed):
    """Tileable 1/f^beta noise in [-1, 1]."""
    r = np.random.default_rng(seed)
    f = np.fft.fft2(r.standard_normal((h, w)))
    fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.fftfreq(w)[None, :]
    k = np.sqrt(fx * fx + fy * fy); k[0, 0] = 1
    n = np.real(np.fft.ifft2(f / k ** beta))
    n -= n.mean(); n /= np.abs(n).max()
    return n


def voronoi(h, w, n, seed, aniso=(1.0, 1.0)):
    """Nearest-seed index and (F2 - F1) per pixel; aniso stretches the cells."""
    r = np.random.default_rng(seed)
    pts = r.random((n, 2)) * [w, h]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    best = np.full((h, w), np.inf, np.float32); second = np.full((h, w), np.inf, np.float32)
    idx = np.zeros((h, w), np.int32)
    for i, (px, py) in enumerate(pts):
        d = np.sqrt(((xx - px) / aniso[0]) ** 2 + ((yy - py) / aniso[1]) ** 2)
        closer = d < best
        second = np.where(closer, best, np.minimum(second, d))
        best = np.where(closer, d, best)
        idx = np.where(closer, i, idx)
    return idx, second - best


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def blur(a, rad):
    from scipy.ndimage import gaussian_filter
    return gaussian_filter(a.astype(np.float32), rad, mode='nearest')


def shoe_shadow(X, Z):
    """How much of the lamp's light the pair under the tissue blocks, in box coordinates
    (X along the box, -.5 .. .5; Z across it, -.5 back .. .5 front): two sneakers seen from above,
    side by side and heel to toe, soft through the paper."""
    out = np.zeros_like(X)
    for zc, heel, toe in ((.23, -.43, .41), (-.24, .42, -.42)):
        L = toe - heel
        s = (X - heel) / L                                   # 0 at the heel, 1 at the toe
        w = .2 * (.78 + .22 * np.sin(np.pi * np.clip(s, 0, 1) * .9)) * (1 - .32 * np.clip((s - .6) / .4, 0, 1) ** 2)
        inside = np.clip(1 - np.abs(Z - zc - .03 * np.sin(s * 3)) / np.maximum(w, 1e-3), 0, 1)
        ends = np.clip(s / .07, 0, 1) ** .5 * np.clip((1 - s) / .12, 0, 1) ** .6
        out = np.maximum(out, smoothstep(0, .35, inside) * ends * (s > 0) * (s < 1))
    from scipy.ndimage import gaussian_filter
    return gaussian_filter(out, 5)


def sheet(seed, side):
    h, w = SH, SW
    r = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u = xx / w; v = yy / h
    # where this pixel is in the box: the left sheet runs from the left end to past the middle;
    # the right one is the same turned half around (from the right end, and back to front)
    X = (-.5 + u * .53) if side == 'l' else (.5 - u * .53)
    Z = (v - .5) if side == 'l' else (.5 - v)
    # crumpled: many short folds, each a ridge or a valley along a line that dies out at its ends,
    # big ones and ever smaller ones. Flat facets between them, sharp where they meet.
    hgt = np.zeros((h, w), np.float32)
    for n, (l0, l1), (w0, w1), amp in [(30, (.35, 1.1), (.07, .16), 1.0), (110, (.12, .4), (.025, .07), .5), (240, (.04, .14), (.008, .022), .26)]:
        for _ in range(n):
            cx, cy = r.random(2); th = r.random() * np.pi
            dx, dy = np.cos(th), np.sin(th)
            ln_ = r.uniform(l0, l1); wd = r.uniform(w0, w1)
            s = (u - cx) * -dy + (v - cy) * dx           # across the fold
            t = (u - cx) * dx + (v - cy) * dy            # along it
            along = np.exp(-np.maximum(np.abs(t) - ln_ / 2, 0) ** 2 / (2 * (ln_ * .18) ** 2))
            hgt += (1 if r.random() < .5 else -1) * amp * wd * np.maximum(0, 1 - np.abs(s) / wd) * along
    hgt = blur(hgt, .6)                                   # tissue is soft: no razor edges
    gy, gx = np.gradient(hgt * w)
    nx, ny, nz = -gx, -gy, np.ones_like(gx)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz); nx /= ln; ny /= ln; nz /= ln
    curv = np.abs(blur(np.gradient(gx, axis=1) + np.gradient(gy, axis=0), .7))
    crease = np.clip(curv / (np.percentile(curv, 99.3) + 1e-6), 0, 1)
    # where the sheet is folded over itself it's two layers thick: a few long straight-ish folds
    layers = np.ones((h, w), np.float32)
    for _ in range(3):
        th = r.random() * np.pi; dx, dy = np.cos(th), np.sin(th); cx, cy = r.random(2)
        s = (u - cx) * -dy + (v - cy) * dx + .012 * periodic_noise(h, w, 1.4, int(r.integers(1e6)))
        band = r.uniform(.12, .3)
        inside = smoothstep(-.004, .004, s) * (1 - smoothstep(band - .02, band + .02, s))
        layers *= 1 - .19 * inside
        layers += .06 * np.exp(-(s / .006) ** 2)          # the fold itself: a bright curled line

    # the light sits under the middle of the box: toward the free edge of each sheet, mid-depth
    d = np.sqrt(((u - 1.05) / 1.05) ** 2 + ((v - .5) / .72) ** 2)
    fall = .12 + .95 * np.clip(1.24 - d, 0, 1) ** 1.05
    # light through the paper: facets facing the lamp pass more; folds and creases block some
    Lb = np.array([.35, 0, 1.0]); Lb /= np.linalg.norm(Lb)
    face = np.clip(nx * Lb[0] + ny * Lb[1] + nz * Lb[2], 0, 1)
    T = fall * (0.64 + 0.36 * face ** 3) * layers * (1 - .22 * crease)
    T *= 1 - .42 * shoe_shadow(X, Z)                       # the pair under the paper
    T += .035 * periodic_noise(h, w, 1.1, seed + 5)         # pulp: the paper's own unevenness
    # a little room light on top, from the upper left
    L = np.array([-.45, -.55, .7]); L /= np.linalg.norm(L)
    refl = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)

    T = np.clip(T, 0, 1.15)
    # colour: white hot in the middle, warm cream, amber where it's thick or far from the light
    c_hot = np.array([255, 250, 236]); c_mid = np.array([252, 210, 148]); c_low = np.array([96, 50, 22])
    t1 = np.clip(T / .5, 0, 1)[..., None]; t2 = np.clip((T - .5) / .55, 0, 1)[..., None]
    rgb = c_low * (1 - t1) + c_mid * t1
    rgb = rgb * (1 - t2) + c_hot * t2
    rgb += (refl[..., None] * 30 - 12) * np.array([1, .96, .9])
    # the torn free edge (right), soft; the edges along the walls stay straight (they tuck in)
    edge_n = periodic_noise(h, 64, 1.6, seed + 9)[:, :1].ravel() * .5 + periodic_noise(h, 64, .7, seed + 11)[:, :1].ravel() * .12
    lim = (w - 10) + edge_n[:, None] * 7
    alpha = 1 - smoothstep(lim - 1.6, lim + .6, xx)
    # the paper's edge is a single layer: a touch brighter just inside it
    rim = smoothstep(lim - 9, lim - 1, xx) * alpha
    rgb += rim[..., None] * np.array([18, 16, 12])
    out = np.dstack([np.clip(rgb, 0, 255), np.clip(alpha * 255, 0, 255)]).astype(np.uint8)
    return out


if __name__ == '__main__':
    a = sheet(3, 'l'); b = sheet(8, 'r')
    tissue = np.concatenate([a, b], axis=1)
    Image.fromarray(tissue, 'RGBA').save(os.path.join(OUT, 'tissue.webp'), quality=80, method=6)
    for f in ('tissue.webp',):
        print(f, os.path.getsize(os.path.join(OUT, f)), 'B')
    if len(sys.argv) > 1:
        bg = Image.new('RGBA', (tissue.shape[1], tissue.shape[0]), (40, 12, 10, 255))
        bg.alpha_composite(Image.fromarray(tissue, 'RGBA'), (0, 0))
        bg.convert('RGB').save(sys.argv[1], quality=90)
