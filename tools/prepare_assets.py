"""Prepare the character portraits from the supplied portrait paintings.

Run from the project root:   python tools/prepare_assets.py

All other artwork is drawn in code (src/art/); the source images in assets/
serve only as design reference. This script crops each portrait inside its
painted frame, downsamples it to 96x96 and reduces its palette so it reads as
crisp pixel art. Source files are never modified. Needs Pillow.
"""

from PIL import Image

ASSETS = "C:/Users/becke/Desktop/Oracle's Assistance/assets/"
PORTRAITS = {
    'portraits/Hecules Portrait.png': 'portraits/hercules.png',
    'portraits/Zeus Portrait.png': 'portraits/zeus.png',
    'portraits/Oracle Portrait.png': 'portraits/oracle.png',
}

if __name__ == '__main__':
    for src, dst in PORTRAITS.items():
        img = Image.open(ASSETS + src).convert('RGBA').crop((96, 96, 1158, 1158))
        small = img.convert('RGBa').resize((96, 96), Image.Resampling.BOX).convert('RGB')
        out = small.quantize(colors=56, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
        out.save(ASSETS + dst)
        print('wrote', dst, out.size)
