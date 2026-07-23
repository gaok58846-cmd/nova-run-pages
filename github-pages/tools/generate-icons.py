from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

def icon(size: int, maskable: bool = False) -> Image.Image:
    image = Image.new("RGB", (size, size), "#181919")
    draw = ImageDraw.Draw(image)
    margin = int(size * (0.18 if maskable else 0.12))
    cx = cy = size // 2
    radius = size // 2 - margin
    points = []
    for index in range(6):
        import math
        angle = math.radians(-90 + index * 60)
        points.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
    draw.polygon(points, fill="#202729", outline="#78c8d8", width=max(2, size // 70))
    inner = int(radius * .72)
    inner_points = []
    for index in range(6):
        import math
        angle = math.radians(-90 + index * 60)
        inner_points.append((cx + math.cos(angle) * inner, cy + math.sin(angle) * inner))
    draw.polygon(inner_points, fill="#293033", outline="#d97757", width=max(2, size // 90))
    stroke = max(6, size // 15)
    x0, x1 = cx - int(inner * .52), cx + int(inner * .52)
    y0, y1 = cy - int(inner * .55), cy + int(inner * .55)
    draw.line((x0, y1, x0, y0, x1, y1, x1, y0), fill="#f4eee5", width=stroke, joint="curve")
    star = max(4, size // 30)
    draw.ellipse((cx + int(radius*.54)-star, cy-int(radius*.7)-star, cx+int(radius*.54)+star, cy-int(radius*.7)+star), fill="#78d9bd")
    return image

for name, size, maskable in [
    ("icon-192.png", 192, False),
    ("icon-512.png", 512, False),
    ("icon-maskable-512.png", 512, True),
    ("apple-touch-icon.png", 180, False),
]:
    icon(size, maskable).save(OUT / name, optimize=True)
