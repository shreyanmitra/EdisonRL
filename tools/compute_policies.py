"""
Offline value iteration helper for Edison grid MDPs.
Optional utility for offline planning/reference policies.
Run with Python 3 to generate policy arrays.

Copyright (C) Shreyan Mitra, 2024-2026.

Actions: 0 = FORWARD, 1 = SPIN_LEFT, 2 = SPIN_RIGHT
Heading: 0=N, 1=E, 2=S, 3=W
State index: ((r * COLS + c) * 4 + h)
"""
from __future__ import annotations

EMPTY = 0
GOAL = 1
LAVA = 2
INVALID = 3
GOAL_SECOND = 4
GOAL_MAIN = 5

GAMMA = 0.99
STEP_COST = -1

MAX_ITERS = 8000


def dr_dc(h: int) -> tuple[int, int]:
    if h == 0:
        return -1, 0
    if h == 1:
        return 0, 1
    if h == 2:
        return 1, 0
    return 0, -1


def terminal_reward(grid: list[list[int]], r: int, c: int) -> float:
    t = grid[r][c]
    if t == GOAL:
        return 60.0
    if t == GOAL_SECOND:
        return 40.0
    if t == GOAL_MAIN:
        return 100.0
    if t == LAVA:
        return -80.0
    return 0.0


def is_invalid(grid: list[list[int]], r: int, c: int) -> bool:
    rows, cols = len(grid), len(grid[0])
    if r < 0 or r >= rows or c < 0 or c >= cols:
        return True
    return grid[r][c] == INVALID


def is_terminal_cell(grid: list[list[int]], r: int, c: int) -> bool:
    t = grid[r][c]
    return t in (GOAL, LAVA, GOAL_SECOND, GOAL_MAIN)


def state_index(cols: int, r: int, c: int, h: int) -> int:
    return (r * cols + c) * 4 + h


def value_iteration(grid: list[list[int]]):
    rows, cols = len(grid), len(grid[0])
    n_states = rows * cols * 4
    V = [0.0] * n_states
    policy = [0] * n_states

    for _ in range(MAX_ITERS):
        delta = 0.0
        newV = [0.0] * n_states
        new_pol = policy[:]

        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == INVALID:
                    continue
                for h in range(4):
                    s = state_index(cols, r, c, h)
                    if is_terminal_cell(grid, r, c):
                        newV[s] = 0.0
                        new_pol[s] = 0
                        continue

                    best_val = float("-inf")
                    best_a = 0

                    for a in range(3):
                        if a == 1:
                            nh = (h + 3) % 4
                            ns = state_index(cols, r, c, nh)
                            q = STEP_COST + GAMMA * V[ns]
                        elif a == 2:
                            nh = (h + 1) % 4
                            ns = state_index(cols, r, c, nh)
                            q = STEP_COST + GAMMA * V[ns]
                        else:
                            dr, dc = dr_dc(h)
                            nr, nc = r + dr, c + dc
                            if is_invalid(grid, nr, nc):
                                ns = state_index(cols, r, c, h)
                                q = STEP_COST + GAMMA * V[ns]
                            elif is_terminal_cell(grid, nr, nc):
                                q = terminal_reward(grid, nr, nc)
                            else:
                                ns = state_index(cols, nr, nc, h)
                                q = STEP_COST + GAMMA * V[ns]

                        if q > best_val:
                            best_val = q
                            best_a = a

                    newV[s] = best_val
                    new_pol[s] = best_a
                    delta = max(delta, abs(newV[s] - V[s]))

        V = newV
        policy = new_pol
        if delta < 1e-5:
            break

    return V, policy


def edpy_list(name: str, values: list[int], per_line: int = 14) -> str:
    lines = []
    for i in range(0, len(values), per_line):
        chunk = values[i : i + per_line]
        lines.append("        " + ", ".join(str(x) for x in chunk) + ",")
    inner = "\n".join(lines)
    return f"{name} = Ed.List({len(values)}, [\n{inner}\n    ])"


def main():
    grid1 = [
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        [EMPTY, EMPTY, INVALID, EMPTY, EMPTY],
        [EMPTY, EMPTY, LAVA, EMPTY, EMPTY],
        [EMPTY, EMPTY, EMPTY, EMPTY, GOAL],
    ]
    grid2 = [
        [EMPTY, EMPTY, EMPTY],
        [EMPTY, GOAL, EMPTY],
        [INVALID, EMPTY, LAVA],
    ]
    grid3 = [
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        [EMPTY, EMPTY, GOAL_SECOND, EMPTY, EMPTY],
        [EMPTY, EMPTY, INVALID, EMPTY, EMPTY],
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        [EMPTY, EMPTY, GOAL_MAIN, EMPTY, EMPTY],
    ]

    grids = [("GRID1", grid1), ("GRID2", grid2), ("GRID3", grid3)]
    for name, g in grids:
        _, pol = value_iteration(g)
        n = len(g) * len(g[0]) * 4
        print(f"\n# --- {name} ({n} states) ---")
        print(edpy_list(f"POLICY_{name}", pol[:n]))


if __name__ == "__main__":
    main()
