// EdisonRL Grid Builder — Copyright (C) Shreyan Mitra, 2024-2026.

const state = {
  square_types: [
    { id: 0, name: "Empty", reward_on_enter: -2, terminal: false, blocked: false, wait_steps: 0, force_action: null, color: "#ffffff" },
    { id: 1, name: "Goal", reward_on_enter: 80, terminal: true, blocked: false, wait_steps: 0, force_action: null, color: "#ffe69a" },
    { id: 2, name: "Lava", reward_on_enter: -80, terminal: true, blocked: false, wait_steps: 0, force_action: null, color: "#ffb8a8" },
    { id: 3, name: "Invalid", reward_on_enter: -40, terminal: false, blocked: true, wait_steps: 0, force_action: null, color: "#d9dce3" },
  ],
  scenarios: [
    {
      name: "Custom1",
      id_bars: 1,
      rows: 4,
      cols: 5,
      start: { row: 3, col: 0, heading: 0 },
      cells: [
        [0, 0, 0, 0, 0],
        [0, 0, 3, 0, 0],
        [0, 0, 2, 0, 0],
        [0, 0, 0, 0, 1],
      ],
    },
  ],
  selectedScenario: 0,
};

let selectedPaintType = 0;

// ── DOM helpers ──

const byId = (id) => document.getElementById(id);
const MARKER_START = "# === GENERATED CONFIG START ===";
const MARKER_END = "# === GENERATED CONFIG END ===";

// ── Toast status system ──

let toastTimer = null;

function setStatus(msg, type) {
  if (!type) type = "info";
  const toast = byId("statusToast");
  toast.textContent = msg;
  toast.className = "toast " + type + " visible";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove("visible");
  }, 6000);
}

// ── Runtime loading ──

async function loadCurrentRuntime() {
  if (window.location.protocol === "file:") {
    if (typeof BUNDLED_RUNTIME === "string" && BUNDLED_RUNTIME.indexOf(MARKER_START) >= 0) {
      byId("runtimeInput").value = BUNDLED_RUNTIME;
      setStatus("Runtime loaded from bundled template (offline mode).", "success");
      return true;
    }
    byId("advancedSection").open = true;
    setStatus("Offline mode: upload EdisonRL.py using the button below.", "info");
    return false;
  }

  var here = new URL(window.location.href);
  var candidates = [
    new URL("../EdisonRL.py", here).href,
    new URL("./EdisonRL.py", here).href,
    new URL("./runtime-template.py", here).href,
    new URL("/EdisonRL.py", here).href,
  ];

  var lastError = "unknown";
  for (var i = 0; i < candidates.length; i++) {
    var url = candidates[i];
    try {
      var r = await fetch(url, { cache: "no-store" });
      if (!r.ok) { lastError = url + " -> HTTP " + r.status; continue; }
      var text = await r.text();
      if (!text || !text.trim()) { lastError = url + " -> empty"; continue; }
      if (text.indexOf(MARKER_START) < 0) { lastError = url + " -> missing markers"; continue; }
      byId("runtimeInput").value = text;
      setStatus("Runtime loaded successfully.", "success");
      return true;
    } catch (e) {
      lastError = url + " -> " + e.message;
    }
  }

  if (typeof BUNDLED_RUNTIME === "string" && BUNDLED_RUNTIME.indexOf(MARKER_START) >= 0) {
    byId("runtimeInput").value = BUNDLED_RUNTIME;
    setStatus("Runtime loaded from bundled fallback.", "success");
    return true;
  }

  setStatus("Could not load runtime (" + lastError + "). Upload manually.", "error");
  byId("advancedSection").open = true;
  return false;
}

// ── Type helpers ──

function colorForType(id) {
  var t = state.square_types.find(function (x) { return x.id === id; });
  return t ? (t.color || "#ffffff") : "#ffffff";
}

function typeNameForId(id) {
  var t = state.square_types.find(function (x) { return x.id === id; });
  return t ? t.name : "T" + id;
}

// ── Render: paint swatches ──

