# EdisonRL — EdPy / Edison V2
# Copyright (C) Shreyan Mitra, 2024-2026.
import Ed

Ed.EdisonVersion = Ed.V2
Ed.DistanceUnits = Ed.CM
Ed.Tempo = Ed.TEMPO_MEDIUM

# === GENERATED CONFIG START ===
SCENARIO_COUNT = 3
SCENARIO_ID_BARS = Ed.List(3, [1, 2, 3])
SCENARIO_ROWS = Ed.List(3, [4, 3, 5])
SCENARIO_COLS = Ed.List(3, [5, 3, 5])
SCENARIO_START_R = Ed.List(3, [3, 2, 4])
SCENARIO_START_C = Ed.List(3, [0, 1, 0])
SCENARIO_START_H = Ed.List(3, [0, 0, 0])
TYPE_REWARD = Ed.List(6, [-2, 80, -80, -40, 50, 100])
TYPE_TERMINAL = Ed.List(6, [0, 1, 1, 0, 1, 1])
TYPE_BLOCKED = Ed.List(6, [0, 0, 0, 1, 0, 0])
TYPE_WAIT = Ed.List(6, [0, 0, 0, 0, 0, 0])
TYPE_FORCE = Ed.List(6, [-1, -1, -1, -1, -1, -1])
SCENARIO_GRID = Ed.List(75)
for i in range(75):
    SCENARIO_GRID[i] = 0
SCENARIO_GRID[7] = 3
SCENARIO_GRID[12] = 2
SCENARIO_GRID[19] = 1
SCENARIO_GRID[29] = 1
SCENARIO_GRID[31] = 3
SCENARIO_GRID[33] = 2
SCENARIO_GRID[57] = 4
SCENARIO_GRID[62] = 3
SCENARIO_GRID[72] = 5
# === GENERATED CONFIG END ===

Q = Ed.List(75)
pos = Ed.List(3)


def do_action(ap, aa, spd, td, cm):
    if aa == 1:
        Ed.Drive(Ed.SPIN_LEFT, spd, td)
        ah = ap[2] - 1
        if ah < 0:
            ah = 3
        ap[2] = ah
        return
    if aa == 2:
        Ed.Drive(Ed.SPIN_RIGHT, spd, td)
        ah = ap[2] + 1
        if ah > 3:
            ah = 0
        ap[2] = ah
        return
    dr = 0
    dc = 0
    ah = ap[2]
    if ah == 0:
        dr = -1
    if ah == 1:
        dc = 1
    if ah == 2:
        dr = 1
    if ah == 3:
        dc = -1
    Ed.Drive(Ed.FORWARD, spd, cm)
    ap[0] = ap[0] + dr
    ap[1] = ap[1] + dc


def wait_reset():
    Ed.PlayBeep()
    Ed.TimeWait(400, Ed.TIME_MILLISECONDS)
    Ed.ReadKeypad()
    Ed.ReadClapSensor()
    while True:
        Ed.LeftLed(Ed.ON)
        Ed.TimeWait(200, Ed.TIME_MILLISECONDS)
        Ed.LeftLed(Ed.OFF)
        Ed.TimeWait(200, Ed.TIME_MILLISECONDS)
        if Ed.ReadKeypad() == Ed.KEYPAD_ROUND:
            Ed.PlayBeep()
            return
        if Ed.ReadClapSensor() == Ed.CLAP_DETECTED:
            Ed.TimeWait(300, Ed.TIME_MILLISECONDS)
            Ed.ReadClapSensor()
            Ed.PlayBeep()
            return


Ed.LineTrackerLed(Ed.ON)
Ed.PlayBeep()
while True:
    rr = Ed.ReadLineTracker()
    if rr >= 410:
        if rr <= 490:
            break
    Ed.PlayBeep()
    Ed.TimeWait(200, Ed.TIME_MILLISECONDS)

Ed.StartCountDown(4, Ed.TIME_SECONDS)
pr = 0
act = 0
while Ed.ReadCountDown(Ed.TIME_SECONDS) > 0:
    Ed.Drive(Ed.FORWARD, Ed.SPEED_5, 1)
    oob = 0
    if Ed.ReadLineState() == Ed.LINE_ON_BLACK:
        oob = 1
    if oob == 1:
        if pr == 0:
            act = act + 1
    pr = oob

Ed.PlayBeep()
si = -1
i = 0
while i < SCENARIO_COUNT:
    if SCENARIO_ID_BARS[i] == act:
        si = i
    i = i + 1

if si < 0:
    while True:
        Ed.PlayBeep()
        Ed.TimeWait(500, Ed.TIME_MILLISECONDS)

Ed.PlayMyBeep(2666)
Ed.TimeWait(100, Ed.TIME_MILLISECONDS)
Ed.PlayMyBeep(2000)
Ed.TimeWait(100, Ed.TIME_MILLISECONDS)
Ed.PlayMyBeep(1333)
wait_reset()

