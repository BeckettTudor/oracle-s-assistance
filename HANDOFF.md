# Handoff notes (session of 2026-10-10)

Working notes for picking the project up in a new Claude Code session. Not part of the game.

## Project in one paragraph

"Oracle's Assistance" is a Phaser 3.90 (local `lib/phaser.min.js`), ES-module 2D platformer that teaches Grover's algorithm, built for Qollab's "Quantum Unlocked" hackathon from `Oracles_Assistance_Spec_Rev2.pdf`.

- **Serving:** run `python serve.py` in the project root (no-cache headers, port 8123), then open `http://localhost:8123/`. Plain `python -m http.server` let Chrome mix stale and new modules, so the game failed to start (2026-10-11).
- **Art:** everything is drawn procedurally in `src/art/` (generators.js, uiArt.js, menuArt.js). Art is drawn at one pixel scale and upscaled ×2 (`ART_SCALE` in `src/placeholders.js`).
- **Image files:** the only ones loaded are the three portraits in `assets/portraits/`. The user's own textures in `assets/` are design reference only.
- **Fonts:**
  - Titles use Cinzel, rasterised to pixel art by `src/ui/pixelText.js`.
  - All other text uses the composite font "GameUI": Pixelify Sans letters plus Jersey 10 digits and `%`.

## Standing rules from the user (always follow)

- **DO NOT CHANGE THE PORTRAITS.**
- Never keep an asset or design just because it exists. If something can be made better and the user hasn't said to keep it, replace it.
- Use the user's supplied textures only as inspiration, never directly.
- Style: consistent, fairly chunky 16-bit Greek pixel art, with a lapis-and-gold Apollo theme.

## The latest request (complete)

> "Remove the subtext on the title screen about 'tale of hercules'. Fix spacing a bit to make more legible. Change the font's numbers so they can be read easier. Make it so platforms can't spawn near the offering table so they don't overlap weirdly. Title screen also has floating trees, fix that. Make sure all centering and spacing is perfect."

### Done and visually verified

1. **Subtitle removed.**
   - Deleted the `outlined(... TEXT.subtitle ...)` line in `src/scenes/TitleScene.js` and the `subtitle:` entry in `src/dialogue.js`.
   - The title is now `pixelTitle(this, cx, 72, TEXT.title, 56, 'gold')`. The header comment no longer mentions lyres.
2. **Title vertical rhythm rebalanced** (in TitleScene.js):

   | Element | New value |
   |---|---|
   | `buildBackdrop` templeY | 260 |
   | Play button and its glow | y 434 |
   | Controls bar container and plate | y 488 |
   | Footer | `anchorY(1, -7)` |

3. **Readable digits.**
   - `index.html` defines the GameUI composite font.
   - **Gotcha:** faces in one family are matched last-declared first. The full-range Pixelify face must be declared first and the Jersey 10 face (`unicode-range: U+0030-0039, U+0025; size-adjust: 122%`) last. The order was wrong at first, so the digits were still Pixelify (5 looked like S).
   - `src/config.js` FONTS.ui/body/mono = `'GameUI, "Pixelify Sans", ...'`.
   - `src/main.js` preloads `20px GameUI` and `bold 20px GameUI`.
   - `assets/fonts/Jersey10-Regular.ttf` and `OFL-Jersey10.txt` were added.
4. **Platforms kept clear of the offering shrine.**
   - `src/level.js` has `SHRINE_CLEARANCE = { x0: 340, x1: 620, height: 170 }` and `overlapsShrine(p)`, which handles hmove and vmove extents.
   - `generateClimb` retries up to 400 times and rejects courses that overlap the shrine.
   - Tested: 0 violations in 3000 seeds.
5. **Title foreground no longer floats.** `menuRuins` in `src/art/menuArt.js` was rewritten around a terrain function `ground(x)`: banks rise 88 px over 120 px at each edge, plus a small bump. Boulders, the fallen column, broken columns, the olive tree, cypresses, bushes and flowers are all placed with `onGround(x)`.
6. **Legibility spacing.**

   | File | Change |
   |---|---|
   | `src/ui/widgets.js` `text()` | `letterSpacing: 1` by default |
   | `src/ui/Tutorial.js` | body lineSpacing 2 → 6; footnote lineSpacing 4 |
   | `src/ui/OraclePanel.js` | body lineSpacing 1 → 5; footnote lineSpacing 4 |
   | `src/scenes/ResultsScene.js` | quantum paragraph 14 px → 15 px, lineSpacing 5 |

7. **Overflow from the wider text fixed.**
   - **HUD** (`src/scenes/UIScene.js` `updateHud`): the frame now widens to fit the longest visible label (`max(HUD_W, ceil((44+widest+18)/8)*8)`). The HUD sits at `anchorY(0, 13)` so its top lines up with the Options button.
   - **Pot grid hint** (`src/ui/PotGrid.js`): `info` text is now 17 px, wraps at `pw - 64` with lineSpacing 4, and sits at `gridTop + CELL*8 + 16`.

### Finished on 2026-10-11 (all verified by screenshots and tests)

