#!/usr/bin/env python3
"""Compose a newspaper-front-page ad for The Sacramento Free.

This look is for THIS ad only. Other Facebook posts stay on the current
lifestyle brand (photo + green bar). Do not reuse this newsprint masthead
on those posts.

  python3 scripts/generate-newspaper-ad.py
"""
from __future__ import annotations

import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
STILLS = ROOT / "facebook-promo-assets" / "stills-today"
OUT = ROOT / "facebook-promo-assets" / "newspaper-ad"
PUBLIC = ROOT / "public" / "downloads" / "newspaper-ad"
ZIP_PATH = ROOT / "public" / "downloads" / "newspaper-ad.zip"
FONTS = ROOT / "facebook-promo-assets" / "fonts"

PAPER = (250, 249, 245)
NEWSPrint = (233, 232, 227)
INK = (10, 10, 10)
INK_MUTED = (69, 69, 63)
RULE = (18, 18, 18)
CAPTION_GRAY = (45, 45, 39)

FRAUNCES = str(FONTS / "Fraunces.ttf")
BASK_ITA = str(FONTS / "LibreBaskerville-Italic.ttf")
LIB_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
LIB_REG = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
LIB_ITA = "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf"
INTER_BOLD = "/usr/share/fonts/truetype/macos/Inter-Bold.ttf"
INTER_MED = "/usr/share/fonts/truetype/macos/Inter-Medium.ttf"
COURIER = "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf"

LEAD_PHOTO = STILLS / "promo_kitchen_handoff.png"
SECOND_PHOTO = STILLS / "promo_walking_home.png"

DATE = "Wednesday, September 2, 2026"
CITY = "Sacramento • California"
EDITION = "Community Edition"
MOTTO = "Give freely. Ask kindly."
VOLUME = "Vol. I  ·  No. 1"
PRICE = "Gratis"
URL = "sacramentobuynothing.com"
BYLINE = "Printed for neighbors, not for profit."

HEADLINE = "Don't throw it away."
DECK = "Neighbors are giving good stuff a second life — no selling, no bidding, no flipping."
PHOTO_CAPTION = "Porch pickup in Midtown: a toaster, pans, and plates change hands before supper. (Staff)"

LEAD = (
    "MIDTOWN — The closet was full. The garage, too. A lamp nobody used. "
    "A bike the kids outgrew. A drill that still worked."
)
BODY = (
    "By evening a neighbor had it. That is the whole trade on The Sacramento Free: "
    "post what you do not need, ask for what you do, keep it in town. "
    "No marketplace. No auction. No side hustle. If it is on the page, it is free. "
    "Porch pickup. Same day. Same neighborhood. "
    "Today's edition — and everything in it — is free."
)

CLASSIFIEDS = [
    ("FREE", "Kids' teal bicycle. East Sac porch. Tonight."),
    ("FREE", "Kitchen box: toaster, pans, plates. Midtown."),
    ("FREE", "Cordless drill. Still works. Tahoe Park."),
    ("WANTED", "Stroller for a two-year-old. Ask kindly."),
    ("FREE", "Houseplant and a brass lamp. Already walked home."),
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
    # axes: Optical Size, Weight, Softness, Wonky
    return font(FRAUNCES, size, [opsz, weight, 0, 0])


def paper_background(size: tuple[int, int]) -> Image.Image:
    w, h = size
    canvas = Image.new("RGB", size, PAPER)
    noise = Image.effect_noise(size, 14).convert("L")
    grain = Image.merge("RGB", (noise, noise, noise))
    canvas = Image.blend(canvas, grain, 0.085)
    # faint newsprint yellowing toward the edges
    edge = Image.new("RGB", size, NEWSPrint)
    canvas = Image.blend(canvas, edge, 0.12)
    return canvas


def cover_crop(im: Image.Image, size: tuple[int, int], focus: float = 0.38) -> Image.Image:
    w, h = size
    im = im.convert("RGB")
    if im.width / im.height > w / h:
        new_h = h
        new_w = int(im.width * h / im.height)
        im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
        x = (new_w - w) // 2
        return im.crop((x, 0, x + w, h))
    new_w = w
    new_h = int(im.height * w / im.width)
    im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
    y = int(max(0, min(new_h - h, (new_h - h) * focus)))
    return im.crop((0, y, w, y + h))


def process_photo(src: Path, size: tuple[int, int], focus: float = 0.35) -> Image.Image:
    im = cover_crop(Image.open(src), size, focus=focus)
    im = ImageOps.autocontrast(im, cutoff=1)
    im = ImageEnhance.Color(im).enhance(1.14)
    im = ImageEnhance.Contrast(im).enhance(1.08)
    wash = Image.new("RGB", size, NEWSPrint)
    return Image.blend(im, wash, 0.08)


def tracked_center(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.FreeTypeFont, cx: int, y: int, fill, tracking: float = 0) -> int:
    widths = []
    for ch in text:
        bbox = draw.textbbox((0, 0), ch, font=font_obj)
        widths.append(bbox[2] - bbox[0])
    total = sum(widths) + tracking * max(0, len(text) - 1)
    x = cx - total / 2
    max_h = 0
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=font_obj, fill=fill)
        bbox = draw.textbbox((0, 0), ch, font=font_obj)
        max_h = max(max_h, bbox[3] - bbox[1])
        x += w + tracking
    return y + max_h


