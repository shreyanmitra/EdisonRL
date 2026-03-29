"""
Compile scenario JSON into EdisonRL.py generated config block.
Copyright (C) Shreyan Mitra, 2024-2026.

Usage:
  python tools/compile_scenario.py --input scenario.json --runtime EdisonRL.py
  python tools/compile_scenario.py --input scenario.json --runtime EdisonRL.py --alpha 30 --gamma 90 --epsilon 20
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

MARKER_START = "# === GENERATED CONFIG START ==="
MARKER_END = "# === GENERATED CONFIG END ==="

FORCE_ACTION_TO_INT = {
    None: -1,
    "forward": 0,
    "spin_left": 1,
    "spin_right": 2,
}

FALLBACK_COLORS = [
    "#ffffff",
    "#ffe69a",
    "#ffb8a8",
    "#d9dce3",
    "#c9f4db",
    "#dff3ff",
    "#f6d7ff",
    "#ffd9b3",
]


def must(cond: bool, msg: str) -> None:
    if not cond:
        raise ValueError(msg)


def flatten_and_pad(cells: list[list[int]], rows: int, cols: int, max_cells: int = 25) -> list[int]:
    out: list[int] = []
    for r in range(rows):
        for c in range(cols):
            out.append(cells[r][c])
    while len(out) < max_cells:
        out.append(0)
    return out


def ed_list(values: list[int]) -> str:
    return "Ed.List({}, [{}])".format(len(values), ", ".join(str(v) for v in values))


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def safe_name(name: str) -> str:
    out = []
    for ch in name.lower():
        if ("a" <= ch <= "z") or ("0" <= ch <= "9"):
            out.append(ch)
        else:
            out.append("_")
    s = "".join(out).strip("_")
    return s or "scenario"


def type_color_map(square_types: list[dict]) -> dict[int, str]:
    m: dict[int, str] = {}
    for t in square_types:
        tid = int(t["id"])
        c = t.get("color_hex")
        if isinstance(c, str) and len(c) == 7 and c.startswith("#"):
            m[tid] = c
        else:
            m[tid] = FALLBACK_COLORS[tid % len(FALLBACK_COLORS)]
    return m


def build_svg_for_scenario(square_types: list[dict], scenario: dict) -> str:
    rows = int(scenario["rows"])
    cols = int(scenario["cols"])
    name = str(scenario["name"])
    bars = int(scenario["id_bars"])
    sr = int(scenario["start"]["row"])
    sc = int(scenario["start"]["col"])
    cells = scenario["cells"]

    cell = 110
    left = 30
    top = 88
    grid_w = cols * cell
    grid_h = rows * cell
    width = max(420, left + grid_w + 30)
    height = max(320, top + grid_h + 55)

    color = type_color_map(square_types)
    type_name = {int(t["id"]): str(t["name"]) for t in square_types}

    lines: list[str] = []
    lines.append('<?xml version="1.0" encoding="UTF-8"?>')
    lines.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}mm" height="{height}mm" viewBox="0 0 {width} {height}">')
    lines.append(f"  <title>{esc(name)} (ID bars: {bars})</title>")
    lines.append("  <rect width=\"100%\" height=\"100%\" fill=\"#f4f8ff\"/>")
    lines.append(f'  <text x="12" y="16" font-family="Arial,sans-serif" font-size="10" font-weight="bold" fill="#1f365e">{esc(name)}</text>')
    lines.append('  <text x="12" y="26" font-family="Arial,sans-serif" font-size="6" fill="#1f365e">Generated map. Print at 100 percent. Cell = 110 mm.</text>')

    # ID strip with auto bars
    lines.append(f'  <rect x="12" y="32" width="{width-24}" height="28" rx="4" fill="#ffffff" stroke="#4f72a9" stroke-width="0.8"/>')
    lines.append('  <text x="20" y="42" font-family="Arial,sans-serif" font-size="5.2" fill="#2b4976">Place line sensor on green target, face up, then scan bars.</text>')
    lines.append('  <circle cx="30" cy="50" r="8" fill="#2dbb70" stroke="#1b7f49" stroke-width="0.8"/>')
    lines.append('  <circle cx="30" cy="50" r="3.2" fill="#f7fff9" stroke="#1b7f49" stroke-width="0.5"/>')
    base_x = width - 24 - 18 - bars * 10
    bx = base_x
    for _ in range(bars):
        lines.append(f'  <rect x="{bx}" y="38" width="3" height="18" fill="#111111"/>')
        bx += 10

    lines.append(f'  <g transform="translate({left},{top})">')
    lines.append(f'    <rect x="0" y="0" width="{grid_w}" height="{grid_h}" fill="#ffffff" stroke="#2a3e62" stroke-width="1.2"/>')
    # Grid lines
    for c in range(1, cols):
        x = c * cell
        lines.append(f'    <line x1="{x}" y1="0" x2="{x}" y2="{grid_h}" stroke="#2a3e62" stroke-width="1"/>')
    for r in range(1, rows):
        y = r * cell
        lines.append(f'    <line x1="0" y1="{y}" x2="{grid_w}" y2="{y}" stroke="#2a3e62" stroke-width="1"/>')

    # Cells
    for r in range(rows):
        for c in range(cols):
            tid = int(cells[r][c])
            x = c * cell
            y = r * cell
            fill = color.get(tid, "#ffffff")
            lines.append(f'    <rect x="{x}" y="{y}" width="{cell}" height="{cell}" fill="{fill}" fill-opacity="0.42"/>')
            label = type_name.get(tid, f"T{tid}")
            short = label[:10]
            lines.append(f'    <text x="{x+8}" y="{y+16}" font-family="Arial,sans-serif" font-size="7" fill="#1f365e">{esc(short)}</text>')

    # Start marker
    cx = sc * cell + cell // 2
    cy = sr * cell + cell // 2
    lines.append(f'    <circle cx="{cx}" cy="{cy}" r="16" fill="#2dbb70" stroke="#197a46" stroke-width="1.2"/>')
    lines.append(f'    <circle cx="{cx}" cy="{cy}" r="5.2" fill="#f4fff8" stroke="#197a46" stroke-width="0.8"/>')
    lines.append(f'    <text x="{cx-10}" y="{cy-24}" font-family="Arial,sans-serif" font-size="8" font-weight="bold" fill="#14573a">START</text>')

    lines.append("  </g>")
    lines.append(f'  <text x="12" y="{height-10}" font-family="Arial,sans-serif" font-size="5.2" fill="#2a3f6d">Copyright (C) Shreyan Mitra, 2024-2026.</text>')
    lines.append("</svg>")
    return "\n".join(lines) + "\n"


def write_svg_exports(data: dict, out_dir: Path) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    out_files: list[Path] = []
    square_types = data["square_types"]
    for scenario in data["scenarios"]:
        file_name = f"{safe_name(str(scenario['name']))}.svg"
        p = out_dir / file_name
        p.write_text(build_svg_for_scenario(square_types, scenario), encoding="utf-8")
        out_files.append(p)
    return out_files


def compile_block(data: dict) -> str:
    square_types = data["square_types"]
    scenarios = data["scenarios"]

    must(len(square_types) > 0, "square_types cannot be empty")
    must(len(scenarios) > 0, "scenarios cannot be empty")

    ids = [int(t["id"]) for t in square_types]
    must(len(set(ids)) == len(ids), "square_types ids must be unique")
    max_type_id = max(ids)
    must(max_type_id <= 31, "square type id must be <= 31")

    rewards = [0] * (max_type_id + 1)
    terminals = [0] * (max_type_id + 1)
    blocked = [0] * (max_type_id + 1)
    wait_steps = [0] * (max_type_id + 1)
    force = [-1] * (max_type_id + 1)

    for t in square_types:
        tid = int(t["id"])
        rewards[tid] = int(t["reward_on_enter"])
        terminals[tid] = 1 if bool(t["terminal"]) else 0
        blocked[tid] = 1 if bool(t["blocked"]) else 0
        wait_steps[tid] = int(t["wait_steps"])
        fa = t["force_action"]
        must(fa in FORCE_ACTION_TO_INT, f"invalid force_action '{fa}'")
        force[tid] = FORCE_ACTION_TO_INT[fa]

    id_bars: list[int] = []
    rows_list: list[int] = []
    cols_list: list[int] = []
    start_r: list[int] = []
    start_c: list[int] = []
    start_h: list[int] = []
    flat_grids: list[list[int]] = []

    for i, s in enumerate(scenarios):
        name = s["name"]
        id_bar = int(s["id_bars"])
        rows = int(s["rows"])
        cols = int(s["cols"])
        start = s["start"]
        cells = s["cells"]

        must(rows > 0 and cols > 0, f"{name}: rows/cols must be positive")
        must(rows <= 5 and cols <= 5, f"{name}: rows/cols must be <= 5")
        must(rows * cols <= 25, f"{name}: rows*cols must be <= 25 for current runtime")
        must(len(cells) == rows, f"{name}: cells row count mismatch")
        for r in range(rows):
            must(len(cells[r]) == cols, f"{name}: cells col count mismatch at row {r}")
            for c in range(cols):
                v = int(cells[r][c])
                must(v <= max_type_id, f"{name}: cell id {v} unknown")

        sr = int(start["row"])
        sc = int(start["col"])
        sh = int(start["heading"])
        must(0 <= sr < rows and 0 <= sc < cols, f"{name}: start out of bounds")
        must(0 <= sh <= 3, f"{name}: start heading must be 0..3")
        start_tid = int(cells[sr][sc])
        must(blocked[start_tid] == 0, f"{name}: start cannot be blocked square type")

        must(1 <= id_bar <= 7, f"{name}: id_bars must be 1..7")
        must(id_bar not in id_bars, f"{name}: duplicate id_bars {id_bar}")

        id_bars.append(id_bar)
        rows_list.append(rows)
        cols_list.append(cols)
        start_r.append(sr)
        start_c.append(sc)
        start_h.append(sh)
        flat_grids.append(flatten_and_pad(cells, rows, cols, 25))

    lines: list[str] = []
    lines.append(MARKER_START)
    lines.append(f"SCENARIO_COUNT = {len(scenarios)}")
    lines.append(f"SCENARIO_ID_BARS = {ed_list(id_bars)}")
    lines.append(f"SCENARIO_ROWS = {ed_list(rows_list)}")
    lines.append(f"SCENARIO_COLS = {ed_list(cols_list)}")
    lines.append(f"SCENARIO_START_R = {ed_list(start_r)}")
    lines.append(f"SCENARIO_START_C = {ed_list(start_c)}")
    lines.append(f"SCENARIO_START_H = {ed_list(start_h)}")
    lines.append(f"TYPE_REWARD = {ed_list(rewards)}")
    lines.append(f"TYPE_TERMINAL = {ed_list(terminals)}")
    lines.append(f"TYPE_BLOCKED = {ed_list(blocked)}")
    lines.append(f"TYPE_WAIT = {ed_list(wait_steps)}")
    lines.append(f"TYPE_FORCE = {ed_list(force)}")
    all_cells: list[int] = []
    for flat in flat_grids:
        all_cells.extend(flat)
    must(len(all_cells) <= 250, f"Flat grid has {len(all_cells)} cells; EdPy max Ed.List size is 250")
    lines.append(f"SCENARIO_GRID = Ed.List({len(all_cells)})")
    lines.append(f"for i in range({len(all_cells)}):")
    lines.append("    SCENARIO_GRID[i] = 0")
    for idx, val in enumerate(all_cells):
        if val != 0:
            lines.append(f"SCENARIO_GRID[{idx}] = {val}")
    lines.append(MARKER_END)
    return "\n".join(lines)


def replace_block(runtime_text: str, generated: str) -> str:
    s = runtime_text.find(MARKER_START)
    e = runtime_text.find(MARKER_END)
    must(s >= 0 and e >= 0 and e > s, "Could not locate generated block markers in runtime file.")
    e = e + len(MARKER_END)
    return runtime_text[:s] + generated + runtime_text[e:]


HP_DEFAULTS = {
    "alpha": 22,
    "gamma": 95,
    "epsilon": 28,
    "min_episodes": 18,
    "max_steps": 60,
    "turn_deg": 95,
    "cell_cm": 11,
}

HP_PATTERNS: list[tuple[str, str]] = [
    ("alpha",        "{v} * (tg - oq) // 100"),
    ("gamma",        "{v} * mn // 100"),
    ("epsilon",      "if rv < {v}:"),
    ("min_episodes", "if ep >= {v}:"),
    ("max_steps",    "elif step >= {v}:"),
]


def apply_hyperparams(code: str, hp: dict[str, int]) -> str:
    for key, template in HP_PATTERNS:
        old = template.format(v=HP_DEFAULTS[key])
        new = template.format(v=hp[key])
        if old != new:
            code = code.replace(old, new)
    old_drive = f"Ed.SPEED_5, {HP_DEFAULTS['turn_deg']}, {HP_DEFAULTS['cell_cm']})"
    new_drive = f"Ed.SPEED_5, {hp['turn_deg']}, {hp['cell_cm']})"
    if old_drive != new_drive:
        code = code.replace(old_drive, new_drive)
    return code


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compile scenario JSON into EdisonRL.py config block."
    )
    parser.add_argument("--input", required=True, help="Scenario JSON path")
    parser.add_argument("--runtime", required=True, help="EdisonRL.py path")
    parser.add_argument("--output", default="", help="Optional output runtime file path")
    parser.add_argument("--svg-out", default="", help="Optional SVG output directory")
    parser.add_argument("--no-svg", action="store_true", help="Disable SVG export")
    parser.add_argument("--alpha", type=int, default=HP_DEFAULTS["alpha"],
                        help=f"Learning rate x100 (default {HP_DEFAULTS['alpha']})")
    parser.add_argument("--gamma", type=int, default=HP_DEFAULTS["gamma"],
                        help=f"Discount factor x100 (default {HP_DEFAULTS['gamma']})")
    parser.add_argument("--epsilon", type=int, default=HP_DEFAULTS["epsilon"],
                        help=f"Exploration rate x100 (default {HP_DEFAULTS['epsilon']})")
    parser.add_argument("--min-episodes", type=int, default=HP_DEFAULTS["min_episodes"],
                        help=f"Training episodes before exploit (default {HP_DEFAULTS['min_episodes']})")
    parser.add_argument("--max-steps", type=int, default=HP_DEFAULTS["max_steps"],
                        help=f"Max steps per episode (default {HP_DEFAULTS['max_steps']})")
    parser.add_argument("--turn-deg", type=int, default=HP_DEFAULTS["turn_deg"],
                        help=f"Motor degrees for 90-deg turn (default {HP_DEFAULTS['turn_deg']})")
    parser.add_argument("--cell-cm", type=int, default=HP_DEFAULTS["cell_cm"],
                        help=f"Driving distance per cell in cm (default {HP_DEFAULTS['cell_cm']})")
    args = parser.parse_args()

    in_path = Path(args.input)
    runtime_path = Path(args.runtime)
    out_path = Path(args.output) if args.output else runtime_path

    data = json.loads(in_path.read_text(encoding="utf-8"))
    generated = compile_block(data)
    runtime_text = runtime_path.read_text(encoding="utf-8")
    updated = replace_block(runtime_text, generated)

    hp = {
        "alpha": args.alpha,
        "gamma": args.gamma,
        "epsilon": args.epsilon,
        "min_episodes": args.min_episodes,
        "max_steps": args.max_steps,
        "turn_deg": args.turn_deg,
        "cell_cm": args.cell_cm,
    }
    updated = apply_hyperparams(updated, hp)
    non_default = {k: v for k, v in hp.items() if v != HP_DEFAULTS[k]}
    if non_default:
        print(f"Hyperparameters overridden: {non_default}")

    out_path.write_text(updated, encoding="utf-8")

    generated_dir = runtime_path.parent / "generated"
    generated_dir.mkdir(parents=True, exist_ok=True)
    (generated_dir / "compiled_scenarios.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
    (generated_dir / "generated_block.txt").write_text(generated + "\n", encoding="utf-8")
    if not args.no_svg:
        svg_dir = Path(args.svg_out) if args.svg_out else (generated_dir / "svgs")
        exported = write_svg_exports(data, svg_dir)
        print(f"SVGs exported: {len(exported)} -> {svg_dir}")
    print("Scenario compiled successfully.")
    print(f"Runtime updated: {out_path}")


if __name__ == "__main__":
    main()