NR = SCENARIO_ROWS[si]
NC = SCENARIO_COLS[si]

for i in range(75):
    Q[i] = 0

done = 1
mode = 0
ep = -1
step = 0
cwait = 0

while True:
    if done == 1:
        if ep >= 0:
            wait_reset()
        if mode == 0:
            ep = ep + 1
            if ep >= 18:
                Ed.PlayBeep()
                Ed.TimeWait(80, Ed.TIME_MILLISECONDS)
                Ed.PlayBeep()
                Ed.TimeWait(80, Ed.TIME_MILLISECONDS)
                Ed.PlayBeep()
                Ed.LeftLed(Ed.ON)
                Ed.RightLed(Ed.ON)
                Ed.TimeWait(500, Ed.TIME_MILLISECONDS)
                Ed.LeftLed(Ed.OFF)
                Ed.RightLed(Ed.OFF)
                mode = 1
        pos[0] = SCENARIO_START_R[si]
        pos[1] = SCENARIO_START_C[si]
        pos[2] = SCENARIO_START_H[si]
        step = 0
        done = 0
        cwait = 0

    rr = pos[0]
    cc = pos[1]
    hh = pos[2]
    ct = SCENARIO_GRID[si * 25 + rr * NC + cc]

    if TYPE_TERMINAL[ct] == 1:
        if TYPE_REWARD[ct] >= 0:
            Ed.PlayMyBeep(2666)
            Ed.TimeWait(100, Ed.TIME_MILLISECONDS)
            Ed.PlayMyBeep(2000)
            Ed.TimeWait(100, Ed.TIME_MILLISECONDS)
            Ed.PlayMyBeep(1333)
        else:
            Ed.PlayMyBeep(4000)
            Ed.TimeWait(100, Ed.TIME_MILLISECONDS)
            Ed.PlayMyBeep(5333)
            Ed.TimeWait(100, Ed.TIME_MILLISECONDS)
            Ed.PlayMyBeep(8000)
        done = 1
    elif step >= 60:
        Ed.PlayBeep()
        done = 1
    elif cwait > 0:
        cwait = cwait - 1
        Ed.TimeWait(100, Ed.TIME_MILLISECONDS)
        step = step + 1
    else:
        sidx = rr * NC + cc
        fl = sidx * 3
        act = 0
        mn = Q[fl]
        oob = Q[fl + 1]
        if oob > mn:
            mn = oob
            act = 1
        oob = Q[fl + 2]
        if oob > mn:
            act = 2

        frc = TYPE_FORCE[ct]
        if frc >= 0:
            act = frc
        elif mode == 0:
            rv = Ed.ReadLineTracker() + step * 17 + ep * 9 + sidx
            while rv >= 100:
                rv = rv - 100
            if rv < 28:
                act = Ed.ReadLineTracker() + step + ep + hh
                while act >= 3:
                    act = act - 3

        pr = rr
        pc = cc
        do_action(pos, act, Ed.SPEED_5, 95, 11)
        rr2 = pos[0]
        cc2 = pos[1]

        oob = 0
        if rr2 < 0:
            oob = 1
        if rr2 >= NR:
            oob = 1
        if cc2 < 0:
            oob = 1
        if cc2 >= NC:
            oob = 1

        rew = -2
        tn = 0
        if oob == 1:
            rew = -80
            tn = 1
        else:
            ct2 = SCENARIO_GRID[si * 25 + rr2 * NC + cc2]
            rew = TYPE_REWARD[ct2]
            tn = TYPE_TERMINAL[ct2]
            if TYPE_BLOCKED[ct2] == 1:
                pos[0] = pr
                pos[1] = pc
                rr2 = pr
                cc2 = pc
            else:
                cwait = TYPE_WAIT[ct2]

        if mode == 0:
            mn = 0
            if tn == 0:
                fl = (rr2 * NC + cc2) * 3
                mn = Q[fl]
                oob = Q[fl + 1]
                if oob > mn:
                    mn = oob
                oob = Q[fl + 2]
                if oob > mn:
                    mn = oob
            fl = sidx * 3 + act
            oq = Q[fl]
            tg = rew + 95 * mn // 100
            nq = oq + 22 * (tg - oq) // 100
            Q[fl] = nq

        step = step + 1
        if tn == 1:
            if rew >= 0:
                Ed.PlayMyBeep(2666)
                Ed.TimeWait(100, Ed.TIME_MILLISECONDS)
                Ed.PlayMyBeep(2000)
                Ed.TimeWait(100, Ed.TIME_MILLISECONDS)
                Ed.PlayMyBeep(1333)
            else:
                Ed.PlayMyBeep(4000)
                Ed.TimeWait(100, Ed.TIME_MILLISECONDS)
                Ed.PlayMyBeep(5333)
                Ed.TimeWait(100, Ed.TIME_MILLISECONDS)
                Ed.PlayMyBeep(8000)
            done = 1
