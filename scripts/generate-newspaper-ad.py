#!/usr/bin/env python3
"""One full-page newspaper advertisement for TheSacramentoFree.

The page is a single ad about the website. The visual is the real lockup —
no lifestyle photos. This look is for THIS ad only; other Facebook posts
stay on the current photo brand.

  python3 scripts/generate-newspaper-ad.py
"""
from __future__ import annotations

import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "facebook-promo-assets" / "newspaper-ad"
PUBLIC = ROOT / "public" / "downloads" / "newspaper-ad"
ZIP_PATH = ROOT / "public" / "downloads" / "newspaper-ad.zip"
FONTS = ROOT / "facebook-promo-assets" / "fonts"
LOCKUP = ROOT / "public" / "TheSacramentoFree.png"

PAPER = (250, 249, 245)
NEWSPrint = (233, 232, 227)
INK = (10, 10, 10)
INK_MUTED = (69, 69, 63)
RULE = (18, 18, 18)

FRAUNCES = str(FONTS / "Fraunces.ttf")
LIB_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
LIB_REG = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
LIB_ITA = "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf"
INTER_BOLD = "/usr/share/fonts/truetype/macos/Inter-Bold.ttf"
INTER_MED = "/usr/share/fonts/truetype/macos/Inter-Medium.ttf"
INTER_SEMI = "/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf"

DATE = "Thursday, September 3, 2026"
CITY = "Sacramento • California"
URL = "sacramentobuynothing.com"

COLUMNS = [
    (
        "What it is",
        "A community website where Sacramento neighbors give away what they no longer need — and ask for what they do. Completely free. No ads. Your data is never sold.",
    ),
    (
        "How it works",
        "1. Post a giveaway or a request.\n2. Message to arrange pickup.\n3. Porch, driveway, or a public meetup.\n4. Keep it 100% free.",
    ),
    (
        "The rules",
        "No selling.\nNo bidding.\nNo flipping.\nNo auctions.\nEverything posted must be free. Just neighbors helping neighbors.",
    ),
]

ITEMS = "Furniture  ·  Clothes  ·  Kitchen  ·  Baby items  ·  Electronics  ·  Books  ·  Plants  ·  Tools  ·  Whatever still works"

JOIN_LINES = [
    "Give what you can.",
    "Ask for what you need.",
    "Help keep Sacramento connected.",
]


def font(path: str, size: int, axes: list[float] | None = None) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(path, size)
    if axes and hasattr(f, "set_variation_by_axes"):
        try:
            f.set_variation_by_axes(axes)
        except Exception:
            pass
    return f


def fraunces(size: int, weight: int = 900, opsz: float = 144) -> ImageFont.FreeTypeFont:
    return font(FRAUNCES, size, [opsz, weight, 0, 0])


def paper_background(size: tuple[int, int]) -> Image.Image:
    canvas = Image.new("RGB", size, PAPER)
    noise = Image.effect_noise(size, 14).convert("L")
    grain = Image.merge("RGB", (noise, noise, noise))
    canvas = Image.blend(canvas, grain, 0.08)
    canvas = Image.blend(canvas, Image.new("RGB", size, NEWSPrint), 0.10)
    return canvas


def load_logo(max_side: int) -> Image.Image:
    im = Image.open(LOCKUP).convert("RGB")
    trim = int(im.width * 0.035)
    im = im.crop((trim, trim, im.width - trim, im.height - trim))
    im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    return im


def wrap(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        if not words:
            lines.append("")
            continue
        current = words[0]
        for word in words[1:]:
            trial = f"{current} {word}"
            if draw.textlength(trial, font=font_obj) <= max_width:
                current = trial
            else:
                lines.append(current)
                current = word
        lines.append(current)
    return lines


def text_h(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.FreeTypeFont) -> int:
    bbox = draw.textbbox((0, 0), text, font=font_obj)
    return bbox[3] - bbox[1]


def tracked_center(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.FreeTypeFont, cx: int, y: int, fill, tracking: float = 0) -> int:
    widths = [draw.textbbox((0, 0), ch, font=font_obj)[2] - draw.textbbox((0, 0), ch, font=font_obj)[0] for ch in text]
    total = sum(widths) + tracking * max(0, len(text) - 1)
    x = cx - total / 2
    max_h = 0
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=font_obj, fill=fill)
        max_h = max(max_h, text_h(draw, ch, font_obj))
        x += w + tracking
    return y + max_h


def hairline(draw: ImageDraw.ImageDraw, x0: int, y: int, x1: int, width: int = 1) -> None:
    draw.rectangle((x0, y, x1, y + width), fill=RULE)


def double_rule(draw: ImageDraw.ImageDraw, x0: int, y: int, x1: int) -> int:
    draw.rectangle((x0, y, x1, y + 2), fill=RULE)
    draw.rectangle((x0, y + 5, x1, y + 6), fill=RULE)
    return y + 8


