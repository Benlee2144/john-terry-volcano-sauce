"""Turn the client's raw art and photos into web-ready assets.

Usage: python scripts/build_assets.py   (needs Pillow + numpy)
Reads the originals from the project root and writes to src/public/assets.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src/public/assets"
(OUT / "art").mkdir(parents=True, exist_ok=True)
(OUT / "label").mkdir(parents=True, exist_ok=True)
(OUT / "photo").mkdir(parents=True, exist_ok=True)

PREFIX = "Copy of john and terry volcano sauce "
ART_W, ART_H = 1024, 1896

# Pixel crop of the rounded art panel inside each source file: (left, top, right, bottom)
ARTS = {
    "verde": (PREFIX + "Ryns Mellow Verde for Internet (1).jpg", (50, 2, 600, 1018)),
    "zaxe": (PREFIX + "Zaxe Sause FOR PRINT LARGE (1).jpg", (60, 4, 2805, 5096)),
    "ragin": (PREFIX + "Ragin Cajun FOR INTERNET SMALL (1).jpg", (14, 2, 564, 1018)),
    "shine": (PREFIX + "Shine The Light FOR INTERNET SMALL (1).jpg", (11, 2, 560, 1018)),
    "ichiban": (PREFIX + "ichiban for print high res Small (1).jpg", (16, 2, 570, 1018)),
    "amy": (PREFIX + "Amys Sweet Heat For Print.jpg", (255, 8, 3004, 5096)),
}


def fix_shine_rating(img):
    """The art file still says VEI 7; the bottle on the shelf says 6."""
    sx, sy = img.width / 549, img.height / 1016
    cx, cy, r = 479 * sx, 963 * sy, 31 * sx
    d = ImageDraw.Draw(img)
    red = img.getpixel((int(cx - r * 0.62), int(cy - r * 0.3)))
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=red)
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf", int(r * 1.62))
    d.text((cx, cy), "6", font=font, fill=(16, 8, 10), anchor="mm")
    return img


def rounded_mask(size, radius, ss=4):
    m = Image.new("L", (size[0] * ss, size[1] * ss), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, m.width - 1, m.height - 1), radius * ss, fill=255)
    return m.resize(size, Image.LANCZOS)


def build_art():
    for sid, (name, crop) in ARTS.items():
        img = Image.open(ROOT / name).convert("RGB").crop(crop)
        small = img.width < ART_W
        img = img.resize((ART_W, ART_H), Image.LANCZOS)
        if small:  # upscaled art gets its ink edges back
            img = img.filter(ImageFilter.UnsharpMask(radius=2.2, percent=110, threshold=2))
        if sid == "shine":
            img = fix_shine_rating(img)
        img.save(OUT / f"art/{sid}.webp", quality=88, method=6)

        # Bottle label: the art panel on white paper, the way it's actually printed
        margin = 40
        paper = Image.new("RGB", (ART_W + margin * 2, ART_H + margin * 2), (244, 241, 234))
        paper.paste(img, (margin, margin), rounded_mask((ART_W, ART_H), 44))
        paper.save(OUT / f"label/{sid}.webp", quality=88, method=6)
        print("art", sid)


def key_white(img, thresh=238, seeds=()):
    """Flood from the border so white *inside* the art survives."""
    w, h = img.size
    arr = np.asarray(img.convert("RGB")).astype(float)
    near = arr.min(axis=2) >= thresh
    seen = np.zeros((h, w), bool)
    stack = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)]
    stack += [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)] + list(seeds)
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y, x] or not near[y, x]:
            continue
        seen[y, x] = True
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    alpha = Image.fromarray((~seen * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(1.1))
    # Pull the mask in slightly so no white fringe glows on the dark page
    alpha = alpha.point(lambda v: max(0, min(255, int((v - 120) * 2.4))))
    out = img.convert("RGBA")
    out.putalpha(alpha)
    return out


def build_emblem():
    img = Image.open(ROOT / "John and Terry's .jpg").convert("RGB")
    img = img.resize((img.width * 2, img.height * 2), Image.LANCZOS)
    img = img.filter(ImageFilter.UnsharpMask(radius=2.4, percent=120, threshold=2))
    key_white(img, seeds=[(410, 1120), (420, 1060), (400, 1180)]).save(OUT / "emblem.webp", quality=90, method=6)
    print("emblem")


def build_portraits():
    """Black ink on white -> white ink with real transparency, split into the two faces."""
    img = Image.open(ROOT / "Logo.jpg").convert("L")
    img = img.resize((img.width * 3, img.height * 3), Image.BICUBIC)
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    ink = np.clip((200 - np.asarray(img).astype(float)) / 110, 0, 1)
    alpha = Image.fromarray((ink * 255).astype("uint8"))
    w, h = alpha.size
    mid = int(w * 0.525)
    for side, box in (("left", (0, 0, mid, h)), ("right", (mid, 0, w, h))):
        a = alpha.crop(box)
        a = a.crop(a.getbbox())
        rgba = Image.new("RGBA", a.size, (255, 255, 255, 0))
        rgba.putalpha(a)
        rgba.save(OUT / f"portrait-{side}.webp", quality=90, method=6)
    print("portraits")


def lerp_map(gray, stops):
    """Gradient-map a 0..1 gray array through [(pos, (r,g,b)), ...]."""
    pos = [s[0] for s in stops]
    return np.dstack([np.interp(gray, pos, [s[1][c] for s in stops]) for c in range(3)])


def vignette(h, w, strength):
    y, x = np.mgrid[0:h, 0:w]
    d = np.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2))
    return 1 - strength * np.clip(d - 0.35, 0, None) ** 1.7


def build_lineup():
    img = Image.open(ROOT / "555722859_758286393867590_138284183638714094_n.jpg").convert("RGB")
    img = img.crop((0, 0, 1080, 696)).resize((2160, 1392), Image.LANCZOS)
    img = img.filter(ImageFilter.UnsharpMask(radius=3, percent=70, threshold=3))
    a = np.asarray(img).astype(float) / 255
    h, w, _ = a.shape
    luma = (a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722)[..., None]
    # Pull the blue-grey wall out of the frame, then grade warm and dark
    cool = np.clip((a[..., 2] - a[..., 0]) * 7 + 0.45, 0, 1)
    cool_img = Image.fromarray((cool * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(14))
    cool = (np.asarray(cool_img).astype(float) / 255)[..., None]
    out = a * (1 - cool) + luma * np.array([0.62, 0.44, 0.34]) * cool
    grey = (out[..., 0] * 0.2126 + out[..., 1] * 0.7152 + out[..., 2] * 0.0722)[..., None]
    out = np.clip(grey + (out - grey) * 1.28, 0, 1)
    out = np.clip((out - 0.035) / 0.8, 0, 1) ** 1.3
    out = out * np.array([1.06, 0.97, 0.88])
    out *= vignette(h, w, 0.8)[..., None]
    Image.fromarray((np.clip(out, 0, 1) * 255).astype("uint8")).save(OUT / "photo/lineup.webp", quality=84, method=6)
    print("lineup")


def build_founders():
    """Crop past the kitchen clutter, then a lava duotone with a print halftone."""
    img = Image.open(ROOT / "476365808_578748788488019_7985035186520810199_n.jpg").convert("L")
    img = img.crop((205, 215, 745, 690))
    img = img.resize((img.width * 3, img.height * 3), Image.LANCZOS)
    img = ImageOps.autocontrast(img, cutoff=1)
    g = np.asarray(img).astype(float) / 255
    h, w = g.shape
    g = np.clip((g - 0.04) / 0.9, 0, 1) ** 1.12
    # 45-degree halftone dots, strongest in the mid-tones so faces stay readable
    y, x = np.mgrid[0:h, 0:w]
    cell = 7.0
    u, v = (x + y) * 0.7071, (x - y) * 0.7071
    dots = (np.cos(2 * np.pi * u / cell) * np.cos(2 * np.pi * v / cell) + 1) / 2
    g = np.clip(g + (dots - 0.5) * 0.3 * np.sin(np.pi * g), 0, 1)
    out = lerp_map(g, [(0, (9, 4, 4)), (0.3, (92, 12, 8)), (0.58, (226, 62, 14)), (0.82, (255, 170, 44)), (1, (255, 240, 208))])
    out *= vignette(h, w, 0.55)[..., None]
    Image.fromarray(np.clip(out, 0, 255).astype("uint8")).save(OUT / "photo/founders.webp", quality=86, method=6)
    print("founders")


def build_og():
    """Link-preview card. Facebook and most scrapers still want a JPEG at 1200x630."""
    img = ImageOps.fit(Image.open(OUT / "photo/lineup.webp").convert("RGB"), (1200, 630), Image.LANCZOS, centering=(0.62, 0.55))
    img.save(OUT / "og.jpg", quality=86, optimize=True, progressive=True)
    print("og")


if __name__ == "__main__":
    build_art()
    build_emblem()
    build_portraits()
    build_lineup()
    build_founders()
    build_og()
