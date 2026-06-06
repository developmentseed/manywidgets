"""Generate per-widget docs notebooks from each widget's co-located doc.md.

Each widget directory (src/manywidgets/<name>/) owns its docs in `doc.md`:
  - prose as Markdown,
  - executable examples as ```{code-cell} python fences (-> executed code cells),
  - an `{api-table}` placeholder, replaced with a table auto-generated from the
    widget's traits (name / type / default / help via traitlets introspection).

We emit docs/widgets/<name>.ipynb (a BUILD ARTIFACT, gitignored). The build then
pre-executes these (jupyter nbconvert --execute) so the static-export plugin can
render the widgets with no kernel.

Run: python scripts/build_widget_docs.py   (with manywidgets importable)
"""

from __future__ import annotations

import pathlib
import re

import anywidget
import nbformat as nbf
import traitlets

import manywidgets

ROOT = pathlib.Path(__file__).resolve().parent.parent
WIDGETS_SRC = ROOT / "src" / "manywidgets"
DOCS_OUT = ROOT / "docs" / "widgets"

KERNEL = {"display_name": "manywidgets-venv", "language": "python", "name": "manywidgets-venv"}

# Traits inherited from anywidget/ipywidgets that are not part of a widget's API.
_BASE_TRAITS = set(anywidget.AnyWidget.class_traits())

# ```{code-cell} python ... ``` fenced blocks.
_CODE_CELL_RE = re.compile(r"```\{code-cell\}[^\n]*\n(.*?)\n```", re.DOTALL)


def class_for(dir_name: str):
    """src dir name -> the exported widget class (e.g. number_input -> NumberInput).

    Looks in the top-level ``manywidgets`` namespace first, then the optional
    ``manywidgets.lonboard`` subpackage. Returns None if it can't be resolved
    (e.g. lonboard isn't installed) so the caller can skip that page gracefully.
    """
    cls_name = "".join(part.capitalize() for part in dir_name.split("_"))
    if hasattr(manywidgets, cls_name):
        return getattr(manywidgets, cls_name)
    try:
        import manywidgets.lonboard as _lon
    except ImportError:
        return None
    return getattr(_lon, cls_name, None)


def public_traits(cls):
    """Synced, public, widget-defined traits in definition order; widget_id last."""
    all_traits = cls.class_traits()
    seen: set[str] = set()
    out = []
    for klass in cls.__mro__:  # leaf -> base, preserves definition order within each
        for name in vars(klass):
            if name in seen:
                continue
            tr = all_traits.get(name)
            if tr is None or name.startswith("_"):
                continue
            if not tr.metadata.get("sync"):
                continue
            if name in _BASE_TRAITS and name != "widget_id":
                continue
            seen.add(name)
            out.append((name, tr))
    out.sort(key=lambda nt: nt[0] == "widget_id")  # stable: widget_id to the end
    return out


def fmt_default(tr):
    dv = tr.default_value
    if dv is traitlets.Undefined:
        return "—"
    return f"`{dv!r}`"


def api_table(cls) -> str:
    rows = ["| Trait | Type | Default | Description |", "|---|---|---|---|"]
    for name, tr in public_traits(cls):
        desc = (tr.help or "").replace("|", "\\|")
        rows.append(f"| `{name}` | {type(tr).__name__} | {fmt_default(tr)} | {desc} |")
    return "\n".join(rows)


def build_cells(doc_md: str, cls):
    """Split doc.md into markdown/code cells; inject the API table."""
    cells = []
    pos = 0
    for m in _CODE_CELL_RE.finditer(doc_md):
        before = doc_md[pos:m.start()].strip()
        if before:
            cells.append(nbf.v4.new_markdown_cell(_inject_api(before, cls)))
        cells.append(nbf.v4.new_code_cell(m.group(1).strip()))
        pos = m.end()
    tail = doc_md[pos:].strip()
    if tail:
        cells.append(nbf.v4.new_markdown_cell(_inject_api(tail, cls)))
    return cells


def _inject_api(markdown: str, cls) -> str:
    if "{api-table}" in markdown:
        return markdown.replace("{api-table}", api_table(cls))
    return markdown


def main() -> int:
    DOCS_OUT.mkdir(parents=True, exist_ok=True)
    count = 0
    for doc_path in sorted(WIDGETS_SRC.rglob("doc.md")):  # nested (lonboard/) too
        name = doc_path.parent.name
        cls = class_for(name)
        if cls is None:
            print(f"skip {name} (class not importable — is the [lonboard] extra installed?)")
            continue
        nb = nbf.v4.new_notebook()
        nb["cells"] = build_cells(doc_path.read_text(), cls)
        nb["metadata"] = {"kernelspec": KERNEL, "language_info": {"name": "python"}}
        out = DOCS_OUT / f"{name}.ipynb"
        nbf.write(nb, str(out))
        print(f"wrote {out.relative_to(ROOT)}  ({len(nb['cells'])} cells)")
        count += 1
    print(f"done — {count} widget doc page(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
