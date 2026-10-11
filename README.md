# Oracle's Assistance

A 2D platformer that teaches Grover's algorithm. It was built for Qollab's "Quantum Unlocked" hackathon.

## Running it

The game needs a local web server, because ES modules don't load from `file://`. From this folder:

```
python serve.py
```

Then open <http://localhost:8123> in Chrome. Everything, including Phaser 3.90.0 and the fonts, is in this folder, so the game works offline.

`serve.py` works like `python -m http.server`, but it tells the browser not to cache files. Plain `http.server` sends no cache headers, so after the code changes, Chrome can mix old and new script files and the game fails to start. If that happens, press **Ctrl+Shift+R**. Any startup failure now shows an on-screen message instead of a blank page.

Add `?debug` to the URL (<http://localhost:8123/?debug>) to expose the running game scene as `window.__oa` for inspection.

## Project layout

```
index.html
lib/phaser.min.js            Phaser 3.90.0 (stored locally)
src/main.js                  Boot: fonts, asset discovery, Phaser config
src/config.js                Tuning: movement, verdict thresholds, fonts, sizes
src/level.js                 Temple geometry + random climb generator
src/gameState.js             Run state + strict phase state machine
src/dialogue.js              ALL dialogue and on-screen text
src/coins.js                 Χ/Ο coin patterns <-> pot numbers
src/quantumAdapter.js        The only quantum interface (classical sim for now)
src/sim/statevector.js       State-vector math (adapter sim + tutorial only)
src/assetManifest.js         Every asset key, path, size, animation, audio cue
src/assetDiscovery.js        Finds which asset files exist (avoids 404 noise)
src/placeholders.js          Generates labeled placeholders for missing assets
src/audio.js                 Named audio cues: a file if one exists, else the synth; music/sound prefs
src/synth.js                 Procedural sound effects and music (Web Audio: lyre, aulos, frame drum)
src/player.js                Hercules' controller (coyote time, jump buffer…)
src/scenes/                  Boot, Title, Game, UI (overlay), Results
src/ui/                      UI kit, pixel titles, backdrop, dialogue, pot grid, altar, coin toss, lesson, Grover guide (GroverGuide.js)
src/art/                     All artwork, drawn in code (pixel.js, generators.js, uiArt.js, menuArt.js)
src/viewport.js              Fullscreen sizing, zoom, screen anchors
assets/                      Source art + game-ready files (see ASSETS.md)
tools/prepare_assets.py      Prepares the portraits from the supplied paintings
```

## Rendering and art

- **Fullscreen.** The canvas always fills the browser window at the screen's real pixel density, with no fixed resolution and no letterboxing. Layout works in a 960×540 "safe area" (in logical pixels) that the camera zoom always fits. On wider or taller windows, more of the scene shows around it, and everything re-lays out live when the window resizes. Press **F** (or the Fullscreen button on the title screen) for true fullscreen. See `src/viewport.js`.
- **One pixel scale.** All artwork is drawn in code (`src/art/`) in art pixels, and every art pixel becomes a 2×2 block (`ART_SCALE` in `src/placeholders.js`). Characters, tiles, temple, backgrounds and UI frames therefore share exactly the same pixel size. Text is the one exception, rasterised sharp in pixel fonts: Pixelify Sans for letters, Jersey 10 for digits and keycaps (see ASSETS.md).
- **Art direction.** Apollo's temple in Mediterranean daylight: marble, gold and lapis blue with the sun emblem, terracotta pottery, olive and cypress greens. Characters are small and simple, SNES-style. The supplied images in `assets/` are design reference only.
- **Portraits.** These are the one exception: the three character portraits are image files, prepared from the supplied paintings by `python tools/prepare_assets.py` (needs Pillow).
- **Replacing art.** Any drawn asset can be replaced by a PNG of the size listed in ASSETS.md.

## Options menu

Press **Esc**, or click **Options** in the top-right corner, at any point in a run. The game pauses, and the menu offers:

- **Resume**
- **Grover's Algorithm:** opens the Grover guide (see below).
- **Music / Sounds:** switch each on or off. The choice is remembered in the browser.
- **Fullscreen**
- **Restart Run:** starts over from Zeus's introduction, with a fresh target and new climbs.
- **Main Menu:** returns to the title screen.

Restart Run and Main Menu ask for confirmation first. A restart is safe even while the Oracle is mid-consultation: any adapter call still in flight is ignored when it returns.

## The Grover guide

An interactive explainer of Grover's algorithm (`src/ui/GroverGuide.js`). It has nine topics:

1. The search problem
2. The search space
3. Initializing superposition
4. The Grover oracle
5. Amplitude amplification
6. The optimal iteration count
7. Measurement
8. Quantum advantage
9. Our quantum implementation

Each topic has:

- **Explanation:** text taken from the project write-up on Qollab.
- **Hands-on demo:** for example, searching pots one by one, flipping coins, applying the oracle and diffusion, stepping through iterations, measuring 100 times, or comparing classical and Grover query counts for any number of qubits.
- **More detail:** an extra page with the maths, on some topics.
- **"In the game" box:** connects the idea to what Hercules does.

You can open it from:

- **The Oracle's lesson:** each page has a "Learn more" button that opens the matching topic.
- **The Oracle's altar:** opens the optimal-iterations topic.
- **Options:** at any point in a run.
- **The results screen:** its only button. The guide there also holds Play Again and Main Menu.

**Source of the explanations.** All quantum explanations in the game come from the Qollab project page. This covers the lesson's text and "Quantum view" notes, the altar note and the guide. A copy of the page text is in `docs/qollab-project-page.txt`. The text itself lives in `TEXT.tutorial`, `TEXT.oracle` and `TEXT.guide` in `src/dialogue.js`.

## Sound

All sound is synthesised in the browser by `src/synth.js`, the same way the art is drawn in code:

- **Instruments:** a plucked lyre (Karplus-Strong), a reedy aulos drone, a frame drum and a temple bell.
- **Music:** three looping tracks in Greek-sounding modes:
  - title: A Dorian
  - hill: D Dorian, with a dance rhythm
  - temple: E Phrygian
- **Effects:** every cue in the asset manifest. Sound starts on the first click or key press, as browsers require.
- **Replacing sounds:** dropping a file into `assets/audio/` replaces that cue (see ASSETS.md).

## How a run plays

1. Zeus explains the theft. Hercules takes an offering from the pile and climbs to the floating temple.
2. On the first two visits he guesses a pot himself (always empty) and is sent back down.
3. On the third visit the Oracle teaches him to "bend fate" (Grover's algorithm) in a four-step lesson.
4. From then on, each offering buys one choice at the Oracle's altar:
   - **Ask for a blessing** (one Grover iteration). The altar animates the bar graph: the Oracle marks the bolt's pot, then reflects everything about the average. The bars are shuffled and unlabeled, so you see how strongly fate leans but not which pot it leans toward.
   - **Toss the coins** (a measurement). Six coins land Χ or Ο with the odds fate currently has, and that pattern names the pot that gets opened. If the pot is empty, all the blessings are undone.
5. Either way, Hercules goes back down for another offering. **The climb is regenerated every trip.**

## The random climb

`generateClimb(seed)` in `src/level.js` builds each course from the top down, starting beside the temple porch. Each piece is placed so the one above it is reachable, so every course can be beaten. Courses mix:

- plain marble ledges
- narrow marble blocks
- crumbling ledges (they give way 0.6 s after you land and reform 2.2 s later; never placed where you'd have to wait for a moving platform)
- horizontal and vertical moving platforms (at least two per course)

All the limits (rise, gap, widths, speeds, how often each piece appears) are in the `CLIMB` table in `src/level.js`. A course has 13–20 pieces plus two checkpoints.

## Replacing the classical simulation

All quantum behavior goes through four async functions in `src/quantumAdapter.js`:

```js
async generateTarget(excludedIndices)  // -> 0..63, called exactly once per run
async runGroverIteration()             // -> { iteration, probabilities[64], mostLikely,
                                       //      amplitudes?[64], oracleAmplitudes?[64] }
async measure()                        // -> 0..63, sampled from the current state (the coin toss)
async resetGrover()                    // back to uniform superposition
```

To use the real quantum implementation, replace the bodies of these functions and keep their signatures. The two amplitude arrays only drive the bar-graph animation. If a backend can't provide them, the game draws bars from the square roots of the probabilities and skips the "mark" step. After every `measure()` that doesn't find the bolt, the game calls `resetGrover()`.

The game shows "The Oracle is consulting…" while a call is pending. If a call fails, the game shows a message and retries.
 
The simulated latency (350–700 ms) is at the top of the adapter. Set it to 0 if you don't want it.

## Where the build differs from the spec

These changes came from design feedback after Spec Rev 2:

- **The climb is random and repeats for every action.** The spec had a fixed course and an unlimited supply of offerings inside the temple once the lesson was done. Now every blessing and every coin toss costs a climb.
- **Pots are chosen by tossing the coins, not by picking.** Picking from the 8×8 grid is only used for the two early guesses.
- **The 8×8 brightness grid became an unlabeled, shuffled bar graph,** so the vision never reveals which pot is likely.
- **Story text avoids quantum terms.** Coins land Χ/Ο instead of 0/1. The quantum terms appear only in "Quantum view" notes in the lesson, on the altar and in the Grover guide.

These differences come from the first build:

- **World height is 1640 px, not ~2200.** The spec's jump physics (−430 px/s jump, 1100 px/s² gravity) give a jump height of about 84 px, so each step up is held to 62 px or less.
- **Fall respawn:** the hill has no pits, so a "fall" means dropping more than 220 px below the last checkpoint while carrying an offering. Without an offering, Hercules can drop freely so he can go back to the pile.
