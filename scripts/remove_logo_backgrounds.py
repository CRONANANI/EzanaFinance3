#!/usr/bin/env python3
"""Remove black backgrounds from partner logo images, making them transparent."""

from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow not installed. Run: pip install Pillow")
    exit(1)

PARTNERS_DIR = Path(__file__).resolve().parent.parent / "app" / "assets" / "images" / "partners"
LOGO_FILES = [
    "quiver-quantitative.png",
    "polygon.png",
    "usaspending.png",
    "uspto.png",
    "sec-edgar.png",
    "plaid.png",
    "wall-street-bets.png",
    "polymarket.png",
]

# Pixels with R,G,B all below this threshold become transparent (removes black bg)
DEFAULT_THRESHOLD = 35
# QuiverQuant and Plaid have dark gray logos - use lower threshold to keep logo visible
LIGHT_THRESHOLD_FILES = {"quiver-quantitative.png", "plaid.png"}
LIGHT_THRESHOLD = 12


def make_background_transparent(img: Image.Image, threshold: int) -> Image.Image:
    """Replace black/dark pixels with transparent."""
    img = img.convert("RGBA")
    data = img.getdata()

    new_data = []
    for item in data:
        r, g, b, a = item
        # If pixel is very dark (black background), make it transparent
        if r <= threshold and g <= threshold and b <= threshold:
            new_data.append((r, g, b, 0))
        else:
            new_data.append(item)

    img.putdata(new_data)
    return img


def main():
    if not PARTNERS_DIR.exists():
        print(f"Partners directory not found: {PARTNERS_DIR}")
        exit(1)

    for filename in LOGO_FILES:
        path = PARTNERS_DIR / filename
        if not path.exists():
            print(f"Skip (not found): {filename}")
            continue

        try:
            threshold = LIGHT_THRESHOLD if filename in LIGHT_THRESHOLD_FILES else DEFAULT_THRESHOLD
            img = Image.open(path)
            img = make_background_transparent(img, threshold)
            img.save(path, "PNG")
            print(f"Updated: {filename}")
        except Exception as e:
            print(f"Error processing {filename}: {e}")

    print("Done.")


if __name__ == "__main__":
    main()