- **Wrapping bug fixed at the root.** Phaser's word wrap ignores `letterSpacing`, so all wrapped text overran its width. `text()` in `src/ui/widgets.js` now supplies a spacing-aware wrap callback (`spacedWrap`).
- **Keycaps** use a plain `Jersey 10` face (`FONTS.key`). Pixelify's curly capital E read as "Ɛ". Cap width now comes from the measured label.
- **Dialogue:** the nameplate is centred (name at `top + 6`). Lines are pre-wrapped so words don't jump lines while typing.
- **Tutorial** (`Tutorial.js`):
  - The panel now starts at y 52, below the Options button.
  - Controls, readout and chart flow beneath the text in `layoutText()`.
  - The plot and its caption are right-aligned inside the frame.
  - `history` is initialised in the constructor. It used to crash stage 4.
- **Oracle panel:**
  - Also starts at y 52.
  - The footer stacks up from the buttons, and the chart scale fills the space between.
  - The status line is right-aligned.
- **Toasts** wrap narrow enough to clear the HUD. The HUD is hidden while the pot grid is open.
- **Results:**
  - The verdict card and tiles share one height. The tile sub-line clears the border.
  - The comparison frame is taller, and the bars start at x 292.
- **Title:**
  - The islet is removed.
  - The footer sits on a lapis strip with a gold rule.
  - Temple is at 254, Play at 428, controls bar at 480.
- **Docs:** README and ASSETS now list Jersey 10.
- **Tests:** `smoke.mjs` now clicks tutorial buttons by object (`clickObj`). smoke, options_test and bot (12/12, mean 17.8 s) all pass.
- **Note:** run the test scripts one at a time. Running two in parallel overloads `http.server` and causes spurious failures.

## Request of 2026-10-11 (complete)

> "Change all the cringe dialogue to sound normal and human written. Add a separate 'learn more' section to each quantum page with more thorough explanations of the concepts and math. Add simple sound effects and background music, thematically accurate. Restructure the ending page to look less like an AI dashboard and more like the summary of a game. Add the option for a thorough quantum explanation there as well as in the options menu at any point."

### Done and verified

- **Dialogue** (`src/dialogue.js`):
  - Rewritten in plain, natural lines, with no jokes.
  - The lesson text is unchanged apart from small fixes.
- **Learn More** (`src/ui/Codex.js`, text in `TEXT.codex`):
  - Eight pages, covering qubits, Hadamard, the oracle, diffusion (with a worked example), geometry, measurement, the speed-up, and hardware.
  - The numbers are computed to match the game: 13.5% after 1 iteration, 59.1% after 3, 99.7% after 6.
  - It opens from:
    - each lesson page's "Learn more" button (chapter = stage)
    - the altar's "Learn more" button (geometry)
    - Options → How It Works
    - Results → How It Works
  - Font size steps down automatically if a page is long.
- **Esc layering:** `UIScene`'s Esc handler runs first and sets `e.oaHandled` when it closes the reader or Options. The other Esc handlers skip handled events.
- **Sound** (`src/synth.js`, `src/audio.js`):
  - Procedural Web Audio: Karplus-Strong lyre, aulos, frame drum, bell.
  - Three music tracks plus every SFX cue. New cues `fate_mark` and `fate_reflect` play during blessings, in both the altar and the lesson.
  - Files in `assets/audio/` still override.
  - Music and Sounds toggles in Options, saved in localStorage.
  - Verified with an analyser tap in headless Chrome: music and SFX produce signal, and music off gives silence.
- **Results** (`ResultsScene.js`):
  - Left: Zeus card with portrait, quote, 1–3 sun rating and verdict caption.
  - Right: a "Your Journey" ledger with dotted leaders, rows fading in, then a one-sentence comparison.
  - Buttons: Play Again / How It Works / Main Menu at y 472.
- **Wrap fix:** `spacedWrap` now sums per-character widths, because Phaser draws spaced text one character at a time without kerning.
- **Tests:** a new `tools/dev/codex.mjs` screenshots every page and checks Esc layering. smoke, options_test, bot and codex all pass.

### Follow-up (2026-10-11): "doesn't load" + title audio

- **Cause:** stale browser cache. The user's plain `http.server` sends no cache headers, so Chrome reused old modules (e.g. an old `dialogue.js` gives `T.music is not a function`).
- **Fixes:**
  - `serve.py` sends `Cache-Control: no-store`.
  - `index.html` shows an error screen for any failure before `UIScene` sets `window.__gameRunning`.
- **Title audio:** browsers block sound until a gesture, so the title now shows a "Click anywhere to begin" gate (`TitleScene.buildGate`) on first load. Title music starts with that click.
- **Tests:** they click once at (480, 300) to pass the gate.

## Request of 2026-10-11, evening (complete)

> Success sound on the correct pot. Fix the awkward music with the temple. The ending screen shows four stats (your run, Grover average, classical average, classical worst case) as graphics, with one button: "Learn more about Grover's", leading to an interactive menu that explains Grover's algorithm and connects it to the game. Horizontal platforms carry the player. All quantum explanations come from the Qollab project page (https://qollab.xyz/p/01a1230b-e0c2-7594-a3a1-d9f0ac28e580).

