#!/usr/bin/env python3
"""Process uploaded brokerage logos for landing carousel."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "brokerage-logos"
ASSETS = Path(
    r"C:\Users\User\.cursor\projects\c-Users-User-Desktop-EzanaWorldTakeOver-cronanani\assets"
)

# (source glob substring, output filename, options)
JOBS = [
    ("charles-schwab", "charles-schwab.png", {}),
    ("coinbase", "coinbase.png", {}),
    ("alpaca", "alpaca.png", {"whiten_text": True}),
    ("vanguard", "vanguard.png", {"whiten_dark": True}),
    ("questrade", "questrade.png", {}),
    ("interactive-brokers", "interactive-brokers.png", {}),
    ("tradier", "tradier.png", {}),
    ("etrade", "etrade.png", {}),
]

BG_THRESHOLD = 40
PADDING = 20
MAX_EDGE = 512


def find_source(substr: str) -> Path:
    for p in ASSETS.iterdir():
        if substr in p.name.lower() and p.suffix.lower() == ".png":
            return p
    raise FileNotFoundError(f"No asset matching {substr!r} in {ASSETS}")


def is_bg(r: int, g: int, b: int, a: int, threshold: int) -> bool:
    return a == 0 or (r <= threshold and g <= threshold and b <= threshold)


def flood_transparent(img: Image.Image, threshold: int = BG_THRESHOLD) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    visited = [[False] * w for _ in range(h)]
    q = deque()

    for x in range(w):
        for y in (0, h - 1):
            if not visited[y][x]:
                r, g, b, a = px[x, y]
                if is_bg(r, g, b, a, threshold):
                    q.append((x, y))
                    visited[y][x] = True
    for y in range(h):
        for x in (0, w - 1):
            if not visited[y][x]:
                r, g, b, a = px[x, y]
                if is_bg(r, g, b, a, threshold):
                    q.append((x, y))
                    visited[y][x] = True

    while q:
        x, y = q.popleft()
        r, g, b, a = px[x, y]
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                nr, ng, nb, na = px[nx, ny]
                if is_bg(nr, ng, nb, na, threshold):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    return img


def whiten_dark_text(img: Image.Image) -> Image.Image:
    """Recolor near-black visible pixels to white (Alpaca wordmark)."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 10:
                continue
            if r < 70 and g < 70 and b < 70:
                px[x, y] = (255, 255, 255, a)
    return img


def whiten_dark_art(img: Image.Image) -> Image.Image:
    """Recolor dark non-red pixels to white (Vanguard ship). Keep red wordmark."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 10:
                continue
            if r > 120 and r > g + 25 and r > b + 25:
                continue
            if r < 90 and g < 90 and b < 90:
                px[x, y] = (255, 255, 255, a)
    return img


def autocrop(img: Image.Image, padding: int = PADDING) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(img.width, right + padding)
    bottom = min(img.height, bottom + padding)
    return img.crop((left, top, right, bottom))


def process_one(substr: str, out_name: str, opts: dict) -> None:
    src = find_source(substr)
    img = Image.open(src)
    img = flood_transparent(img)
    if opts.get("whiten_text"):
        img = whiten_dark_text(img)
    if opts.get("whiten_dark"):
        img = whiten_dark_art(img)
    img = autocrop(img)
    w, h = img.size
    if max(w, h) > MAX_EDGE:
        scale = MAX_EDGE / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / out_name
    img.save(dest, "PNG", optimize=True)
    print(f"Wrote {dest} ({img.size[0]}x{img.size[1]}) from {src.name}")


def main() -> None:
    if not ASSETS.exists():
        raise SystemExit(f"Assets dir not found: {ASSETS}")
    for substr, out_name, opts in JOBS:
        process_one(substr, out_name, opts)
    print("Done.")


if __name__ == "__main__":
    main()
