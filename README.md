# EdisonRL — Teach Your Edison Robot with Reinforcement Learning

Copyright (C) Shreyan Mitra, 2024-2026.

> Edison and EdPy are developed by Microbric Pty Ltd, which does not support or endorse this project.

**EdisonRL** is a free, browser-based tool that lets you design grid worlds,
compile them into code, and watch an Edison V2 robot teach itself to navigate
using reinforcement learning — no programming experience required.

**Try it now:** [https://shreyanmitra.github.io/EdisonRL/web-builder/](https://shreyanmitra.github.io/EdisonRL/web-builder/)

---

## Getting Started

### 1. Design your grid

Open the [web builder](https://shreyanmitra.github.io/EdisonRL/web-builder/)
and create your world:

- **Define square types** — goals, lava, walls, or invent your own (quicksand
  that costs extra steps, conveyor belts that push the robot, etc.).
- **Paint a grid** — click cells to place tiles. Set the start position and
  heading.
- **Tune how the robot learns** (optional) — adjust curiosity, learning speed,
  training rounds, and more. Sensible defaults are pre-filled.

### 2. Compile

Click **Compile for Edison**. The builder produces a complete Python file ready
for the robot — no installs, no command line.

### 3. Upload to EdPy

1. Open [EdPy](https://www.edpyapp.com) in your browser.
2. Click **Copy Code** in the EdisonRL builder, then paste into EdPy's editor.
   (Or click **Download .py** and open the file in EdPy.)
3. Click **Program Edison** in EdPy to flash the robot.

### 4. Print the grid map

Download the SVG map from the builder (**Selected SVG** or **All SVGs**) and
print it.

#### Printing tips

- **Paper size:** The generated SVGs are sized for A3 paper (420 × 297 mm).
  If you only have A4, use your printer's "Poster" or "Tiled" mode to print
  across two sheets and tape them together.
- **Print at 100% scale** — do not use "Fit to page". Each grid cell must
  physically measure the **Cell Size** value (default 11 cm) for the robot's
  movements to line up.
- **Use a flat, smooth surface.** Tape the printout to a table or the floor so
  it doesn't slide.
- **Calibration strip:** Download the calibration test strip from the builder
  (the **Calibration Strip** button). Print it at 100% and use it to verify
  that your Cell Size and Turn Degrees settings match the robot's actual
  movement. Adjust the hyperparameters and recompile if needed.
- **Start circle:** Place Edison's round sensor module on the green start
  circle, facing the direction shown.
- **ID bars:** Every map includes a strip of black bars between the start
  circle and the grid. Edison drives over these first to identify which
  scenario to run — don't cover or cut them.

### 5. Watch it learn!

Set Edison on the start circle, press the play button, and watch:

1. **Barcode scan** — Edison drives over the ID-bar strip to select the
   correct scenario.
2. **Exploration** — the robot explores the grid using Q-learning. It plays
   an ascending melody when it finds a goal and a descending melody when it
   hits lava.
3. **Reset** — after each attempt, Edison blinks its LED and waits. Press the
   round button **or clap** to place it back on the start circle.
4. **Deployment** — after enough training rounds, Edison plays a celebration
   and switches to its learned optimal path.

---

## Default Grids

Three ready-to-use grids ship with the project. Hand-illustrated SVGs are in
the `grids/` folder and can also be downloaded from the web builder via
**Import JSON** (load `scenarios/default_scenarios.json`).

| Grid | ID Bars | Size | Theme |
|------|---------|------|-------|
| Grid 1 | 1 | 4×5 | Desert |
| Grid 2 | 2 | 3×3 | Forest |
| Grid 3 | 3 | 5×5 | Arctic |

---

## Hyperparameters

You can tune these in the web builder's "Tune Hyperparameters" section.
Defaults work well for most grids.

| Setting | Default | What it does |
|---------|---------|--------------|
| Learning Speed | 22 | How fast the robot updates its knowledge (0–99) |
| Future Thinking | 95 | How much the robot values future rewards (0–99) |
| Curiosity | 28 | Chance of trying a random move to explore (0–99) |
| Training Rounds | 18 | Exploration episodes before switching to best path |
| Step Limit | 60 | Max steps per episode before giving up |
| Turn Degrees | 95 | Motor degrees for a 90° spin — tune if the robot drifts |
| Cell Size (cm) | 11 | Driving distance per grid cell — must match your printout |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Icons don't appear | Your browser may be blocking the page. Try a different browser or clear cache. |
| "Load current EdisonRL.py: failed" | You're likely opening `index.html` as a local file. Use the [hosted version](https://shreyanmitra.github.io/EdisonRL/web-builder/) or run `python -m http.server 8000` and open `http://localhost:8000/web-builder/`. |
| Robot overshoots / undershoots cells | Print the calibration strip and adjust **Cell Size** and **Turn Degrees**. |
| Robot drifts during turns | Increase or decrease **Turn Degrees** by 1–2 until 90° turns are accurate. |
| EdPy compile error | Make sure you're using the **compiled** output (not the raw `EdisonRL.py`). The grid must have ≤ 25 cells and type IDs 0–31. |

---

## For Developers

<details>
<summary>CLI compilation, file structure, and technical details</summary>

### CLI Compile (Python)

If you prefer the command line over the web builder:

1. Export scenario JSON from the web builder, or edit JSON manually.
2. Save as `scenarios/my_scenario.json`.
3. Run:

```bash
python tools/compile_scenario.py \
  --input scenarios/my_scenario.json \
  --runtime EdisonRL.py
```

With custom hyperparameters:

```bash
python tools/compile_scenario.py \
  --input scenarios/my_scenario.json \
  --runtime EdisonRL.py \
  --alpha 30 --gamma 90 --epsilon 20 --min-episodes 25
```

CLI hyperparameter flags: `--alpha`, `--gamma`, `--epsilon`, `--min-episodes`,
`--max-steps`, `--turn-deg`, `--cell-cm`.

Output goes to `generated/`.

### Scenario Model

Each square type supports:

- `id` (int, 0–31)
- `name` (string)
- `reward_on_enter` (int)
- `terminal` (bool)
- `blocked` (bool)
- `wait_steps` (int; extra no-action timesteps on entry)
- `force_action` (`null`, `forward`, `spin_left`, `spin_right`)
- `color_hex` (optional; used by SVG export)

### EdPy Compiler Constraints

- Max **25 cells** per scenario (`rows × cols ≤ 25`).
- Dimensions: `rows ≤ 5`, `cols ≤ 5`.
- Square type IDs: `0..31`.
- `id_bars` must be unique across scenarios (range 1–7).
- Total flat grid across all scenarios ≤ 250 ints.
- `EdisonRL.py` must stay under ~280 lines / ~47 global symbols.
- `Ed.List` initializers require literal integers (no variables or nested lists).
- Functions cannot reference user-defined globals.

### File / Folder Guide

```
EdisonRL.py                     Core runtime + auto-generated config block
README.md                       This document

tools/
  compile_scenario.py           CLI compiler: JSON -> config block + SVGs
  compute_policies.py           Offline Q-learning simulator (optional)
  _gen_bundled.py               Regenerates bundled-runtime.js & runtime-template.py

web-builder/
  index.html                    Browser-based scenario editor
  app.js                        Editor logic, in-browser compiler, SVG builder
  styles.css                    UI styles
  icons.js                      Inline SVG icons (no CDN dependency)
  edison-logo.png               Header logo
  bundled-runtime.js            Embedded EdisonRL.py for offline / file:// use
  runtime-template.py           Full runtime copy for HTTP fallback

schemas/
  scenario.schema.json          JSON schema for scenario files

scenarios/
  default_scenarios.json        Starter data (3 default grids)

grids/
  grid1.svg                     Hand-illustrated desert grid (4x5)
  grid2.svg                     Hand-illustrated forest grid (3x3)
  grid3.svg                     Hand-illustrated arctic grid (5x5)
  calibration_test_strip.svg    Print calibration helper

generated/                      CLI compiler output (git-ignored)
  compiled_scenarios.json
  generated_block.txt
  svgs/*.svg
```

### Regenerating Bundled Files

After editing `EdisonRL.py`, run:

```bash
python tools/_gen_bundled.py
```

This keeps `bundled-runtime.js` and `runtime-template.py` in sync.

### Hosting on GitHub Pages

1. Push the repo to GitHub.
2. Go to **Settings → Pages** → deploy from **main** branch, **/ (root)**.
3. The builder will be live at `https://<username>.github.io/EdisonRL/web-builder/`.

</details>

---

## License

Copyright (C) Shreyan Mitra, 2024-2026.