### Done and verified

- **Qollab text everywhere.**
  - The page is JavaScript-rendered, so it was fetched with headless Chrome. A copy is saved as `docs/qollab-project-page.txt`.
  - Replaced with its wording: the lesson bodies and notes, the altar text, and all guide topics.
  - Small fixes only: typos, % signs, and "N" in the sum limit. The old 8-page `Codex.js` was deleted.
- **Grover guide** (`src/ui/GroverGuide.js`, `TEXT.guide`):
  - Nine topics, each with a demo, an optional "More detail" page, and an "In the game" box.
  - Options: `{ top, depth, results }`. With `results`, the sidebar adds Play Again and Main Menu.
  - Opens from:
    - the lesson: topic = stage + 1
    - the altar: topic 5
    - Options: topic 0
    - Results: topic 0
- **Results:**
  - Left: Zeus card.
  - Right: four fluted columns that grow in turn: your run, Grover average 7/P(6) ≈ 7.0, classical average 32.5, worst 63.
  - One button. Labels wrap within their columns.
- **Sound:**
  - `success` fanfare (lyre, drum, aulos, bell) plays as the bolt rises. Music stops at the reveal and the title music returns when Zeus arrives.
  - Tracks no longer overlap: the old one fades out (0.6 s) before the new one fades in, and each resumes from its last bar.
  - Music ducks to 35% while the altar, coin toss, lesson or guide is open.
  - `fate_mark` no longer uses a tritone.
- **Moving ledges carry Hercules** (`GameScene.carryRider`):
  - The ledge is remembered while he stands on it, and he moves by its real displacement each frame.
  - It must be frame-rate independent: physics steps at 60 Hz but `update()` runs at the display rate. The first version only carried about a sixth of the motion at high refresh rates.
- **Tests:** `tools/dev/guide.mjs` replaces `codex.mjs`.
  - It screenshots every topic, presses every demo button, checks Esc layering, and measures ledge riding (drift 0 px).
  - smoke now leaves the results screen via the guide's Play Again.
  - All pass.

## Follow-up (2026-10-11, late)

- **Pot grid has two modes** (`PotGrid.open({ named })`):
  - Plain: the two early guesses show a plain 8×8 grid, with no numbers or X/O headers.
  - Named: after each coin toss, the labelled grid opens with the named pot highlighted and only that pot clickable. Flow: `GameScene` → `ui.pickPot(broken, false, outcome)`.
  - The coin-toss button now says "Find pot N".
- **Oracle's lesson:**
  - Her portrait sits on the left, and her explanation is in-universe (coins, weights on her scroll, marking, mirroring), mapping exactly onto the quantum step.
  - A "Quantum explanation" button below her words opens the matching guide topic (`stages[i].guide`).
  - The "Quantum view" notes and the header "Learn more" button are gone.
  - The altar's button is also labelled "Quantum explanation".
- **Guide:** the Amplitude Amplification step buttons are wider (160 / 200 px).
- **smoke.mjs:** clicks pots by object bounds and opens the named pot after each toss (`openNamed`).

## How to test (dev scripts)

Copies of the puppeteer scripts are in `tools/dev/`: `gallery.mjs`, `smoke.mjs`, `options_test.mjs`, `bot.mjs`.

- **Setup:** they need `puppeteer-core` (`npm i puppeteer-core@23`), installed in the folder you run them from, plus Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`. The server must be running on port 8123.
- **gallery:** `node gallery.mjs <prefix>` writes `<prefix>_1title.png` … `_8broken.png`, covering title, intro, hill far/near, checkpoint, temple, pot grid and broken pot.
- **smoke:** `node smoke.mjs <outdir>` writes screenshots `01_hill_climb` … `16_results` (tutorial pages, altar, blessing, coin toss, results and so on) plus `log.txt`.
- Screenshots are 1920×1080, which is 2× the 960×540 logical layout.
- The original copies lived in a session scratchpad that may be gone. Some scripts may write output relative to the current directory.

## Architecture reminders

- **Viewport** (`src/viewport.js`): the canvas is the window size × dpr, with camera zoom fitting a 960×540 safe area.
  - Use `anchorX` / `anchorY` for edge-pinned UI.
  - Scenes re-lay out on the `view-resize` event.
- **Phase machine** (GameScene): INTRO → ATTEMPT_1 → ATTEMPT_2 → ORACLE_INTRO → MAIN_LOOP → ENDING → RESULTS.
  - Every offering costs a climb.
  - Async steps are guarded by `runId` so a restart discards stale callbacks.
- **Quantum adapter:** a classical simulation with 350–700 ms latency. It provides `generateTarget`, `runGroverIteration` (returns amplitudes and oracleAmplitudes), `measure` and `resetGrover`.
- **Level layout:**
  - Temple constants are in `src/level.js` (`TEMPLE`, floorTop 530).
  - The climb is generated top-down (`CLIMB`), with moving and crumbling ledges.
- **Portraits:** `tools/prepare_assets.py` builds them, but don't re-run it unless the user asks; they must stay unchanged.
