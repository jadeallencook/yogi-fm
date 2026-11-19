"""
Link-preview images (Open Graph / Twitter cards, 1200x630) for yogifm.com.

    python3 -I jobs/make-og-images.py

Writes public/og/default.jpg (home), public/og/speakers/<slug>.jpg and
public/og/music/<slug>.jpg from the content JSON, the speaker portraits, banner.jpg
and the logo. Layout.astro points og:image at them. Re-run after adding a speaker or
genre, or when lecture counts/lengths change a lot (the cards show "N lectures · X hrs").
Run `npm run fetch-durations` first so the hours are complete.

Local tool (macOS): needs Pillow and the system Helvetica Neue font. The images are
committed, so CI never runs this. See documentation/architecture.md ("Link previews").
"""
import json
import os
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ENV = os.path.join(ROOT, 'src', 'environments')
PUBLIC = os.path.join(ROOT, 'public')
OUT = os.path.join(PUBLIC, 'og')
FONT = '/System/Library/Fonts/HelveticaNeue.ttc'
BOLD, REGULAR, MEDIUM = 1, 0, 10  # face indexes in HelveticaNeue.ttc

W, H = 1200, 630
SITE_NAME = 'Yogi FM'
TAGLINE = 'Broadcasting Awareness'
WHITE = (255, 255, 255)
SOFT = (196, 196, 196)
MUTED = (150, 150, 150)
BLUE = (74, 144, 226)


def font(size, face=REGULAR):
    return ImageFont.truetype(FONT, size, index=face)


def load(name):
    with open(os.path.join(ENV, name), encoding='utf-8') as f:
        return json.load(f)


def total_length(seconds):
    """Same rules as formatTotalLength() in src/lib/data.ts."""
    mins = round(seconds / 60)
    if mins < 1:
        return ''
    if mins < 60:
        return f"{mins} min{'' if mins == 1 else 's'}"
    hrs = round(seconds / 3600)
    return f"{hrs} hr{'' if hrs == 1 else 's'}"


def count_line(videos, durations, noun):
    n = len(videos)
    words = f"{n} {noun}{'' if n == 1 else 's'}"
    total = total_length(sum(durations.get(v, 0) for v in videos))
    return f'{words}  ·  {total}' if total else words


def years(text):
    return text.replace(' ', '').replace('-', '–', 1)


def cover(img, size):
    return ImageOps.fit(img.convert('RGB'), size, Image.LANCZOS, centering=(0.5, 0.35))


def backdrop(img, darken=0.35, blur=28, gray=True):
    """Blurred, darkened copy filling the card (grayscale like the speaker header)."""
    bg = cover(img, (W, H))
    if gray:
        bg = bg.convert('L').convert('RGB')
    bg = bg.filter(ImageFilter.GaussianBlur(blur))
    return Image.blend(Image.new('RGB', (W, H), (11, 10, 10)), bg, darken)


def shade_left(card, strength=230):
    """Dark gradient from the left so text stays readable."""
    grad = Image.linear_gradient('L').rotate(90).resize((W, H))
    mask = grad.point(lambda v: int(strength * (v / 255) ** 1.4))
    card.paste(Image.new('RGB', (W, H), (11, 10, 10)), (0, 0), ImageOps.mirror(mask))
    return card


def rounded(img, radius):
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.size[0] - 1, img.size[1] - 1), radius, fill=255)
    out = img.convert('RGBA')
    out.putalpha(mask)
    return out


def logo(size):
    img = Image.open(os.path.join(PUBLIC, 'assets', 'yogi-fm-logo.png')).convert('RGBA')
    img = img.crop(img.getbbox())
    img.thumbnail((size, size), Image.LANCZOS)
    return img


