# EdisonRL Build Pipeline

Copyright (C) Shreyan Mitra, 2024-2026.

## Overview

This project lets children design grid-based reinforcement-learning scenarios for
the Edison V2 robot, then compiles everything into a single deployable `EdisonRL.py`.
The robot does **not** read JSON at runtime — all scenario data and RL
hyperparameters are baked into the code at compile time.

End-to-end flow:

1. Design square types and grid scenarios (web builder or JSON file).
2. Optionally tune RL hyperparameters (learning speed, curiosity, etc.).
3. Compile — scenario data and hyperparameters are injected into `EdisonRL.py`.
4. Download/copy the compiled code and paste it into EdPy.
5. Print the auto-generated SVG map (with ID-bar strip) and place it on a flat surface.
6. Set Edison on the start circle, press play, and watch it learn!

## How the Robot Learns

1. **Barcode scan** — Edison drives forward over the printed ID-bar strip.
   The number of black bars selects which compiled scenario to use.
2. **Exploration (training mode)** — the robot uses epsilon-greedy Q-learning
   to explore the grid, updating a Q-table after every move. It plays
   ascending 3-note melodies on positive terminals and descending melodies on
   negative ones (lava / out-of-bounds).
3. **Wait for reset** — after each terminal state or step-limit timeout, Edison
   blinks its left LED and waits for a round-button press **or** a clap to be
   placed back on the start cell.
4. **Exploit (deployment mode)** — once enough training episodes complete, a
   triple-beep + LED celebration signals the switch; from then on Edison
   follows the greedy policy.

## Runtime Selection Logic

At startup Edison scans the printed ID bars and matches the count to the
`id_bars` value of each compiled scenario. This selects which grid, rewards,
and start position to use.

## Quick Start

### Option A: In-browser compile (no Python required — simplest)

1. Open `web-builder/index.html` in a browser (GitHub Pages or local HTTP
   server recommended).
2. Define square types and design grid scenarios.
3. Tune hyperparameters (optional — sensible defaults are pre-filled).
4. Click **Compile for Edison**.
5. Copy or download the compiled `EdisonRL.py`.
6. Paste/upload code into EdPy and flash Edison.
7. Click **Download Selected SVG** / **Download All SVGs** to get print-ready
   maps with auto ID strips.

If auto-load fails (strict `file://` browser restrictions), use the Advanced
section to manually upload `EdisonRL.py` once.

The builder ships with two fallback mechanisms:

- `web-builder/runtime-template.py` — full runtime copy, fetched when
  `../EdisonRL.py` is not reachable over HTTP.
- `web-builder/bundled-runtime.js` — full runtime embedded in JS, used
  automatically in `file://` / offline mode.

### Runtime Auto-Load Troubleshooting

- `Load current EdisonRL.py: failed (Failed to fetch)` usually means the page
  is running from `file://` or from a path where `EdisonRL.py` is not
  reachable.
- Recommended: host via GitHub Pages (or any HTTP server), not by
  double-clicking `index.html`.
- Local test option:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/web-builder/`.

- If auto-load still fails, use **Advanced: manual runtime template upload**
  and select your current `EdisonRL.py`.

### Option B: CLI compile (Python)

1. Export scenario JSON from the web builder (or edit JSON manually).
2. Save it as `scenarios/my_scenario.json`.
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

4. Review generated artifacts:
   - `generated/generated_block.txt`
   - `generated/compiled_scenarios.json`
   - `generated/svgs/*.svg` (auto-generated maps with ID strips)
5. Flash `EdisonRL.py` through EdPy.

## Hyperparameters

Both the web builder and the CLI compiler support tuning these values at
compile time. They are injected as inline literals (no extra global variables)
to stay within EdPy's strict memory and symbol limits.

| Parameter | CLI flag | Default | Description |
|-----------|----------|---------|-------------|
| Learning Speed | `--alpha` | 22 | Q-update rate (×100, so 22 ≈ 0.22) |
| Future Thinking | `--gamma` | 95 | Discount factor (×100, so 95 ≈ 0.95) |
| Curiosity | `--epsilon` | 28 | Exploration probability (×100, so 28 ≈ 28%) |
| Training Rounds | `--min-episodes` | 18 | Episodes before switching to exploit mode |
| Step Limit | `--max-steps` | 60 | Max steps per episode before timeout |
| Turn Degrees | `--turn-deg` | 95 | Motor degrees for a 90° spin (tune for drift) |
| Cell Size (cm) | `--cell-cm` | 11 | Drive distance per grid cell |

## Scenario Model

Each square type supports:

- `id` (int, 0–31)
- `name` (string)
- `reward_on_enter` (int)
- `terminal` (bool)
- `blocked` (bool)
- `wait_steps` (int; extra no-action timesteps on entry)
- `force_action` (`null`, `forward`, `spin_left`, `spin_right`)
- `color_hex` (optional; used by SVG export)

This enables custom mechanics (quicksand, conveyor belts, ice, etc.) without
changing the robot runtime logic.

## Constraints (EdPy Compiler Limits)

- Max **25 cells** per scenario (`rows × cols ≤ 25`).
- Dimensions limited to `rows ≤ 5`, `cols ≤ 5`.
- Square type IDs must be within `0..31`.
- `id_bars` must be unique across scenarios (range 1–7).
- Total flat grid across all scenarios must fit in one `Ed.List` (≤ 250 ints).
- `EdisonRL.py` must stay under ~280 lines / ~47 global symbols to avoid
  EdPy "Compiler internal error 700".
- `Ed.List` initializers require literal integers (no variables or nested lists).
- Functions cannot reference user-defined global variables; all data is passed
  as parameters or accessed through `Ed.List` objects.

## Default Grids

`scenarios/default_scenarios.json` and `EdisonRL.py` ship with three defaults:

| Grid | id_bars | Size | Theme |
|------|---------|------|-------|
| Grid 1 | 1 | 4×5 | Desert |
| Grid 2 | 2 | 3×3 | Forest |
| Grid 3 | 3 | 5×5 | Arctic |

Hand-illustrated SVGs are in `grids/`. They remain supported as long as the
compiled config includes them.

## File / Folder Guide

```
EdisonRL.py                     Core runtime + auto-generated config block
PIPELINE.md                     This document

tools/
  compile_scenario.py           CLI compiler: JSON → config block + SVGs
  compute_policies.py           Offline Q-learning simulator (optional)
  _gen_bundled.py               Regenerates bundled-runtime.js & runtime-template.py

web-builder/
  index.html                    Browser-based scenario editor
  app.js                        Editor logic, in-browser compiler, SVG builder
  styles.css                    UI styles
  bundled-runtime.js            Embedded EdisonRL.py for offline / file:// use
  runtime-template.py           Full runtime copy for HTTP fallback

schemas/
  scenario.schema.json          JSON schema for scenario files

scenarios/
  default_scenarios.json        Starter data (3 default grids)

grids/
  grid1.svg                     Hand-illustrated desert grid (4×5)
  grid2.svg                     Hand-illustrated forest grid (3×3)
  grid3.svg                     Hand-illustrated arctic grid (5×5)
  calibration_test_strip.svg    Print calibration helper

generated/                      CLI compiler output (gitignore-friendly)
  compiled_scenarios.json
  generated_block.txt
  svgs/*.svg
```

## Regenerating Bundled Files

After editing `EdisonRL.py`, run:

```bash
python tools/_gen_bundled.py
```

This keeps `bundled-runtime.js` and `runtime-template.py` in sync with the
root runtime.