def draw_outer_frame(draw: ImageDraw.ImageDraw, w: int, h: int, m: int) -> None:
    draw.rectangle((m, m, w - m, h - m), outline=INK, width=3)
    inner = m + 6
    draw.rectangle((inner, inner, w - inner, h - inner), outline=INK, width=1)


def compose(size: tuple[int, int], variant: str) -> Image.Image:
    w, h = size
    canvas = paper_background(size)
    draw = ImageDraw.Draw(canvas)
    frame = int(w * 0.028)
    pad = frame + int(w * 0.042)
    inner_l, inner_r = pad, w - pad
    usable_w = inner_r - inner_l
    y = frame + int(h * 0.022)

    draw_outer_frame(draw, w, h, frame)

    foot_y = h - frame - int(h * 0.048)
    hairline(draw, inner_l, foot_y, inner_r)
    foot = font(INTER_MED, max(11, int(w * 0.016)))
    fy = foot_y + int(h * 0.01)
    draw.text((inner_l, fy), "Printed for neighbors, not for profit.", font=foot, fill=INK_MUTED)
    play = "Android closed testing — free to opt in"
    pw = draw.textlength(play, font=foot)
    draw.text((inner_r - pw, fy), play, font=foot, fill=INK)
    content_bottom = foot_y - int(h * 0.016)

    kicker = font(INTER_BOLD, max(11, int(w * 0.018)))
    y = tracked_center(draw, "ADVERTISEMENT", kicker, w // 2, y, INK_MUTED, tracking=int(w * 0.008))
    y += int(h * 0.012)
    y = double_rule(draw, inner_l, y, inner_r)
    y += int(h * 0.01)

    folio = font(INTER_MED, max(11, int(w * 0.017)))
    draw.text((inner_l, y), CITY, font=folio, fill=INK)
    dw = draw.textlength(DATE, font=folio)
    draw.text(((w - dw) / 2, y), DATE, font=folio, fill=INK)
    gw = draw.textlength("GRATIS", font=folio)
    draw.text((inner_r - gw, y), "GRATIS", font=folio, fill=INK)
    y += text_h(draw, DATE, folio) + int(h * 0.012)
    hairline(draw, inner_l, y, inner_r)
    y += int(h * 0.018)

    # Real lockup — no photograph
    logo_side = int(h * (0.168 if variant == "square" else 0.22 if variant == "feed" else 0.20))
    logo_side = min(logo_side, int(usable_w * (0.42 if variant == "square" else 0.50)))
    logo = load_logo(logo_side)
    canvas.paste(logo, ((w - logo.width) // 2, y))
    y += logo.height + int(h * 0.016)
    hairline(draw, inner_l, y, inner_r)
    y += int(h * 0.016)

    head = fraunces(int(w * (0.048 if variant == "square" else 0.052)), 900, 144)
    for line in wrap(draw, "Free local gifting in Sacramento.", head, usable_w):
        tw = draw.textlength(line, font=head)
        draw.text(((w - tw) / 2, y), line, font=head, fill=INK)
        y += int(text_h(draw, line, head) * 1.12)
    y += int(h * 0.006)
    deck = font(LIB_ITA, int(w * 0.026))
    for line in wrap(draw, "The community website. Not a marketplace. Not an auction.", deck, usable_w):
        tw = draw.textlength(line, font=deck)
        draw.text(((w - tw) / 2, y), line, font=deck, fill=INK)
        y += int(text_h(draw, line, deck) * 1.28)
    y += int(h * 0.014)
    y = double_rule(draw, inner_l, y, inner_r)
    y += int(h * 0.016)

    # Three equal columns of site info
    col_gap = int(w * 0.028)
    col_w = (usable_w - 2 * col_gap) // 3
    title_f = font(INTER_BOLD, max(13, int(w * 0.022)))
    body_f = font(LIB_REG, max(14, int(w * 0.020)))
    leading = int(text_h(draw, "Ag", body_f) * 1.32)
    col_top = y
    max_col_h = 0
    for i, (title, body) in enumerate(COLUMNS):
        x = inner_l + i * (col_w + col_gap)
        cy = col_top
        draw.text((x, cy), title.upper(), font=title_f, fill=INK)
        cy += text_h(draw, title, title_f) + 6
        hairline(draw, x, cy, x + col_w, width=2)
        cy += 10
        for line in wrap(draw, body, body_f, col_w):
            draw.text((x, cy), line, font=body_f, fill=INK)
            cy += leading
        max_col_h = max(max_col_h, cy - col_top)

    y = col_top + max_col_h + int(h * 0.014)
    for i in range(2):
        x = inner_l + (i + 1) * (col_w + col_gap) - col_gap // 2
        draw.rectangle((x, col_top, x + 1, col_top + max_col_h), fill=RULE)

    if variant != "square" and y + int(h * 0.08) < content_bottom:
        hairline(draw, inner_l, y, inner_r)
        y += int(h * 0.012)
        item_kicker = font(INTER_BOLD, max(11, int(w * 0.018)))
        item_body = font(LIB_ITA, max(13, int(w * 0.019)))
        draw.text((inner_l, y), "WHAT NEIGHBORS POST", font=item_kicker, fill=INK_MUTED)
        y += text_h(draw, "WHAT", item_kicker) + 6
        for line in wrap(draw, ITEMS, item_body, usable_w):
            draw.text((inner_l, y), line, font=item_body, fill=INK)
            y += int(text_h(draw, line, item_body) * 1.3)
        y += int(h * 0.012)

    y = double_rule(draw, inner_l, y, inner_r)
    y += int(h * 0.012)

    join_head = fraunces(int(w * (0.034 if variant == "square" else 0.038)), 900, 144)
    join_body = font(LIB_REG, max(14, int(w * (0.020 if variant == "square" else 0.022))))
    url_f = font(INTER_BOLD, int(w * (0.028 if variant == "square" else 0.032)))
    note_f = font(LIB_ITA, max(12, int(w * 0.018)))
    tw = draw.textlength("Join the community", font=join_head)
    draw.text(((w - tw) / 2, y), "Join the community", font=join_head, fill=INK)
    y += text_h(draw, "Join", join_head) + int(h * 0.008)
    for line in JOIN_LINES:
        tw = draw.textlength(line, font=join_body)
        draw.text(((w - tw) / 2, y), line, font=join_body, fill=INK)
        y += int(text_h(draw, line, join_body) * 1.32)
    y += int(h * 0.01)
    tw = draw.textlength(URL, font=url_f)
    draw.text(((w - tw) / 2, y), URL, font=url_f, fill=INK)
    y += text_h(draw, URL, url_f) + int(h * 0.008)
    if variant != "square":
        note = "Website works in any browser. Android app adds live Go Get pickup."
        for line in wrap(draw, note, note_f, usable_w):
            if y + text_h(draw, line, note_f) > content_bottom:
                break
            tw = draw.textlength(line, font=note_f)
            draw.text(((w - tw) / 2, y), line, font=note_f, fill=INK_MUTED)
            y += int(text_h(draw, line, note_f) * 1.28)
    return canvas


CAPTION = """The Sacramento Free is the community website for Sacramento neighbors.

Give away what you don't need. Ask for what you do. Porch pickup. 100% free.

No selling. No bidding. No flipping. No ads.

Join: https://www.sacramentobuynothing.com

Android (closed testing — free to opt in):
https://play.google.com/apps/testing/org.sacramentobuynothing.app

Give freely. Ask kindly.

#TheSacramentoFree #Sacramento #GiveFreelyAskKindly #KeepItLocal
"""

README = """The Sacramento Free — newspaper advertisement
=============================================

THIS LOOK IS FOR THIS AD ONLY.
Do not use the newsprint layout on the other Facebook posts.

One full-page newspaper ad about the website. The visual is the real
TheSacramentoFree lockup — no lifestyle photos.

What to upload
--------------
1. newspaper-ad-feed.jpg     1080×1350 (4:5 Facebook feed) — post this
2. newspaper-ad-portrait.jpg 1080×1620
3. newspaper-ad-square.jpg   1080×1080

Caption: paste from CAPTION.txt

Rebuild: python3 scripts/generate-newspaper-ad.py
"""


def save_jpeg(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert("RGB").save(path, format="JPEG", quality=92, optimize=True, subsampling=1)
    print(f"wrote {path}")


def pack() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    ZIP_PATH.parent.mkdir(parents=True, exist_ok=True)
    for old in PUBLIC.glob("*"):
        if old.is_file():
            old.unlink()
    names = []
    for path in sorted(OUT.glob("*.jpg")) + [OUT / "CAPTION.txt", OUT / "README.txt"]:
        dest = PUBLIC / path.name
        dest.write_bytes(path.read_bytes())
        names.append(path)
    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in names:
            zf.write(path, arcname=path.name)
    print(f"packed {ZIP_PATH} ({ZIP_PATH.stat().st_size // 1024} KB)")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    save_jpeg(compose((1080, 1350), "feed"), OUT / "newspaper-ad-feed.jpg")
    save_jpeg(compose((1080, 1620), "portrait"), OUT / "newspaper-ad-portrait.jpg")
    save_jpeg(compose((1080, 1080), "square"), OUT / "newspaper-ad-square.jpg")
    (OUT / "CAPTION.txt").write_text(CAPTION)
    (OUT / "README.txt").write_text(README)
    pack()


if __name__ == "__main__":
    main()