function renderPaintSwatches() {
  var container = byId("paintSwatches");
  container.innerHTML = "";
  state.square_types.slice().sort(function (a, b) { return a.id - b.id; }).forEach(function (t) {
    var swatch = document.createElement("div");
    swatch.className = "swatch" + (selectedPaintType === t.id ? " active" : "");
    swatch.innerHTML =
      '<span class="swatch-color" style="background:' + (t.color || "#ffffff") + '"></span>' +
      '<span class="swatch-label">' + t.id + " " + escHtml(t.name) + "</span>";
    swatch.addEventListener("click", function () {
      selectedPaintType = t.id;
      renderPaintSwatches();
    });
    container.appendChild(swatch);
  });
}

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Render: type table ──

function renderTypeTable() {
  var tbody = byId("typesTable").querySelector("tbody");
  tbody.innerHTML = "";
  state.square_types.slice().sort(function (a, b) { return a.id - b.id; }).forEach(function (t) {
    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td><input data-k="id" type="number" value="' + t.id + '" min="0" max="31"></td>' +
      '<td><input data-k="name" value="' + escHtml(t.name) + '"></td>' +
      '<td><input data-k="reward_on_enter" type="number" value="' + t.reward_on_enter + '"></td>' +
      '<td><input data-k="terminal" type="checkbox" ' + (t.terminal ? "checked" : "") + "></td>" +
      '<td><input data-k="blocked" type="checkbox" ' + (t.blocked ? "checked" : "") + "></td>" +
      '<td><input data-k="wait_steps" type="number" min="0" max="20" value="' + t.wait_steps + '"></td>' +
      "<td>" +
        '<select data-k="force_action">' +
          '<option value="">none</option>' +
          '<option value="forward"' + (t.force_action === "forward" ? " selected" : "") + ">forward</option>" +
          '<option value="spin_left"' + (t.force_action === "spin_left" ? " selected" : "") + ">spin_left</option>" +
          '<option value="spin_right"' + (t.force_action === "spin_right" ? " selected" : "") + ">spin_right</option>" +
        "</select>" +
      "</td>" +
      '<td><input data-k="color" type="color" value="' + (t.color || "#ffffff") + '"></td>' +
      '<td><button class="del">' + _iconSvg("trash-2") + '</button></td>';

    tr.querySelectorAll("input,select").forEach(function (el) {
      el.addEventListener("change", function () {
        var k = el.dataset.k;
        if (k === "terminal" || k === "blocked") t[k] = !!el.checked;
        else if (k === "id" || k === "reward_on_enter" || k === "wait_steps") t[k] = Number(el.value);
        else if (k === "force_action") t[k] = el.value || null;
        else t[k] = el.value;
        renderPaintSwatches();
        renderGrid();
      });
    });
    tr.querySelector(".del").addEventListener("click", function () {
      state.square_types = state.square_types.filter(function (x) { return x !== t; });
      renderAll();
    });
    tbody.appendChild(tr);
  });
}

// ── Render: scenario cells ──

function ensureScenarioCells(sc) {
  while (sc.cells.length < sc.rows) sc.cells.push(Array(sc.cols).fill(0));
  if (sc.cells.length > sc.rows) sc.cells = sc.cells.slice(0, sc.rows);
  sc.cells = sc.cells.map(function (row) {
    var r = row.slice(0, sc.cols);
    while (r.length < sc.cols) r.push(0);
    return r;
  });
}

// ── Render: scenario select ──

function renderScenarioSelect() {
  var sel = byId("scenarioSelect");
  sel.innerHTML = "";
  state.scenarios.forEach(function (sc, i) {
    var o = document.createElement("option");
    o.value = String(i);
    o.textContent = (i + 1) + ": " + sc.name;
    sel.appendChild(o);
  });
  sel.value = String(state.selectedScenario);
}

function bindScenarioFields() {
  var sc = state.scenarios[state.selectedScenario];
  byId("scName").value = sc.name;
  byId("scBars").value = sc.id_bars;
  byId("scRows").value = sc.rows;
  byId("scCols").value = sc.cols;
  byId("scStartR").value = sc.start.row;
  byId("scStartC").value = sc.start.col;
  byId("scStartH").value = sc.start.heading;
}

