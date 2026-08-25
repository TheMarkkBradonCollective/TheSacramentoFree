/**
 * Build app-icon.png (transparent pop-out) and app-icon-maskable.png (full-bleed)
 * from notification-icon.png hands on a clean Sacramento green squircle.
 *
 * Avoids flood-fill / matte inpainting that smears green into the white hands.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const handsSrc = join(root, 'public', 'notification-icon.png');
const popoutDest = join(root, 'public', 'app-icon.png');
const maskableDest = join(root, 'public', 'app-icon-maskable.png');
const logoDest = join(root, 'public', 'logo.png');
const downloadDest = join(root, 'public', 'download (6).png');

if (!existsSync(handsSrc)) {
  throw new Error(`Missing hands artwork at ${handsSrc}`);
}

const py = `
from PIL import Image, ImageDraw
import shutil

SIZE = 512
PAD = 8
RADIUS = 76
GREEN = (0, 132, 90, 255)
HANDS_SCALE = 0.92
MASKABLE_SCALE = 0.66

hands_src = ${JSON.stringify(handsSrc)}
popout_dest = ${JSON.stringify(popoutDest)}
maskable_dest = ${JSON.stringify(maskableDest)}
logo_dest = ${JSON.stringify(logoDest)}
download_dest = ${JSON.stringify(downloadDest)}

def make_popout():
    canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle([PAD, PAD, SIZE - PAD - 1, SIZE - PAD - 1], radius=RADIUS, fill=GREEN)
    notif = Image.open(hands_src).convert('RGBA')
    nw = nh = int(SIZE * HANDS_SCALE)
    notif_s = notif.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = oy = (SIZE - nw) // 2
    canvas.paste(notif_s, (ox, oy), notif_s)
    return canvas

def make_maskable(popout):
    bg = Image.new('RGBA', (SIZE, SIZE), GREEN)
    nw = nh = int(SIZE * MASKABLE_SCALE)
    icon_s = popout.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = oy = (SIZE - nw) // 2
    bg.paste(icon_s, (ox, oy), icon_s)
    return bg

popout = make_popout()
maskable = make_maskable(popout)
popout.save(popout_dest)
maskable.save(maskable_dest)
shutil.copy2(popout_dest, logo_dest)
shutil.copy2(popout_dest, download_dest)
print(f'Wrote {popout_dest}')
print(f'Wrote {maskable_dest}')
`;

execFileSync('python3', ['-c', py], { stdio: 'inherit' });