def brand(card, x, y):
    """Small logo + YOGI FM label (letter-spaced, like the site's section titles)."""
    mark = logo(44)
    # The logo is dark line art; put it on a soft light disc so it shows on dark cards.
    disc = Image.new('RGBA', (56, 56), (0, 0, 0, 0))
    ImageDraw.Draw(disc).ellipse((0, 0, 55, 55), fill=(243, 233, 218, 255))
    disc.alpha_composite(mark, ((56 - mark.width) // 2, (56 - mark.height) // 2))
    card.paste(disc, (x, y), disc)
    spaced(ImageDraw.Draw(card), (x + 72, y + 16), SITE_NAME.upper(), font(24, MEDIUM), SOFT, 6)


def spaced(draw, xy, text, fnt, fill, tracking):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking
    return x


def fit_text(draw, text, max_width, sizes, face=BOLD, max_lines=2):
    """Largest size (from `sizes`) where `text` wraps into at most max_lines lines."""
    for size in sizes:
        fnt = font(size, face)
        lines, line = [], ''
        for word in text.split():
            trial = f'{line} {word}'.strip()
            if draw.textlength(trial, font=fnt) <= max_width or not line:
                line = trial
            else:
                lines.append(line)
                line = word
        lines.append(line)
        if len(lines) <= max_lines and all(draw.textlength(l, font=fnt) <= max_width for l in lines):
            return fnt, lines
    fnt = font(sizes[-1], face)
    return fnt, lines[:max_lines]


def save(card, *path):
    dest = os.path.join(OUT, *path)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    card.convert('RGB').save(dest, 'JPEG', quality=86, optimize=True, progressive=True)
    return dest


def speaker_card(slug, speaker, durations):
    src = Image.open(os.path.join(PUBLIC, speaker['image']))
    card = shade_left(backdrop(src), 200)
    # Portrait, 4:5, rounded, on the right.
    pw, ph = 400, 500
    portrait = rounded(cover(src, (pw, ph)).convert('L').convert('RGB'), 24)
    shadow = Image.new('RGBA', (pw + 80, ph + 80), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((40, 48, pw + 40, ph + 48), 24, fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    px, py = W - pw - 70, (H - ph) // 2
    card.paste(shadow, (px - 40, py - 40), shadow)
    card.paste(portrait, (px, py), portrait)

    draw = ImageDraw.Draw(card)
    left, text_w = 70, px - 70 - 50
    brand(card, left, 64)
    fnt, lines = fit_text(draw, speaker['name'], text_w, [96, 88, 80, 72, 64, 56])
    line_h = int(fnt.size * 1.08)
    block = line_h * len(lines) + 24 + 40 + 14 + 34
    y = (H - block) // 2 + 30
    for line in lines:
        draw.text((left, y), line, font=fnt, fill=WHITE)
        y += line_h
    y += 24
    draw.text((left, y), years(speaker['years']), font=font(36), fill=SOFT)
    y += 40 + 14
    draw.text((left, y), count_line(speaker['videos'], durations, 'lecture'), font=font(30), fill=MUTED)
    # Bottom: what the site is.
    draw.text((left, H - 64 - 26), 'Free lectures with background music', font=font(26), fill=MUTED)
    return save(card, 'speakers', f'{slug}.jpg')


def genre_card(slug, genre, durations):
    src = Image.open(os.path.join(PUBLIC, 'assets', 'images', 'banner.jpg'))
    card = shade_left(backdrop(src, 0.6, 10, gray=False), 235)
    draw = ImageDraw.Draw(card)
    left = 70
    brand(card, left, 64)
    spaced(draw, (left, 220), 'MUSIC', font(26, MEDIUM), BLUE, 8)
    fnt, lines = fit_text(draw, genre['name'], W - 2 * left, [120, 104, 96], max_lines=1)
    draw.text((left, 262), lines[0], font=fnt, fill=WHITE)
    draw.text((left, 262 + int(fnt.size * 1.15) + 10), count_line(genre['videos'], durations, 'track'), font=font(32), fill=SOFT)
    draw.text((left, H - 64 - 26), 'Background music for lectures', font=font(26), fill=MUTED)
    return save(card, 'music', f'{slug}.jpg')


def default_card(speakers):
    src = Image.open(os.path.join(PUBLIC, 'assets', 'images', 'banner.jpg'))
    card = cover(src, (W, H))
    # Darken toward the middle so the centered text reads (like the banner's glow).
    glow = Image.radial_gradient('L').resize((W, H)).point(lambda v: int(190 * (1 - v / 255) ** 0.8 + 40))
    card.paste(Image.new('RGB', (W, H), (11, 10, 10)), (0, 0), glow)
    draw = ImageDraw.Draw(card)

    mark = logo(150)
    disc = Image.new('RGBA', (184, 184), (0, 0, 0, 0))
    ImageDraw.Draw(disc).ellipse((0, 0, 183, 183), fill=(243, 233, 218, 255))
    disc.alpha_composite(mark, ((184 - mark.width) // 2, (184 - mark.height) // 2))
    card.paste(disc, ((W - 184) // 2, 92), disc)

    def centered(y, text, fnt, fill):
        draw.text(((W - draw.textlength(text, font=fnt)) / 2, y), text, font=fnt, fill=fill)

    centered(300, SITE_NAME, font(104, BOLD), WHITE)
    tag = TAGLINE.upper()
    tf = font(26, MEDIUM)
    tw = sum(draw.textlength(c, font=tf) + 8 for c in tag) - 8
    spaced(draw, ((W - tw) / 2, 420), tag, tf, SOFT, 8)
    names = ['Alan Watts', 'Ram Dass', 'Krishnamurti']
    centered(486, f"{'  ·  '.join(names)}  &  {len(speakers) - len(names)} more", font(32), WHITE)
    return save(card, 'default.jpg')


def main():
    speakers = load('speakers.environment.json')
    music = load('music.environment.json')
    durations = load('durations.environment.json')
    made = [default_card(speakers)]
    for slug, speaker in speakers.items():
        if not speaker.get('image'):
            print(f'skip {slug}: no portrait (its pages use the default card)', file=sys.stderr)
            continue
        made.append(speaker_card(slug, speaker, durations))
    for slug, genre in music.items():
        made.append(genre_card(slug, genre, durations))
    # Remove cards for speakers/genres that no longer exist.
    keep = set(made)
    for sub in ('speakers', 'music'):
        folder = os.path.join(OUT, sub)
        for name in os.listdir(folder):
            if os.path.join(folder, name) not in keep:
                os.remove(os.path.join(folder, name))
    size = sum(os.path.getsize(p) for p in made)
    print(f'Wrote {len(made)} images to public/og/ ({size // 1024} KB).')


if __name__ == '__main__':
    main()
