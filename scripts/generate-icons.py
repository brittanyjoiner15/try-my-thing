"""Renders the app icons from the SVGs in assets/logo/.

Run from the repo root after changing a logo SVG:
    python3 -m pip install cairosvg pillow
    python3 scripts/generate-icons.py
"""
import io
from pathlib import Path

import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / "assets" / "logo"


def png(svg, size):
    data = cairosvg.svg2png(url=str(LOGO / svg), output_width=size, output_height=size)
    return Image.open(io.BytesIO(data)).convert("RGBA")


def save(svg, size, out):
    png(svg, size).save(ROOT / out, optimize=True)


# Browser tab. 16px drops the back card so the check still reads; 32 and 48 keep the stack.
# No icon.svg on purpose: browsers that support SVG favicons would use it at every size,
# skipping the simpler 16px frame.
ico = [png("logo-tiny.svg", 16), png("logo-small.svg", 32), png("logo-small.svg", 48)]
ico[2].save(ROOT / "app" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[:2])

# iOS home screen. iOS rounds the corners itself and shows black behind transparency,
# so this one is a full square.
save("logo-square.svg", 180, "app/apple-icon.png")

# PWA icons, referenced from app/manifest.js.
save("logo.svg", 192, "public/icons/icon-192.png")
save("logo.svg", 512, "public/icons/icon-512.png")
save("logo-maskable.svg", 512, "public/icons/icon-maskable-512.png")
print("Icons written.")
