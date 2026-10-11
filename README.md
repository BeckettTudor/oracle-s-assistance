# Oracle's Assistance

A 2D platformer that teaches Grover's algorithm.  Built for Qollab's Quantum Unlocked hackathon.

> **The game does not run Qiskit, does not connect to Qollab or any quantum computer, and is not a real quantum simulation.** Its "quantum" side is a small classical stand-in written in plain JavaScript, which reproduces the ideal numbers of Grover's algorithm for a single marked item. See [How the game models the quantum side](#how-the-game-models-the-quantum-side). The project's Qiskit implementation is separate and lives on Qollab.

## Educational Contribution
Oracle's Assistance aims to connect abstract quantum concepts with decisions and actions that a player can understand intuitively and interact with actively. Its educational contribution is built around three ideas:

Learning by consequence. The impact of the iterations is well explained, and the optimal number is given, but not enforced. This means players can experiment with the number of iterations, and observe the consequences. They can also play many times and observe the potential for an outcome to be incorrect, despite a higher likelihood than not for it to be the correct one.

Making interference and phase shifting properties tangible. The game doesn't present quantum computing as some nebulous ability to test every answer simultaneously. Instead, the game focuses on how the phase changes and interference create a marked shift in probabilities, and how this shift increases with each iteration.

Teaching both the limitations and the advantages. Players interact with the nature of probabilistic measurement, the tradeoff between additional queries and success probability, and the surprising fact that the iterations can overshoot and success chance can be lowered.

The intended audience is those curious about quantum, who are comfortable with basic probability and binary numbers, but have little or no previous quantum-computing experience.

Of the algorithms with a proven quantum advantage, Grover's is, to us, the simplest to begin teaching with. Those who are completely new to the field will get a good introduction to the potential of quantum advantage, and a good intuition of how this technology can potentially provide advantages over classical methods.

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
src/quantumAdapter.js        The only "quantum" interface: a classical stand-in, not Qiskit
src/sim/statevector.js       64 plain numbers and closed-form Grover steps (not a quantum simulator)
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

An interactive explainer of Grover's algorithm (`src/ui/GroverGuide.js`). It has eight topics:

1. The search problem
2. The search space
3. Initializing superposition
4. The Grover oracle
5. Amplitude amplification
6. The optimal iteration count
7. Measurement
8. Quantum advantage

Each topic has:

- **Explanation:** text taken from the project write-up on Qollab.
- **Hands-on demo:** run on the same classical stand-in as the game (see below), for example searching pots one by one, flipping coins, applying the oracle and diffusion, stepping through iterations, measuring 100 times, or comparing classical and Grover query counts for any number of qubits.
- **More detail:** an extra page with the maths, on some topics.
- **"In the game" box:** connects the idea to what Hercules does.

You can open it from:

- **The Oracle's lesson:** each page has a "Quantum explanation" button that opens the matching topic.
- **The Oracle's altar:** opens the optimal-iterations topic.
- **Options:** at any point in a run.
- **The results screen:** its only button. The guide there also holds Play Again and Main Menu.

**Source of the explanations.** The quantum explanations in the guide and the altar's note come from the Qollab project page; a copy of the page text is in `docs/qollab-project-page.txt`. The Oracle's lesson is told in the story's own terms (coins, weights, marking, mirroring), with each step mapped onto the quantum one. All of this text lives in `TEXT.tutorial`, `TEXT.oracle` and `TEXT.guide` in `src/dialogue.js`.

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

## How the game models the quantum side

**This is not Qiskit, and it is not a real quantum simulation.** No qubits, gates or circuits exist anywhere in the game, and nothing is sent to Qollab or to any quantum computer or quantum simulator. Everything runs as ordinary JavaScript in the browser.

What the game does instead is keep a list of 64 ordinary numbers, one per pot (`src/sim/statevector.js`), and change them with the known end result of each step of Grover's algorithm:

| Step | What a quantum computer would do | What this game does instead |
|---|---|---|
| Start | Apply a Hadamard gate to each of six qubits | Sets all 64 numbers to 1/8 directly |
| Oracle (the Oracle's "mark") | Run a circuit that recognises the answer and flips its phase | The code already knows the target, and multiplies that one number by −1 |
| Diffusion (the "mirroring") | Hadamards, a phase flip on \|000000⟩, Hadamards again | Replaces every number *a* with 2*m* − *a*, where *m* is their average |
| Measurement (the coin toss) | Measure the qubits; the state collapses | Picks one pot at random, weighted by the squared numbers, then resets to 1/8 |
| Target choice | Quantum random number generator (planned in the spec) | The browser's ordinary secure random generator (`crypto.getRandomValues`) |

For one marked item with no noise, these formulas give exactly the same probabilities as the ideal mathematics of Grover's algorithm, for example 13.5% after one iteration and 99.7% after six. That is the whole extent of the model. It leaves out:

- **Real quantum mechanics:** qubits, gates, circuits, complex amplitudes, entanglement and noise. Grover's state happens to stay simple enough that a few lines of arithmetic can stand in for all of this, which would not be true for quantum programs in general.
- **Actual computation behind the "consulting" pause:** the 350–700 ms delay is artificial, there so the "The Oracle is consulting…" state behaves as it would with a real backend.
- **Real hardware behaviour:** the bar graphs show the exact numbers. Real hardware never reveals amplitudes; it only returns measured results.

The project's Qiskit implementation of Grover's algorithm is separate. It lives on Qollab (the project's Code tab), and the game never calls it.

### Connecting a real backend

All "quantum" behaviour goes through four async functions in `src/quantumAdapter.js`:

```js
async generateTarget(excludedIndices)  // -> 0..63, called exactly once per run
async runGroverIteration()             // -> { iteration, probabilities[64], mostLikely,
                                       //      amplitudes?[64], oracleAmplitudes?[64] }
async measure()                        // -> 0..63, drawn from the current probabilities (the coin toss)
async resetGrover()                    // back to the even starting state
```

To connect a real quantum implementation, replace the bodies of these functions and keep their signatures.

- **The two amplitude arrays** only drive the bar-graph animation. If a backend can't provide them, the game draws bars from the square roots of the probabilities and skips the "mark" step.
- **After a miss:** after every `measure()` that doesn't find the bolt, the game calls `resetGrover()`.
- **While a call is pending:** the game shows "The Oracle is consulting…". If a call fails, it shows a message and retries.
- **The artificial delay** (350–700 ms) is at the top of the adapter. Set it to 0 if you don't want it.


