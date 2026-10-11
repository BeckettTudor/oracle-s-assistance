# Asset list

All artwork is drawn in code (`src/art/`) at one shared pixel scale: every art pixel is a 2×2 block in the game's logical units (`ART_SCALE` in `src/placeholders.js`). The only image files the game ships with are the three character portraits.

The images you supplied (sprite sheets, texture sheets, backgrounds) remain in `assets/` as **design reference only**; the game doesn't load them.

## Portraits

`assets/portraits/hercules.png`, `zeus.png`, `oracle.png`, each 96×96, drawn 1:1. They are prepared from the supplied paintings (`… Portrait.png`) by:

```
python tools/prepare_assets.py
```

The script needs Pillow. Running it rebuilds the three portrait files from the paintings.

## Replacing drawn art

Any drawn asset can be replaced by a PNG at the listed path and size. Sizes below are logical pixels. To keep the look consistent, draw at half size and scale up 2× with nearest-neighbour.

The full list of keys, paths, sizes and frame orders is in `src/assetManifest.js`. Summary:

| Group | Files (`assets/…`) |
|---|---|
| Characters | `characters/hercules.png` (48×60 ×10), `oracle.png` (48×60 ×10), `zeus.png` (80×80 ×12) |
| Props | `environment/pot.png` (24×24 ×3), `brazier.png` (24×40 ×5: unlit + 4 flame frames), `offering.png`, `offering_pile.png`, `altar.png`, `bolt.png`, `glow.png`, `tree_olive.png`, `tree_cypress.png` |
| Tiles | `environment/ground.png`, `plaza.png`, `ledge*.png` (marble, crumbling, moving, with end caps) |
| Temple | `environment/temple_floor.png`, `temple_frieze.png`, `column_*.png`, `temple_bg.png`, `shelves.png`, `pediment.png`, `temple_base.png`, `door_seal.png` |
| Backgrounds | `background/sky.png`, `clouds.png`, `mountains.png`, `near.png` (in game); `menu_sky.png`, `menu_coast.png`, `menu_ruins.png`, `menu_temple.png`, `menu_cloud.png`, `menu_bird.png` (title/results) |
| UI | `ui/panel.png`, `dialog.png`, `button.png`, `key.png`, `frame.png`, `plaque.png`, `meander.png`, `divider.png`, `arrow.png`, `coin.png`, `sun_coin.png` |

## Audio: `assets/audio/` (optional)

Every cue already has a procedural version in `src/synth.js`, so these files are optional. A file named after its cue, with an `.ogg`, `.mp3` or `.wav` extension, replaces the procedural sound:

`jump`, `offering_pickup`, `offering_consume`, `pot_break`, `bolt_reveal`, `oracle_query`, `dialogue_advance`, `ui_click`, `checkpoint`, `coin_toss`, `ledge_crumble`, `fate_mark`, `fate_reflect`, `success`, plus looping music `music_title`, `music_hill`, `music_temple`.

## Fonts: `assets/fonts/`

Cinzel (titles, rasterised to pixel art), Pixelify Sans (text) and Jersey 10 (digits and %, plus keycap labels), all under the SIL Open Font License. In-game text uses the composite family `GameUI` defined in `index.html`: Pixelify Sans letters with Jersey 10 numerals.
