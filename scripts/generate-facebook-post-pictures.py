#!/usr/bin/env python3
"""Compose ready-to-post Facebook pictures for TheSacramentoFree.

Lifestyle photos get a bottom caption bar + app icon.
Newsprint plates get the real lockup, rules, and serif type.
Outputs 1080×1350 (4:5 feed) and 1080×1080 (square).

  python3 scripts/generate-facebook-post-pictures.py
"""
from __future__ import annotations

import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
STILLS = ROOT / "facebook-promo-assets" / "stills-today"
OUT = ROOT / "facebook-promo-assets" / "posts"
PUBLIC = ROOT / "public" / "downloads" / "facebook-posts"
ZIP_PATH = ROOT / "public" / "downloads" / "facebook-posts.zip"
LOCKUP = ROOT / "public" / "TheSacramentoFree.png"
APP_ICON = ROOT / "play-store-assets" / "icon-512.png"
FONTS = ROOT / "facebook-promo-assets" / "fonts"

CREAM = (246, 243, 234)
INK = (11, 11, 12)
MUTED = (82, 82, 91)
GREEN = (0, 132, 90)
WHITE = (255, 255, 255)
RULE = (28, 28, 30)

INTER_BOLD = "/usr/share/fonts/truetype/macos/Inter-Bold.ttf"
INTER_SEMI = "/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf"
INTER_MED = "/usr/share/fonts/truetype/macos/Inter-Medium.ttf"
SERIF_REG = str(FONTS / "LibreBaskerville.ttf")
SERIF_ITA = str(FONTS / "LibreBaskerville-Italic.ttf")
SERIF_FALLBACK_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SERIF_FALLBACK = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"

PORTRAIT = (1080, 1350)
SQUARE = (1080, 1080)

JOIN_URL = "sacramentobuynothing.com"
BRAND = "TheSacramentoFree"

HASHTAGS = (
    "#TheSacramentoFree #Sacramento #SacramentoFree #SacramentoCommunity "
    "#NeighborsHelpingNeighbors #BuyNothing #GiveFreelyAskKindly #KeepItLocal #fyp "
    "#SacramentoCA #SacTown #916 #SacramentoNeighbors #SacCommunity "
    "#FreeInSacramento #SacramentoLocal #SacLife #MidtownSac #EastSac "
    "#LandPark #TahoePark #OakPark #Natomas #GreaterSacramento"
)


def font(path: str, size: int, weight: int | None = None) -> ImageFont.FreeTypeFont:
    try:
        f = ImageFont.truetype(path, size)
    except OSError:
        f = ImageFont.truetype(SERIF_FALLBACK if "Libre" in path else INTER_BOLD, size)
    if weight is not None and hasattr(f, "set_variation_by_axes"):
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
    return f


def cover_crop(im: Image.Image, size: tuple[int, int], focus: float = 0.42) -> Image.Image:
    w, h = size
    im = im.convert("RGB")
    src_ratio = im.width / im.height
    dst_ratio = w / h
    if src_ratio > dst_ratio:
        new_h = h
        new_w = int(im.width * h / im.height)
        im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
        x = (new_w - w) // 2
        return im.crop((x, 0, x + w, h))
    new_w = w
    new_h = int(im.height * w / im.width)
    im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
    y = int(max(0, (new_h - h) * focus))
    y = min(y, new_h - h)
    return im.crop((0, y, w, y + h))


def rounded(im: Image.Image, radius: int) -> Image.Image:
    im = im.convert("RGBA")
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *im.size), radius=radius, fill=255)
    im.putalpha(mask)
    return im


def gradient_scrim(width: int, height: int, top_alpha: int = 0, bot_alpha: int = 228) -> Image.Image:
    band = Image.new("L", (1, height))
    pix = band.load()
    for y in range(height):
        t = (y / max(1, height - 1)) ** 1.65
        pix[0, y] = int(top_alpha + (bot_alpha - top_alpha) * t)
    alpha = band.resize((width, height), Image.Resampling.BILINEAR)
    overlay = Image.new("RGBA", (width, height), (8, 10, 10, 0))
    overlay.putalpha(alpha)
    return overlay


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
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


