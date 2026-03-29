"""Regenerate web-builder/bundled-runtime.js and runtime-template.py from EdisonRL.py."""
import shutil
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = (root / "EdisonRL.py").read_text(encoding="utf-8")

shutil.copy(root / "EdisonRL.py", root / "web-builder" / "runtime-template.py")

esc = src.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
js = (
    "// Bundled EdisonRL.py runtime for web-builder fallback.\n"
    "// Auto-generated from the project root EdisonRL.py.\n"
    "// Copyright (C) Shreyan Mitra, 2024-2026.\n"
    "/* eslint-disable */\n"
    "const BUNDLED_RUNTIME = `" + esc + "`;\n"
)
(root / "web-builder" / "bundled-runtime.js").write_text(js, encoding="utf-8")
print(f"Done: {len(src)} chars -> bundled-runtime.js + runtime-template.py")