def wrap(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    if not words:
        return [""]
    lines: list[str] = []
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


def draw_columns(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.FreeTypeFont, box: tuple[int, int, int, int], gap: int, leading: int) -> None:
    x0, y0, x1, y1 = box
    col_w = (x1 - x0 - gap) // 2
    lines = wrap(draw, text, font_obj, col_w)
    y = y0
    col = 0
    for line in lines:
        if y + leading > y1:
            col += 1
            y = y0
            if col > 1:
                break
        x = x0 + col * (col_w + gap)
        draw.text((x, y), line, font=font_obj, fill=INK)
        y += leading


def hairline(draw: ImageDraw.ImageDraw, x0: int, y: int, x1: int, width: int = 1, fill=RULE) -> None:
    draw.rectangle((x0, y, x1, y + width), fill=fill)


def double_rule(draw: ImageDraw.ImageDraw, x0: int, y: int, x1: int) -> int:
    draw.rectangle((x0, y, x1, y + 2), fill=RULE)
    draw.rectangle((x0, y + 5, x1, y + 6), fill=RULE)
    return y + 8


def compose(size: tuple[int, int], variant: str) -> Image.Image:
    w, h = size
    canvas = paper_background(size)
    draw = ImageDraw.Draw(canvas)
    pad = int(w * 0.055)
    inner_l, inner_r = pad, w - pad
    y = int(h * 0.028)

    strip_font = font(INTER_BOLD, max(11, int(w * 0.018)))
    vol_font = font(COURIER, max(11, int(w * 0.017)))
    # Top strip: edition · motto · volume
    draw.text((inner_l, y), EDITION.upper(), font=strip_font, fill=INK_MUTED)
    motto_w = draw.textlength(MOTTO.upper(), font=strip_font)
    draw.text(((w - motto_w) / 2, y), MOTTO.upper(), font=strip_font, fill=INK)
    vol_w = draw.textlength(VOLUME, font=vol_font)
    draw.text((inner_r - vol_w, y), VOLUME, font=vol_font, fill=INK_MUTED)
    y += text_h(draw, EDITION, strip_font) + int(h * 0.012)
    hairline(draw, inner_l, y, inner_r)
    y += int(h * 0.016)

    # Masthead: The / SACRAMENTO / Free
    the_font = font(INTER_BOLD, max(13, int(w * 0.022)))
    y = tracked_center(draw, "THE", the_font, w // 2, y, INK_MUTED, tracking=int(w * 0.012))
    y += int(h * 0.008)
    name_size = int(w * (0.118 if variant != "square" else 0.102))
    name_font = fraunces(name_size, 900, 144)
    # Slight negative tracking on the nameplate
    y = tracked_center(draw, "SACRAMENTO", name_font, w // 2, y, INK, tracking=int(-w * 0.006))
    y += int(h * 0.018)
    free_font = font(LIB_ITA, int(w * (0.052 if variant != "square" else 0.046)))
    y = tracked_center(draw, "FREE", free_font, w // 2, y, INK, tracking=int(w * 0.018))
    y += int(h * 0.018)
    y = double_rule(draw, inner_l, y, inner_r)
    y += int(h * 0.01)

    date_font = font(INTER_MED, max(12, int(w * 0.019)))
    draw.text((inner_l, y), CITY, font=date_font, fill=INK)
    date_w = draw.textlength(DATE, font=date_font)
    draw.text(((w - date_w) / 2, y), DATE, font=date_font, fill=INK)
    price_w = draw.textlength(PRICE.upper(), font=date_font)
    draw.text((inner_r - price_w, y), PRICE.upper(), font=date_font, fill=INK)
    y += text_h(draw, DATE, date_font) + int(h * 0.01)
    hairline(draw, inner_l, y, inner_r)
    y += int(h * 0.018)

    # Headline
    head_font = fraunces(int(w * (0.072 if variant != "square" else 0.062)), 900, 144)
    head_lines = wrap(draw, HEADLINE, head_font, inner_r - inner_l)
    for line in head_lines:
        draw.text((inner_l, y), line, font=head_font, fill=INK)
        y += int(text_h(draw, line, head_font) * 1.08)
    y += int(h * 0.008)

    deck_font = font(LIB_ITA, int(w * 0.028))
    for line in wrap(draw, DECK, deck_font, inner_r - inner_l):
        draw.text((inner_l, y), line, font=deck_font, fill=INK)
        y += int(text_h(draw, line, deck_font) * 1.25)
    y += int(h * 0.014)

    # Lead photograph — colour plates, as the paper does
    photo_h = int(h * (0.28 if variant == "feed" else 0.26 if variant == "square" else 0.30))
    if variant == "square":
        photo_h = int(h * 0.30)
    photo = process_photo(LEAD_PHOTO, (inner_r - inner_l, photo_h), focus=0.32)
    canvas.paste(photo, (inner_l, y))
    # 1px ink frame
    draw.rectangle((inner_l, y, inner_r, y + photo_h), outline=INK, width=1)
    y += photo_h + int(h * 0.008)

    cap_font = font(LIB_ITA, max(13, int(w * 0.018)))
    cap_lines = wrap(draw, PHOTO_CAPTION, cap_font, inner_r - inner_l)
    for line in cap_lines:
        draw.text((inner_l, y), line, font=cap_font, fill=CAPTION_GRAY)
        y += int(text_h(draw, line, cap_font) * 1.2)
    y += int(h * 0.012)
    hairline(draw, inner_l, y, inner_r)
    y += int(h * 0.014)

    body_font = font(LIB_REG, max(15, int(w * 0.022)))
    lead_font = font(LIB_BOLD, max(15, int(w * 0.022)))
    class_head = font(INTER_BOLD, max(12, int(w * 0.018)))
    class_body = font(LIB_REG, max(13, int(w * 0.019)))
    class_kicker = font(LIB_BOLD, max(13, int(w * 0.019)))

    if variant == "square":
        # Tight: one column of lead + URL footer. No classifieds.
        lead_lines = wrap(draw, LEAD + " " + BODY, body_font, inner_r - inner_l)
        leading = int(text_h(draw, "Ag", body_font) * 1.35)
        for i, line in enumerate(lead_lines):
            if y + leading > h - int(h * 0.07):
                break
            draw.text((inner_l, y), line, font=lead_font if i == 0 else body_font, fill=INK)
            y += leading
    else:
        gutter = int(w * 0.028)
        class_w = int(w * 0.30)
        story_r = inner_r - class_w - gutter
        # Classifieds rail
        rail_top = y
        vrule_x = story_r + gutter // 2
        draw.rectangle((vrule_x, rail_top, vrule_x + 1, h - int(h * 0.06)), fill=RULE)
        cy = rail_top
        kicker = "CLASSIFIEDS  ·  ALL FREE"
        draw.text((story_r + gutter + 8, cy), kicker, font=class_head, fill=INK)
        cy += text_h(draw, kicker, class_head) + 6
        hairline(draw, story_r + gutter + 8, cy, inner_r, width=1)
        cy += 10
        item_leading = int(text_h(draw, "Ag", class_body) * 1.28)
        post_line = "To post: " + URL
        post_h = text_h(draw, post_line, class_head) + 8
        rail_bottom = h - int(h * 0.058) - post_h
        for label, item in CLASSIFIEDS:
            block = item_leading * (1 + len(wrap(draw, item, class_body, class_w - 20))) + 18
            if cy + block > rail_bottom:
                break
            draw.text((story_r + gutter + 8, cy), label, font=class_kicker, fill=INK)
            cy += item_leading
            for line in wrap(draw, item, class_body, class_w - 20):
                draw.text((story_r + gutter + 8, cy), line, font=class_body, fill=INK)
                cy += item_leading
            cy += 8
            hairline(draw, story_r + gutter + 8, cy, inner_r, width=1)
            cy += 10
        draw.text((story_r + gutter + 8, rail_bottom), post_line, font=class_head, fill=INK)

        # Story: drop cap, then two columns under it
        story = LEAD + " " + BODY
        drop = story[0]
        rest = story[1:]
        drop_font = fraunces(int(w * 0.078), 900, 144)
        drop_box = draw.textbbox((0, 0), drop, font=drop_font)
        drop_w = drop_box[2] - drop_box[0] + 8
        drop_h = drop_box[3] - drop_box[1]
        draw.text((inner_l, y - 6), drop, font=drop_font, fill=INK)
        leading = int(text_h(draw, "Ag", body_font) * 1.32)
        drop_lines = max(2, int(drop_h / leading) + 1)
        beside = wrap(draw, rest, body_font, (story_r - inner_l) - drop_w)
        fy = y
        drawn_words = 0
        for line in beside[:drop_lines]:
            draw.text((inner_l + drop_w, fy), line, font=body_font, fill=INK)
            drawn_words += len(line.split())
            fy += leading
        remain = " ".join(rest.split()[drawn_words:])
        col_top = max(fy + 4, y + drop_h + 6)
        draw_columns(
            draw,
            remain,
            body_font,
            (inner_l, col_top, story_r, h - int(h * 0.075)),
            gap=int(w * 0.022),
            leading=leading,
        )

    # Footer
    foot_y = h - int(h * 0.048)
    hairline(draw, inner_l, foot_y, inner_r)
    foot_font = font(INTER_MED, max(12, int(w * 0.018)))
    url_font = font(INTER_BOLD, max(12, int(w * 0.018)))
    fy = foot_y + int(h * 0.01)
    draw.text((inner_l, fy), BYLINE, font=foot_font, fill=INK_MUTED)
    uw = draw.textlength(URL, font=url_font)
    draw.text((inner_r - uw, fy), URL, font=url_font, fill=INK)
    return canvas


CAPTION = """Today's edition is free. So is everything in it.

The Sacramento Free — a newspaper for neighbors. No selling. No bidding. No flipping. Just giveaways from people who live here.

Give freely. Ask kindly.

Join: https://www.sacramentobuynothing.com

Android (closed testing — free to opt in):
https://play.google.com/apps/testing/org.sacramentobuynothing.app

#TheSacramentoFree #Sacramento #GiveFreelyAskKindly #KeepItLocal
"""

README = """The Sacramento Free — newspaper ad
==================================

THIS LOOK IS FOR THIS AD ONLY.
Do not use the newsprint masthead, classifieds, or paper layout on the
other Facebook posts. Those stay on the current lifestyle brand
(photo + TheSacramentoFree green bar).

What to upload
--------------
1. newspaper-ad-feed.jpg     1080×1350 (4:5 Facebook feed) — post this
2. newspaper-ad-portrait.jpg 1080×1620 (taller front page)
3. newspaper-ad-square.jpg   1080×1080

Caption: paste from CAPTION.txt

Fictional demo neighbors / demo classifieds. Do not post live member names.

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