function updateScenarioFromFields() {
  var sc = state.scenarios[state.selectedScenario];
  sc.name = byId("scName").value || "Scenario";
  sc.id_bars = Number(byId("scBars").value || 1);
  sc.rows = Math.max(1, Math.min(5, Number(byId("scRows").value || 1)));
  sc.cols = Math.max(1, Math.min(5, Number(byId("scCols").value || 1)));
  sc.start.row = Number(byId("scStartR").value || 0);
  sc.start.col = Number(byId("scStartC").value || 0);
  sc.start.heading = Number(byId("scStartH").value || 0);
  ensureScenarioCells(sc);
}

// ── Render: grid ──

function renderGrid() {
  var sc = state.scenarios[state.selectedScenario];
  ensureScenarioCells(sc);
  var grid = byId("gridCanvas");
  grid.style.gridTemplateColumns = "repeat(" + sc.cols + ", 52px)";
  grid.innerHTML = "";
  for (var r = 0; r < sc.rows; r++) {
    for (var c = 0; c < sc.cols; c++) {
      var tid = sc.cells[r][c];
      var btn = document.createElement("button");
      btn.className = "cell";
      if (r === sc.start.row && c === sc.start.col) btn.classList.add("start-cell");
      btn.style.background = colorForType(tid);
      btn.textContent = typeNameForId(tid).slice(0, 5);
      btn.title = "Row " + r + ", Col " + c + " \u2014 " + typeNameForId(tid);
      (function (rr, cc) {
        btn.addEventListener("click", function () {
          sc.cells[rr][cc] = selectedPaintType;
          renderGrid();
        });
      })(r, c);
      grid.appendChild(btn);
    }
  }
}

// ── Render all ──

function renderAll() {
  renderTypeTable();
  renderPaintSwatches();
  renderScenarioSelect();
  bindScenarioFields();
  renderGrid();
}

// ── Export / Import ──

function scenarioPayload() {
  return {
    metadata: { name: "Exported from web-builder", version: 1 },
    square_types: state.square_types.map(function (t) {
      return {
        id: Number(t.id),
        name: t.name,
        reward_on_enter: Number(t.reward_on_enter),
        terminal: !!t.terminal,
        blocked: !!t.blocked,
        wait_steps: Number(t.wait_steps),
        force_action: t.force_action || null,
        color_hex: t.color || "#ffffff",
      };
    }),
    scenarios: state.scenarios,
  };
}

function exportJson() {
  var text = JSON.stringify(scenarioPayload(), null, 2);
  downloadTextFile("scenario.json", text, "application/json");
  setStatus("Exported scenario.json", "success");
}

function importJson(file) {
  var fr = new FileReader();
  fr.onload = function () {
    try {
      var data = JSON.parse(String(fr.result));
      state.square_types = (data.square_types || []).map(function (t) {
        return Object.assign({}, t, { color: t.color || t.color_hex || "#ffffff" });
      });
      state.scenarios = data.scenarios || [];
      if (!state.square_types.length || !state.scenarios.length) throw new Error("Missing data");
      state.selectedScenario = 0;
      selectedPaintType = state.square_types[0] ? state.square_types[0].id : 0;
      renderAll();
      setStatus("Imported scenario JSON.", "success");
    } catch (e) {
      setStatus("Import failed: " + e.message, "error");
    }
  };
  fr.readAsText(file);
}

// ── Compile helpers ──

function must(cond, msg) {
  if (!cond) throw new Error(msg);
}

function edList(values) {
  return "Ed.List(" + values.length + ", [" + values.join(", ") + "])";
}

function escXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeFileName(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "scenario";
}

function typeColorMap(squareTypes) {
  var fallback = ["#ffffff", "#ffe69a", "#ffb8a8", "#d9dce3", "#c9f4db", "#dff3ff"];
  var m = new Map();
  squareTypes.forEach(function (t) {
    var id = Number(t.id);
    var c = t.color || t.color_hex;
    if (typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c)) m.set(id, c);
    else m.set(id, fallback[id % fallback.length]);
  });
  return m;
}