def draw_centered(
    draw: ImageDraw.ImageDraw,
    lines: list[str],
    font_obj: ImageFont.FreeTypeFont,
    cx: int,
    y: int,
    fill,
    stroke_width: int = 0,
    stroke_fill=None,
    gap: int = 8,
) -> int:
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font_obj, stroke_width=stroke_width)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        x = cx - w // 2
        draw.text(
            (x, y),
            line,
            font=font_obj,
            fill=fill,
            stroke_width=stroke_width,
            stroke_fill=stroke_fill,
        )
        y += h + gap
    return y


def load_lockup(width: int) -> Image.Image:
    im = Image.open(LOCKUP).convert("RGB")
    # Trim a little of the outer cream so the mark sits tighter in layouts.
    w, h = im.size
    trim = int(w * 0.04)
    im = im.crop((trim, trim, w - trim, h - trim))
    scale = width / im.width
    return im.resize((width, int(im.height * scale)), Image.Resampling.LANCZOS)


def load_icon(size: int) -> Image.Image:
    im = Image.open(APP_ICON).convert("RGBA")
    im = im.resize((size, size), Image.Resampling.LANCZOS)
    return rounded(im, radius=int(size * 0.22))


def save_pair(im_p: Image.Image, im_s: Image.Image, slug: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    p_path = OUT / f"{slug}-portrait.jpg"
    s_path = OUT / f"{slug}-square.jpg"
    opts = dict(format="JPEG", quality=92, optimize=True, subsampling=1)
    im_p.convert("RGB").save(p_path, **opts)
    im_s.convert("RGB").save(s_path, **opts)
    print(f"wrote {p_path.name}  {s_path.name}")


def photo_post(
    src: Path,
    title: str,
    sub: str,
    focus: float = 0.38,
    kicker: str = BRAND,
) -> tuple[Image.Image, Image.Image]:
    def compose(size: tuple[int, int]) -> Image.Image:
        w, h = size
        base = cover_crop(Image.open(src), size, focus=focus).convert("RGBA")
        scrim_h = int(h * 0.42)
        scrim = gradient_scrim(w, scrim_h, 0, 236)
        base.alpha_composite(scrim, (0, h - scrim_h))
        draw = ImageDraw.Draw(base)

        icon = load_icon(int(w * 0.072))
        margin = int(w * 0.055)
        base.alpha_composite(icon, (margin, margin))
        kicker_font = font(INTER_SEMI, int(w * 0.028))
        draw.text(
            (margin + icon.width + 14, margin + icon.height // 2),
            kicker,
            font=kicker_font,
            fill=WHITE,
            anchor="lm",
            stroke_width=2,
            stroke_fill=(0, 0, 0, 120),
        )

        bar_w, bar_h = int(w * 0.078), int(h * 0.006)
        title_font = font(INTER_BOLD, int(w * 0.052 if size == PORTRAIT else w * 0.048))
        sub_font = font(INTER_MED, int(w * 0.032))
        url_font = font(INTER_SEMI, int(w * 0.026))
        max_tw = int(w * 0.88)
        title_lines = wrap_text(draw, title, title_font, max_tw)
        sub_lines = wrap_text(draw, sub, sub_font, max_tw)

        # Measure block so it sits in the lower third.
        def block_h() -> int:
            th = sum(draw.textbbox((0, 0), ln, font=title_font, stroke_width=3)[3]
                     - draw.textbbox((0, 0), ln, font=title_font, stroke_width=3)[1]
                     + 10 for ln in title_lines)
            sh = sum(draw.textbbox((0, 0), ln, font=sub_font, stroke_width=2)[3]
                     - draw.textbbox((0, 0), ln, font=sub_font, stroke_width=2)[1]
                     + 6 for ln in sub_lines)
            return bar_h + 22 + th + 8 + sh + 28 + 28

        y = h - int(w * 0.055) - block_h()
        x0 = (w - bar_w) // 2
        draw.rounded_rectangle((x0, y, x0 + bar_w, y + bar_h), radius=3, fill=GREEN)
        y += bar_h + 22
        y = draw_centered(
            draw, title_lines, title_font, w // 2, y, WHITE, stroke_width=3, stroke_fill=(0, 0, 0, 140), gap=10
        )
        y += 6
        y = draw_centered(
            draw, sub_lines, sub_font, w // 2, y, (233, 231, 224), stroke_width=2, stroke_fill=(0, 0, 0, 130), gap=6
        )
        y += 18
        draw_centered(draw, [JOIN_URL], url_font, w // 2, y, (210, 232, 220), stroke_width=2, stroke_fill=(0, 0, 0, 120))
        return base

    return compose(PORTRAIT), compose(SQUARE)


def newsprint_post(
    src: Path | None,
    title: str,
    sub: str,
    show_lockup: bool = True,
) -> tuple[Image.Image, Image.Image]:
    def compose(size: tuple[int, int]) -> Image.Image:
        w, h = size
        canvas = Image.new("RGB", size, CREAM)
        noise = Image.effect_noise(size, 12).convert("L")
        grain = Image.merge("RGB", (noise, noise, noise))
        canvas = Image.blend(canvas, grain, 0.07)
        draw = ImageDraw.Draw(canvas)
        pad = int(w * 0.078)

        title_font_bold = font(SERIF_FALLBACK_BOLD, int(w * (0.052 if size == PORTRAIT else 0.048)))
        sub_font = font(SERIF_ITA, int(w * 0.030), weight=400)
        url_font = font(INTER_SEMI, int(w * 0.026))
        max_tw = w - pad * 2
        title_lines = wrap_text(draw, title, title_font_bold, max_tw)
        sub_lines = wrap_text(draw, sub, sub_font, max_tw)

        def text_block_h() -> int:
            th = sum(
                draw.textbbox((0, 0), ln, font=title_font_bold)[3]
                - draw.textbbox((0, 0), ln, font=title_font_bold)[1]
                + 8
                for ln in title_lines
            )
            sh = sum(
                draw.textbbox((0, 0), ln, font=sub_font)[3]
                - draw.textbbox((0, 0), ln, font=sub_font)[1]
                + 6
                for ln in sub_lines
            )
            return th + 10 + sh

        footer_h = int(h * 0.072)
        type_h = text_block_h()
        type_top = h - footer_h - type_h - int(h * 0.04)
        header_bottom = int(h * 0.028)

        if show_lockup:
            lock_w = int(w * 0.26)
            lock = load_lockup(lock_w)
            canvas.paste(lock, ((w - lock.width) // 2, header_bottom))
            header_bottom += lock.height + int(h * 0.012)

        def rule(yy: int, thick: int = 2) -> None:
            draw.rectangle((pad, yy, w - pad, yy + thick), fill=RULE)

        rule(header_bottom, 2)
        header_bottom += 7
        rule(header_bottom, 1)
        header_bottom += int(h * 0.016)

        if src is not None:
            max_h = max(80, type_top - header_bottom - int(h * 0.03))
            max_w = w - pad * 2
            illo = ImageOps.contain(Image.open(src).convert("RGB"), (max_w, max_h), Image.Resampling.LANCZOS)
            frame = Image.new("RGB", (illo.width + 16, illo.height + 16), CREAM)
            ImageDraw.Draw(frame).rectangle((0, 0, frame.width - 1, frame.height - 1), outline=RULE, width=2)
            frame.paste(illo, (8, 8))
            canvas.paste(frame, ((w - frame.width) // 2, header_bottom + max(0, (max_h - frame.height) // 2)))

        rule(type_top - int(h * 0.018), 1)
        y = type_top
        y = draw_centered(draw, title_lines, title_font_bold, w // 2, y, INK, gap=8)
        y += 8
        y = draw_centered(draw, sub_lines, sub_font, w // 2, y, MUTED, gap=6)
        rule(h - footer_h + 4, 1)
        url_y = h - footer_h + int(h * 0.022)
        draw_centered(draw, [JOIN_URL], url_font, w // 2, url_y, GREEN)
        return canvas

    return compose(PORTRAIT), compose(SQUARE)


def lockup_hero() -> tuple[Image.Image, Image.Image]:
    def compose(size: tuple[int, int]) -> Image.Image:
        w, h = size
        canvas = Image.new("RGB", size, CREAM)
        noise = Image.effect_noise(size, 10).convert("L")
        grain = Image.merge("RGB", (noise, noise, noise))
        canvas = Image.blend(canvas, grain, 0.06)
        draw = ImageDraw.Draw(canvas)
        pad = int(w * 0.08)
        line_font = font(SERIF_FALLBACK_BOLD, int(w * 0.038))
        sub_font = font(SERIF_ITA, int(w * 0.030))
        url_font = font(INTER_SEMI, int(w * 0.028))
        headline = wrap_text(draw, "Free giveaways from Sacramento neighbors.", line_font, w - pad * 2)
        sub = ["No selling. No bidding. No flipping."]
        footer_h = int(h * 0.08)
        type_h = 90
        type_top = h - footer_h - type_h
        lock_max = type_top - int(h * 0.06) - 16
        lock_w = min(int(w * (0.62 if size == SQUARE else 0.70)), lock_max)
        lock = load_lockup(lock_w)
        if lock.height > lock_max:
            scale = lock_max / lock.height
            lock = lock.resize((int(lock.width * scale), lock_max), Image.Resampling.LANCZOS)
        y = int((type_top - 16 - lock.height) / 2)
        canvas.paste(lock, ((w - lock.width) // 2, max(int(h * 0.03), y)))
        draw.rectangle((pad, type_top - 12, w - pad, type_top - 10), fill=RULE)
        y = type_top
        y = draw_centered(draw, headline, line_font, w // 2, y, INK, gap=8)
        y += 10
        y = draw_centered(draw, sub, sub_font, w // 2, y, MUTED)
        draw.rectangle((pad, h - footer_h + 4, w - pad, h - footer_h + 5), fill=RULE)
        draw_centered(draw, [JOIN_URL], url_font, w // 2, h - footer_h + int(h * 0.022), GREEN)
        return canvas

    return compose(PORTRAIT), compose(SQUARE)


def values_card() -> tuple[Image.Image, Image.Image]:
    lines = [
        "No selling.",
        "No bidding.",
        "No flipping.",
        "No ads.",
    ]
    closer = "Just neighbors helping neighbors."

    def compose(size: tuple[int, int]) -> Image.Image:
        w, h = size
        canvas = Image.new("RGB", size, CREAM)
        noise = Image.effect_noise(size, 10).convert("L")
        canvas = Image.blend(canvas, Image.merge("RGB", (noise, noise, noise)), 0.06)
        draw = ImageDraw.Draw(canvas)
        pad = int(w * 0.1)
        lock = load_lockup(int(w * (0.28 if size == SQUARE else 0.32)))
        y = int(h * 0.04)
        canvas.paste(lock, ((w - lock.width) // 2, y))
        y += lock.height + int(h * 0.016)
        draw.rectangle((pad, y, w - pad, y + 2), fill=RULE)
        y += int(h * 0.03)
        item_font = font(SERIF_FALLBACK_BOLD, int(w * (0.052 if size == SQUARE else 0.058)))
        for line in lines:
            y = draw_centered(draw, [line], item_font, w // 2, y, INK, gap=0)
            y += int(h * 0.012)
        y += int(h * 0.01)
        draw.rectangle((pad, y, w - pad, y + 1), fill=RULE)
        y += int(h * 0.03)
        closer_font = font(SERIF_ITA, int(w * 0.034))
        url_font = font(INTER_SEMI, int(w * 0.028))
        y = draw_centered(draw, wrap_text(draw, closer, closer_font, w - pad * 2), closer_font, w // 2, y, MUTED)
        y += int(h * 0.03)
        draw_centered(draw, [JOIN_URL], url_font, w // 2, y, GREEN)
        return canvas

    return compose(PORTRAIT), compose(SQUARE)


POSTS = [
    {
        "slug": "01-dont-throw-it-away",
        "kind": "photo",
        "src": "promo_closet_overflow.png",
        "title": "Don't throw it away.",
        "sub": "A neighbor needs exactly that.",
        "focus": 0.45,
        "caption": """That closet is full of stuff you don't use.

Don't dump it. Post it free on Sacramento Free — a neighbor will take it off your hands.

No selling. No bidding. No flipping. No ads.

Give. Find. Reuse.
100% free. Keep it local.

TheSacramentoFree — Give freely. Ask kindly.

Join: https://www.sacramentobuynothing.com

Android (closed testing — free to opt in):
https://play.google.com/apps/testing/org.sacramentobuynothing.app""",
    },
    {
        "slug": "02-post-it-in-a-minute",
        "kind": "photo",
        "src": "promo_bike_listing.png",
        "title": "Post it in a minute.",
        "sub": "Free. No selling. No bidding.",
        "focus": 0.55,
        "caption": """The bike the kids outgrew doesn't have to sit on the porch forever.

Snap a photo. Post it free. A Sacramento neighbor can use it this week.

TheSacramentoFree — Give freely. Ask kindly.

https://www.sacramentobuynothing.com

#TheSacramentoFree #Sacramento #KeepItLocal #GiveFreelyAskKindly""",
    },
    {
        "slug": "03-neighbors-helping-neighbors",
        "kind": "photo",
        "src": "promo_kitchen_handoff.png",
        "title": "Neighbors helping neighbors.",
        "sub": "Give what you don't need.",
        "focus": 0.32,
        "caption": """Toaster. Pans. Extra plates.

If you're not using it, someone on your street probably is.

Post it free on Sacramento Free. Porch pickup. That's the whole trade.

Give freely. Ask kindly.
https://www.sacramentobuynothing.com

#TheSacramentoFree #Sacramento #GiveFreelyAskKindly""",
    },
    {
        "slug": "04-she-takes-it-home",
        "kind": "photo",
        "src": "promo_walking_home.png",
        "title": "She takes it home.",
        "sub": "That's the whole trade.",
        "focus": 0.35,
        "caption": """A plant. A lamp. A walk home.

That's Sacramento Free — neighbors giving good stuff a second life instead of the landfill.

100% free. Keep it local.

Join: https://www.sacramentobuynothing.com

#TheSacramentoFree #KeepItLocal #Sacramento""",
    },
    {
        "slug": "05-keep-it-local",
        "kind": "photo",
        "src": "promo_park_table.png",
        "title": "Keep it local.",
        "sub": "Free stuff from Sacramento neighbors.",
        "focus": 0.48,
        "caption": """Free stuff from people who live here — not a warehouse, not a store.

Sacramento Free is the neighborhood giveaway, on your phone.

Give. Find. Reuse.
https://www.sacramentobuynothing.com

#TheSacramentoFree #Sacramento #KeepItLocal""",
    },
    {
        "slug": "06-someone-can-use-that",
        "kind": "photo",
        "src": "promo_garage_tools.png",
        "title": "Someone can use that.",
        "sub": "Don't let it sit in the garage.",
        "focus": 0.40,
        "caption": """Extra drill. Extra saw. Extra screws.

If it still works, a neighbor can use it. Post it free.

No haggling. No ads. Just the handoff.

TheSacramentoFree — Give freely. Ask kindly.
https://www.sacramentobuynothing.com

#TheSacramentoFree #Sacramento #GiveFreelyAskKindly""",
    },
    {
        "slug": "07-ask-kindly",
        "kind": "photo",
        "src": "promo_stroller_give.png",
        "title": "Ask kindly.",
        "sub": "Give freely.",
        "focus": 0.30,
        "caption": """The stroller your kid outgrew is the stroller another family needs this month.

Give freely. Ask kindly. Keep it in Sacramento.

Join: https://www.sacramentobuynothing.com

#TheSacramentoFree #GiveFreelyAskKindly #Sacramento""",
    },
    {
        "slug": "08-same-day-same-neighborhood",
        "kind": "photo",
        "src": "promo_porch_chat.png",
        "title": "Same day. Same neighborhood.",
        "sub": "Sort it out in the app.",
        "focus": 0.35,
        "caption": """See it. Message. Grab it off the porch.

Sacramento Free keeps the handoff between neighbors — no selling, no bidding, no flipping.

https://www.sacramentobuynothing.com

#TheSacramentoFree #Sacramento #KeepItLocal""",
    },
    {
        "slug": "09-give-freely-ask-kindly",
        "kind": "newsprint",
        "src": "newsprint_plant_give.png",
        "title": "A second life for what you don't need.",
        "sub": "Posted free. Picked up by a neighbor.",
        "caption": """Give freely. Ask kindly.

That's the whole idea. Sacramento neighbors posting what they don't need, and asking for what they do — 100% free.

TheSacramentoFree
https://www.sacramentobuynothing.com

#TheSacramentoFree #GiveFreelyAskKindly #Sacramento""",
    },
    {
        "slug": "10-leave-it-on-the-porch",
        "kind": "newsprint",
        "src": "newsprint_porch_box.png",
        "title": "Leave it on the porch.",
        "sub": "They'll grab it when they can.",
        "caption": """Porch pickup. Box by the door. Lamp on the step.

That's how Sacramento Free works — post it, a neighbor sees it, they take it home.

No selling. No bidding. No flipping.

https://www.sacramentobuynothing.com

#TheSacramentoFree #Sacramento #KeepItLocal""",
    },
    {
        "slug": "11-sacramento-free",
        "kind": "newsprint",
        "src": "newsprint_tower_bridge.png",
        "title": "100% free. Keep it local.",
        "sub": "Giveaways from Sacramento neighbors.",
        "caption": """Built for Sacramento. Kept local.

Give away what you don't need. Find something useful. Keep good stuff out of the landfill.

TheSacramentoFree — Give freely. Ask kindly.
https://www.sacramentobuynothing.com

#TheSacramentoFree #Sacramento #KeepItLocal""",
    },
    {
        "slug": "12-no-selling-no-bidding",
        "kind": "newsprint",
        "src": "newsprint_clothes_hands.png",
        "title": "No selling. No bidding. No flipping.",
        "sub": "Just neighbors helping neighbors.",
        "caption": """Not Marketplace. Not an auction. Not a side hustle.

If you post it on Sacramento Free, it's free. That's the rule.

Give freely. Ask kindly.
https://www.sacramentobuynothing.com

#TheSacramentoFree #GiveFreelyAskKindly #Sacramento""",
    },
    {
        "slug": "13-give-find-reuse",
        "kind": "newsprint",
        "src": "newsprint_still_life.png",
        "title": "Give. Find. Reuse.",
        "sub": "The lamp, the plant, the extra plates.",
        "caption": """Give. Find. Reuse.

The extra lamp. The houseplant. The plates you never use. Someone on your street wants them.

Post it free: https://www.sacramentobuynothing.com

#TheSacramentoFree #GiveFindReuse #Sacramento""",
    },
    {
        "slug": "14-brand-lockup",
        "kind": "lockup",
        "title": "TheSacramentoFree",
        "sub": "Give freely. Ask kindly.",
        "caption": """TheSacramentoFree — Give freely. Ask kindly.

Free local gifting in Sacramento. No selling, no bidding, no flipping.

Join: https://www.sacramentobuynothing.com

Android (closed testing — free to opt in):
https://play.google.com/apps/testing/org.sacramentobuynothing.app

#TheSacramentoFree #GiveFreelyAskKindly #Sacramento""",
    },
    {
        "slug": "15-just-neighbors",
        "kind": "values",
        "title": "No selling. No bidding. No flipping.",
        "sub": "Just neighbors helping neighbors.",
        "caption": """No selling.
No bidding.
No flipping.
No ads.

Just neighbors helping neighbors.

TheSacramentoFree
https://www.sacramentobuynothing.com

#TheSacramentoFree #GiveFreelyAskKindly #KeepItLocal""",
    },
]


README = """The Sacramento Free — Facebook posts for today
==============================================

Fictional neighbors / demo scenes only. Do not post live member names or photos.

What to upload
--------------
Use the *-portrait.jpg files (1080×1350, 4:5). They take more space in the Facebook
feed. Use *-square.jpg if you want a 1:1 post.

Post 3–5 today. Save the rest for later this week so the page does not repeat.

Pair each picture with the matching caption in POST-TODAY.txt.

Suggested order today
---------------------
1. 01-dont-throw-it-away-portrait.jpg
2. 03-neighbors-helping-neighbors-portrait.jpg
3. 14-brand-lockup-square.jpg   (or portrait)
4. 07-ask-kindly-portrait.jpg
5. 11-sacramento-free-portrait.jpg

Join link: https://www.sacramentobuynothing.com
Android closed testing: https://play.google.com/apps/testing/org.sacramentobuynothing.app

Regenerate
----------
python3 scripts/generate-facebook-post-pictures.py
"""


def with_tags(caption: str) -> str:
    lines = caption.rstrip().splitlines()
    while lines and (not lines[-1].strip() or lines[-1].lstrip().startswith("#")):
        lines.pop()
    return "\n".join(lines) + "\n\n" + HASHTAGS


def write_captions() -> None:
    blocks = [
        "The Sacramento Free — Facebook captions for today's posts",
        "========================================================",
        "Paste the caption that matches the picture filename.",
        "Prefer the 4:5 portrait file. Square is optional.",
        "",
    ]
    for i, post in enumerate(POSTS, 1):
        blocks.append(f"POST {i} — {post['slug']}")
        blocks.append(f"Image: {post['slug']}-portrait.jpg")
        blocks.append(f"Square: {post['slug']}-square.jpg")
        blocks.append("-" * 40)
        blocks.append(with_tags(post["caption"]).strip())
        blocks.append("")
        blocks.append("")
    text = "\n".join(blocks).rstrip() + "\n"
    (OUT / "POST-TODAY.txt").write_text(text)
    (OUT / "README.txt").write_text(README)


def pack_zip() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    ZIP_PATH.parent.mkdir(parents=True, exist_ok=True)
    for old in PUBLIC.glob("*"):
        if old.is_file():
            old.unlink()
    names = []
    for path in sorted(OUT.glob("*.jpg")) + [OUT / "POST-TODAY.txt", OUT / "README.txt"]:
        dest = PUBLIC / path.name
        dest.write_bytes(path.read_bytes())
        names.append(path)
    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in names:
            zf.write(path, arcname=path.name)
    print(f"packed {ZIP_PATH} ({ZIP_PATH.stat().st_size // 1024} KB)")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for post in POSTS:
        kind = post["kind"]
        if kind == "photo":
            p, s = photo_post(STILLS / post["src"], post["title"], post["sub"], focus=post.get("focus", 0.4))
        elif kind == "newsprint":
            p, s = newsprint_post(STILLS / post["src"], post["title"], post["sub"])
        elif kind == "lockup":
            p, s = lockup_hero()
        elif kind == "values":
            p, s = values_card()
        else:
            raise SystemExit(f"unknown kind {kind}")
        save_pair(p, s, post["slug"])
    write_captions()
    pack_zip()


if __name__ == "__main__":
    main()