function buildScenarioSvg(squareTypes, scenario) {
  var rows = Number(scenario.rows);
  var cols = Number(scenario.cols);
  var bars = Number(scenario.id_bars);
  var name = String(scenario.name || "Scenario");
  var sr = Number(scenario.start.row);
  var sc = Number(scenario.start.col);
  var sh = Number(scenario.start.heading || 0);
  var cells = scenario.cells;

  var cell = 110;
  var numW = 16;
  var left = 30 + numW;
  var top = 96;
  var gridW = cols * cell;
  var gridH = rows * cell;

  var usedTypes = new Set();
  for (var ri = 0; ri < rows; ri++)
    for (var ci = 0; ci < cols; ci++)
      usedTypes.add(Number(cells[ri][ci]));
  var legendTypes = squareTypes.filter(function (t) { return usedTypes.has(Number(t.id)); });
  var legendH = Math.max(0, legendTypes.length * 14 + 20);

  var width = Math.max(420, left + gridW + 30);
  var height = Math.max(320, top + gridH + numW + 14 + legendH + 30);

  var colors = typeColorMap(squareTypes);
  var typeNames = new Map(squareTypes.map(function (t) { return [Number(t.id), String(t.name)]; }));

  var font = "Arial,Helvetica,sans-serif";
  var L = [];
  L.push('<?xml version="1.0" encoding="UTF-8"?>');
  L.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + width + 'mm" height="' + height + 'mm" viewBox="0 0 ' + width + " " + height + '">');
  L.push("  <title>" + escXml(name) + " (ID bars: " + bars + ")</title>");

  L.push("  <defs>");
  L.push('    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">');
  L.push('      <stop offset="0%" stop-color="#eef3fb"/>');
  L.push('      <stop offset="100%" stop-color="#dce5f4"/>');
  L.push("    </linearGradient>");
  L.push("  </defs>");
  L.push('  <rect width="100%" height="100%" fill="url(#bgGrad)"/>');

  L.push('  <text x="14" y="18" font-family="' + font + '" font-size="12" font-weight="bold" fill="#1a2e50">' + escXml(name) + "</text>");
  L.push('  <text x="14" y="30" font-family="' + font + '" font-size="6.5" fill="#4a5e80">Print at 100% scale. Each cell = 110 mm. ID bars: ' + bars + ".</text>");

  L.push('  <rect x="14" y="38" width="' + (width - 28) + '" height="38" rx="6" fill="#ffffff" stroke="#6b8cc4" stroke-width="0.7"/>');
  L.push('  <text x="52" y="52" font-family="' + font + '" font-size="6" font-weight="bold" fill="#2b4976">STEP 1</text>');
  L.push('  <text x="52" y="62" font-family="' + font + '" font-size="5.5" fill="#4a5e80">Place Edison line sensor on green circle, facing up.</text>');
  L.push('  <circle cx="32" cy="57" r="10" fill="#22c55e" stroke="#15803d" stroke-width="0.8"/>');
  L.push('  <circle cx="32" cy="57" r="3.5" fill="#f0fdf4" stroke="#15803d" stroke-width="0.5"/>');

  var barBlockX = width - 28 - bars * 11 - 46;
  L.push('  <text x="' + (barBlockX - 2) + '" y="52" font-family="' + font + '" font-size="6" font-weight="bold" fill="#2b4976">STEP 2</text>');
  L.push('  <text x="' + (barBlockX - 2) + '" y="62" font-family="' + font + '" font-size="5.5" fill="#4a5e80">Scan bars (' + bars + "):</text>");
  var bx = width - 28 - bars * 11;
  for (var i = 0; i < bars; i++) {
    L.push('  <rect x="' + bx + '" y="44" width="4" height="24" rx="1" fill="#111827"/>');
    bx += 11;
  }

  L.push('  <rect x="' + (left - 2) + '" y="' + (top - 2) + '" width="' + (gridW + 4) + '" height="' + (gridH + 4) + '" rx="3" fill="none" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="6 3"/>');

  L.push('  <g transform="translate(' + left + "," + top + ')">');
  L.push('    <rect x="0" y="0" width="' + gridW + '" height="' + gridH + '" fill="#ffffff" stroke="#334155" stroke-width="1.2" rx="2"/>');

  for (var c2 = 1; c2 < cols; c2++) {
    var x = c2 * cell;
    L.push('    <line x1="' + x + '" y1="0" x2="' + x + '" y2="' + gridH + '" stroke="#cbd5e1" stroke-width="0.8"/>');
  }
  for (var r2 = 1; r2 < rows; r2++) {
    var y = r2 * cell;
    L.push('    <line x1="0" y1="' + y + '" x2="' + gridW + '" y2="' + y + '" stroke="#cbd5e1" stroke-width="0.8"/>');
  }

  for (var r3 = 0; r3 < rows; r3++) {
    for (var c3 = 0; c3 < cols; c3++) {
      var tid = Number(cells[r3][c3]);
      var x2 = c3 * cell;
      var y2 = r3 * cell;
      var fill = colors.get(tid) || "#ffffff";
      var label = (typeNames.get(tid) || "T" + tid).slice(0, 8);
      var m = 3;
      L.push('    <rect x="' + (x2 + m) + '" y="' + (y2 + m) + '" width="' + (cell - m * 2) + '" height="' + (cell - m * 2) + '" rx="6" fill="' + fill + '" fill-opacity="0.55" stroke="' + fill + '" stroke-width="0.8"/>');
      L.push('    <text x="' + (x2 + cell / 2) + '" y="' + (y2 + cell / 2 + 3) + '" font-family="' + font + '" font-size="9" font-weight="bold" fill="#1e293b" text-anchor="middle" opacity="0.7">' + escXml(label) + "</text>");
    }
  }

  var cx = sc * cell + Math.floor(cell / 2);
  var cy = sr * cell + Math.floor(cell / 2);
  L.push('    <circle cx="' + cx + '" cy="' + cy + '" r="20" fill="#22c55e" fill-opacity="0.25" stroke="#15803d" stroke-width="1"/>');
  L.push('    <circle cx="' + cx + '" cy="' + cy + '" r="12" fill="#22c55e" stroke="#15803d" stroke-width="1.2"/>');
  L.push('    <circle cx="' + cx + '" cy="' + cy + '" r="4" fill="#f0fdf4" stroke="#15803d" stroke-width="0.6"/>');

  var arrowDx = [0, 1, 0, -1];
  var arrowDy = [-1, 0, 1, 0];
  var ax = cx + arrowDx[sh] * 28;
  var ay = cy + arrowDy[sh] * 28;
  L.push('    <line x1="' + cx + '" y1="' + cy + '" x2="' + ax + '" y2="' + ay + '" stroke="#15803d" stroke-width="2" stroke-linecap="round" marker-end="url(#arrowhead)"/>');
  L.push("  </g>");

  L.push("  <defs>");
  L.push('    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">');
  L.push('      <path d="M0,0 L8,3 L0,6 Z" fill="#15803d"/>');
  L.push("    </marker>");
  L.push("  </defs>");

  for (var ci2 = 0; ci2 < cols; ci2++) {
    var lx = left + ci2 * cell + cell / 2;
    L.push('  <text x="' + lx + '" y="' + (top - 6) + '" font-family="' + font + '" font-size="6" fill="#64748b" text-anchor="middle" font-weight="bold">' + ci2 + "</text>");
  }
  for (var ri2 = 0; ri2 < rows; ri2++) {
    var ly = top + ri2 * cell + cell / 2 + 2;
    L.push('  <text x="' + (left - 8) + '" y="' + ly + '" font-family="' + font + '" font-size="6" fill="#64748b" text-anchor="middle" font-weight="bold">' + ri2 + "</text>");
  }

  if (legendTypes.length > 0) {
    var legendY = top + gridH + numW + 10;
    L.push('  <text x="' + left + '" y="' + legendY + '" font-family="' + font + '" font-size="7" font-weight="bold" fill="#334155">LEGEND</text>');
    legendTypes.forEach(function (t, idx) {
      var ly2 = legendY + 10 + idx * 14;
      var lc = colors.get(Number(t.id)) || "#ffffff";
      L.push('  <rect x="' + left + '" y="' + (ly2 - 7) + '" width="12" height="12" rx="3" fill="' + lc + '" stroke="#94a3b8" stroke-width="0.5"/>');
      L.push('  <text x="' + (left + 17) + '" y="' + (ly2 + 3) + '" font-family="' + font + '" font-size="6.5" fill="#334155">' + escXml(t.name) + " (ID " + t.id + ", reward " + t.reward_on_enter + (t.terminal ? ", terminal" : "") + (t.blocked ? ", blocked" : "") + ")</text>");
    });
  }

  L.push('  <text x="' + (width - 14) + '" y="' + (height - 8) + '" font-family="' + font + '" font-size="5" fill="#94a3b8" text-anchor="end">Copyright (C) Shreyan Mitra, 2024-2026.</text>');
  L.push("</svg>");
  return L.join("\n");
}

function downloadTextFile(name, text, mime) {
  var blob = new Blob([text], { type: mime });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function compileGeneratedBlock(data) {
  var forceMap = { "": -1, "null": -1, "forward": 0, "spin_left": 1, "spin_right": 2 };
  var types = data.square_types;
  var scenarios = data.scenarios;
  must(types.length > 0, "square_types cannot be empty");
  must(scenarios.length > 0, "scenarios cannot be empty");

  var ids = types.map(function (t) { return Number(t.id); });
  must(new Set(ids).size === ids.length, "square type ids must be unique");
  var maxTypeId = Math.max.apply(null, ids);

  var rewards = Array(maxTypeId + 1).fill(0);
  var terminals = Array(maxTypeId + 1).fill(0);
  var blocked = Array(maxTypeId + 1).fill(0);
  var waits = Array(maxTypeId + 1).fill(0);
  var forced = Array(maxTypeId + 1).fill(-1);

  types.forEach(function (t) {
    var id = Number(t.id);
    rewards[id] = Number(t.reward_on_enter);
    terminals[id] = t.terminal ? 1 : 0;
    blocked[id] = t.blocked ? 1 : 0;
    waits[id] = Number(t.wait_steps || 0);
    var f = t.force_action == null ? "" : String(t.force_action);
    must(forceMap.hasOwnProperty(f), "invalid force_action for type " + id);
    forced[id] = forceMap[f];
  });

  var idBars = [], rows = [], cols = [], startR = [], startC = [], startH = [], flat = [];

  scenarios.forEach(function (sc) {
    var r = Number(sc.rows);
    var c = Number(sc.cols);
    var bars = Number(sc.id_bars);
    must(r >= 1 && r <= 5 && c >= 1 && c <= 5, sc.name + ": rows/cols must be 1..5");
    must(r * c <= 25, sc.name + ": rows*cols must be <=25");
    must(idBars.indexOf(bars) < 0, sc.name + ": duplicate id_bars " + bars);
    idBars.push(bars);
    rows.push(r);
    cols.push(c);
    startR.push(Number(sc.start.row));
    startC.push(Number(sc.start.col));
    startH.push(Number(sc.start.heading));

    must(sc.cells.length === r, sc.name + ": row count mismatch");
    var f = [];
    for (var rr = 0; rr < r; rr++) {
      must(sc.cells[rr].length === c, sc.name + ": col count mismatch row " + rr);
      for (var cc = 0; cc < c; cc++) f.push(Number(sc.cells[rr][cc]));
    }
    while (f.length < 25) f.push(0);
    flat.push(f);
  });

  var lines = [];
  lines.push(MARKER_START);
  lines.push("SCENARIO_COUNT = " + scenarios.length);
  lines.push("SCENARIO_ID_BARS = " + edList(idBars));
  lines.push("SCENARIO_ROWS = " + edList(rows));
  lines.push("SCENARIO_COLS = " + edList(cols));
  lines.push("SCENARIO_START_R = " + edList(startR));
  lines.push("SCENARIO_START_C = " + edList(startC));
  lines.push("SCENARIO_START_H = " + edList(startH));
  lines.push("TYPE_REWARD = " + edList(rewards));
  lines.push("TYPE_TERMINAL = " + edList(terminals));
  lines.push("TYPE_BLOCKED = " + edList(blocked));
  lines.push("TYPE_WAIT = " + edList(waits));
  lines.push("TYPE_FORCE = " + edList(forced));
  var allCells = [];
  flat.forEach(function (f) { allCells = allCells.concat(f); });
  must(allCells.length <= 250, "Too many scenarios: flat grid has " + allCells.length + " cells (EdPy max is 250).");
  lines.push("SCENARIO_GRID = Ed.List(" + allCells.length + ")");
  lines.push("for i in range(" + allCells.length + "):");
  lines.push("    SCENARIO_GRID[i] = 0");
  for (var ci = 0; ci < allCells.length; ci++) {
    if (allCells[ci] !== 0) {
      lines.push("SCENARIO_GRID[" + ci + "] = " + allCells[ci]);
    }
  }
  lines.push(MARKER_END);
  return lines.join("\n");
}

function replaceGeneratedBlock(runtimeText, block) {
  var s = runtimeText.indexOf(MARKER_START);
  var e0 = runtimeText.indexOf(MARKER_END);
  if (s < 0 || e0 < 0 || e0 <= s) throw new Error("Markers not found in runtime template");
  var e = e0 + MARKER_END.length;
  return runtimeText.slice(0, s) + block + runtimeText.slice(e);
}

// ── Hyperparameter helpers ──

var HP_DEFAULTS = { alpha: 22, gamma: 95, epsilon: 28, minEpisodes: 18, maxSteps: 60, turnDeg: 95, cellCm: 11 };

function readHyperparams() {
  return {
    alpha: Number(byId("hpAlpha").value) || HP_DEFAULTS.alpha,
    gamma: Number(byId("hpGamma").value) || HP_DEFAULTS.gamma,
    epsilon: Number(byId("hpEpsilon").value) || HP_DEFAULTS.epsilon,
    minEpisodes: Number(byId("hpMinEpisodes").value) || HP_DEFAULTS.minEpisodes,
    maxSteps: Number(byId("hpMaxSteps").value) || HP_DEFAULTS.maxSteps,
    turnDeg: Number(byId("hpTurnDeg").value) || HP_DEFAULTS.turnDeg,
    cellCm: Number(byId("hpCellCm").value) || HP_DEFAULTS.cellCm,
  };
}

function applyHyperparams(code, hp) {
  code = code.replace(
    HP_DEFAULTS.alpha + " * (tg - oq) // 100",
    hp.alpha + " * (tg - oq) // 100"
  );
  code = code.replace(
    HP_DEFAULTS.gamma + " * mn // 100",
    hp.gamma + " * mn // 100"
  );
  code = code.replace(
    "if rv < " + HP_DEFAULTS.epsilon + ":",
    "if rv < " + hp.epsilon + ":"
  );
  code = code.replace(
    "if ep >= " + HP_DEFAULTS.minEpisodes + ":",
    "if ep >= " + hp.minEpisodes + ":"
  );
  code = code.replace(
    "elif step >= " + HP_DEFAULTS.maxSteps + ":",
    "elif step >= " + hp.maxSteps + ":"
  );
  code = code.replace(
    "Ed.SPEED_5, " + HP_DEFAULTS.turnDeg + ", " + HP_DEFAULTS.cellCm + ")",
    "Ed.SPEED_5, " + hp.turnDeg + ", " + hp.cellCm + ")"
  );
  return code;
}

// ── Event listeners ──

byId("addTypeBtn").addEventListener("click", function () {
  var maxId = state.square_types.reduce(function (m, t) { return Math.max(m, Number(t.id)); }, -1);
  state.square_types.push({
    id: maxId + 1,
    name: "Type" + (maxId + 1),
    reward_on_enter: -2,
    terminal: false,
    blocked: false,
    wait_steps: 0,
    force_action: null,
    color: "#ffffff",
  });
  renderAll();
});

byId("addScenarioBtn").addEventListener("click", function () {
  state.scenarios.push({
    name: "Scenario" + (state.scenarios.length + 1),
    id_bars: state.scenarios.length + 1,
    rows: 3,
    cols: 3,
    start: { row: 0, col: 0, heading: 0 },
    cells: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
  });
  state.selectedScenario = state.scenarios.length - 1;
  renderAll();
  setStatus("New scenario added.", "success");
});

byId("deleteScenarioBtn").addEventListener("click", function () {
  if (state.scenarios.length <= 1) {
    setStatus("Cannot delete the last scenario.", "error");
    return;
  }
  var name = state.scenarios[state.selectedScenario].name;
  state.scenarios.splice(state.selectedScenario, 1);
  state.selectedScenario = Math.min(state.selectedScenario, state.scenarios.length - 1);
  renderAll();
  setStatus('Deleted scenario "' + name + '".', "info");
});

byId("scenarioSelect").addEventListener("change", function (e) {
  state.selectedScenario = Number(e.target.value);
  bindScenarioFields();
  renderGrid();
});

["scName", "scBars", "scRows", "scCols", "scStartR", "scStartC", "scStartH"].forEach(function (id) {
  byId(id).addEventListener("change", function () {
    updateScenarioFromFields();
    renderScenarioSelect();
    renderGrid();
  });
});

byId("exportBtn").addEventListener("click", exportJson);

byId("importFile").addEventListener("change", function (e) {
  var f = e.target.files && e.target.files[0];
  if (f) importJson(f);
});

byId("runtimeFile").addEventListener("change", function (e) {
  var f = e.target.files && e.target.files[0];
  if (!f) return;
  var fr = new FileReader();
  fr.onload = function () {
    byId("runtimeInput").value = String(fr.result || "");
    setStatus("Runtime template uploaded.", "success");
  };
  fr.readAsText(f);
});

byId("refreshRuntimeBtn").addEventListener("click", function () {
  loadCurrentRuntime();
});

byId("compileRuntimeBtn").addEventListener("click", async function () {
  try {
    var payload = scenarioPayload();
    var block = compileGeneratedBlock(payload);
    var runtime = byId("runtimeInput").value;
    if (!runtime.trim()) {
      await loadCurrentRuntime();
      runtime = byId("runtimeInput").value;
    }
    if (!runtime.trim()) throw new Error("Runtime template is empty. Load EdisonRL.py first.");
    var compiled = replaceGeneratedBlock(runtime, block);
    var hp = readHyperparams();
    compiled = applyHyperparams(compiled, hp);
    byId("runtimeOutput").value = compiled;
    setStatus("Compiled successfully! Copy or download the code below.", "success");
  } catch (e) {
    setStatus("Compile failed: " + e.message, "error");
  }
});

byId("copyRuntimeBtn").addEventListener("click", async function () {
  var text = byId("runtimeOutput").value;
  if (!text.trim()) {
    setStatus("Nothing to copy. Compile first.", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Copied to clipboard!", "success");
  } catch (e) {
    setStatus("Clipboard copy failed: " + e.message, "error");
  }
});

byId("downloadRuntimeBtn").addEventListener("click", function () {
  var text = byId("runtimeOutput").value;
  if (!text.trim()) {
    setStatus("Nothing to download. Compile first.", "error");
    return;
  }
  downloadTextFile("EdisonRL.py", text, "text/x-python");
  setStatus("Downloaded EdisonRL.py", "success");
});

byId("downloadSvgBtn").addEventListener("click", function () {
  try {
    var sc = state.scenarios[state.selectedScenario];
    if (!sc) throw new Error("No selected scenario.");
    var svg = buildScenarioSvg(state.square_types, sc);
    downloadTextFile(safeFileName(sc.name) + ".svg", svg, "image/svg+xml");
    setStatus("Downloaded SVG for " + sc.name + ".", "success");
  } catch (e) {
    setStatus("SVG export failed: " + e.message, "error");
  }
});

byId("downloadAllSvgsBtn").addEventListener("click", function () {
  try {
    if (!state.scenarios.length) throw new Error("No scenarios.");
    state.scenarios.forEach(function (sc) {
      var svg = buildScenarioSvg(state.square_types, sc);
      downloadTextFile(safeFileName(sc.name) + ".svg", svg, "image/svg+xml");
    });
    setStatus("Downloaded " + state.scenarios.length + " SVG files.", "success");
  } catch (e) {
    setStatus("Bulk SVG export failed: " + e.message, "error");
  }
});

byId("downloadCalibBtn").addEventListener("click", async function () {
  try {
    var resp = await fetch("../grids/calibration_test_strip.svg");
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    var svg = await resp.text();
    downloadTextFile("calibration_test_strip.svg", svg, "image/svg+xml");
    setStatus("Downloaded calibration test strip.", "success");
  } catch (e) {
    setStatus("Calibration SVG not found. Place grids/calibration_test_strip.svg next to web-builder/.", "error");
  }
});

// ── Init ──

renderAll();
loadCurrentRuntime();
