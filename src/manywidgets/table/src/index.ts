import type { RenderProps } from "@anywidget/types";
import { applyThemeVars, onChanges, safeSaveChanges } from "@manywidgets/core";

type Row = Record<string, unknown>;

interface Column {
  key: string;
  label?: string;
  format?: "text" | "number" | "bytes" | "datetime";
  align?: "left" | "right";
  digits?: number;
}

interface TableModel {
  rows: Row[];
  columns: Column[];
  id_key: string;
  selected: string;
  hovered: string;
  max_height: string;
  sortable: boolean;
  title: string;
  empty_text: string;
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];

export function formatBytes(value: number): string {
  if (!Number.isFinite(value)) return "";
  let v = Math.abs(value);
  let i = 0;
  while (v >= 1000 && i < BYTE_UNITS.length - 1) {
    v /= 1000;
    i += 1;
  }
  const digits = i === 0 ? 0 : v < 10 ? 1 : 0;
  return `${value < 0 ? "-" : ""}${v.toFixed(digits)} ${BYTE_UNITS[i]}`;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

export function formatDatetime(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return String(value);
  return (
    `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ` +
    `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`
  );
}

export function formatCell(value: unknown, col: Column): string {
  if (value === null || value === undefined) return "";
  switch (col.format) {
    case "bytes":
      return formatBytes(Number(value));
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n)) return String(value);
      const opts =
        col.digits === undefined
          ? undefined
          : { minimumFractionDigits: col.digits, maximumFractionDigits: col.digits };
      return n.toLocaleString(undefined, opts);
    }
    case "datetime":
      return formatDatetime(value);
    default:
      return String(value);
  }
}

const isNull = (v: unknown) => v === null || v === undefined || v === "";

/** Sort comparator for two non-null values: numbers numerically, else strings case-insensitively. */
function compare(a: unknown, b: unknown): number {
  const an = typeof a === "number" ? a : Number(a);
  const bn = typeof b === "number" ? b : Number(b);
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
}

function render({ model, el }: RenderProps<TableModel>): () => void {
  const disposeTheme = applyThemeVars(el, model);

  const container = document.createElement("div");
  container.className = "manywidgets-table";

  const titleEl = document.createElement("div");
  titleEl.className = "manywidgets-table__title";

  const scroller = document.createElement("div");
  scroller.className = "manywidgets-table__scroll";

  const table = document.createElement("table");
  table.className = "manywidgets-table__table";
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  table.appendChild(thead);
  table.appendChild(tbody);

  const emptyEl = document.createElement("div");
  emptyEl.className = "manywidgets-table__empty";

  scroller.appendChild(table);
  container.appendChild(titleEl);
  container.appendChild(scroller);
  container.appendChild(emptyEl);
  el.appendChild(container);

  // Sort state survives rebuilds (rows/columns changes).
  let sortKey: string | null = null;
  let sortDir: 1 | -1 = 1;
  let columns: Column[] = [];
  let rowEls = new Map<string, HTMLTableRowElement>();

  function rowId(row: Row, index: number): string {
    const key = model.get("id_key");
    return key ? String(row[key]) : String(index);
  }

  function resolveColumns(rows: Row[]): Column[] {
    const given = model.get("columns") || [];
    if (given.length > 0) return given.filter((c) => c && c.key);
    const first = rows[0];
    return first ? Object.keys(first).map((key) => ({ key })) : [];
  }

  function orderedRows(rows: Row[]): Array<[Row, number]> {
    const indexed: Array<[Row, number]> = rows.map((r, i) => [r, i]);
    if (!sortKey) return indexed;
    const key = sortKey;
    // Nulls sort last in both directions; only real values flip with sortDir.
    return indexed.sort((a, b) => {
      const av = a[0][key];
      const bv = b[0][key];
      if (isNull(av) || isNull(bv)) return Number(isNull(av)) - Number(isNull(bv));
      return compare(av, bv) * sortDir;
    });
  }

  function buildHead(): void {
    thead.replaceChildren();
    const tr = document.createElement("tr");
    const sortable = model.get("sortable");
    for (const col of columns) {
      const th = document.createElement("th");
      th.className = "manywidgets-table__th";
      if (col.align === "right" || (col.align === undefined && col.format && col.format !== "text" && col.format !== "datetime")) {
        th.classList.add("is-right");
      }
      th.textContent = col.label ?? col.key;
      if (sortable) {
        th.classList.add("is-sortable");
        if (sortKey === col.key) {
          th.classList.add(sortDir === 1 ? "is-sorted-asc" : "is-sorted-desc");
          const ind = document.createElement("span");
          ind.className = "manywidgets-table__sort";
          ind.textContent = sortDir === 1 ? "▲" : "▼";
          th.appendChild(ind);
        }
        th.addEventListener("click", () => {
          if (sortKey === col.key) {
            sortDir = sortDir === 1 ? -1 : 1;
          } else {
            sortKey = col.key;
            sortDir = 1;
          }
          rebuild();
        });
      }
      tr.appendChild(th);
    }
    thead.appendChild(tr);
  }

  function buildBody(rows: Row[]): void {
    tbody.replaceChildren();
    rowEls = new Map();
    for (const [row, index] of orderedRows(rows)) {
      const id = rowId(row, index);
      const tr = document.createElement("tr");
      tr.className = "manywidgets-table__row";
      tr.dataset.id = id;
      for (const col of columns) {
        const td = document.createElement("td");
        td.className = "manywidgets-table__td";
        if (col.align === "right" || (col.align === undefined && col.format && col.format !== "text" && col.format !== "datetime")) {
          td.classList.add("is-right");
        }
        td.textContent = formatCell(row[col.key], col);
        tr.appendChild(td);
      }
      tr.addEventListener("click", () => {
        if (model.get("selected") === id) return;
        model.set("selected", id);
        safeSaveChanges(model);
      });
      tr.addEventListener("mouseenter", () => {
        if (model.get("hovered") === id) return;
        model.set("hovered", id);
        safeSaveChanges(model);
      });
      tbody.appendChild(tr);
      rowEls.set(id, tr);
    }
    syncSelected(false);
    syncHovered();
  }

  function rebuild(): void {
    const rows = model.get("rows") || [];
    columns = resolveColumns(rows);
    buildHead();
    buildBody(rows);
    const empty = rows.length === 0;
    emptyEl.textContent = model.get("empty_text") || "";
    emptyEl.style.display = empty ? "" : "none";
    scroller.style.display = empty ? "none" : "";
  }

  function syncSelected(scroll = true): void {
    const selected = model.get("selected") || "";
    for (const [id, tr] of rowEls) {
      const on = id === selected;
      tr.classList.toggle("is-selected", on);
      if (on && scroll && typeof tr.scrollIntoView === "function") {
        tr.scrollIntoView({ block: "nearest" });
      }
    }
  }

  function syncHovered(): void {
    const hovered = model.get("hovered") || "";
    for (const [id, tr] of rowEls) tr.classList.toggle("is-hovered", id === hovered);
  }

  function syncTitle(): void {
    const title = model.get("title") || "";
    titleEl.textContent = title;
    titleEl.style.display = title ? "" : "none";
  }

  function syncHeight(): void {
    scroller.style.maxHeight = model.get("max_height") || "";
  }

  tbody.addEventListener("mouseleave", () => {
    if (!model.get("hovered")) return;
    model.set("hovered", "");
    safeSaveChanges(model);
  });

  syncTitle();
  syncHeight();
  rebuild();

  const offs = [
    onChanges(model, ["rows", "columns", "id_key", "sortable", "empty_text"], rebuild),
    onChanges(model, ["selected"], () => syncSelected(true)),
    onChanges(model, ["hovered"], syncHovered),
    onChanges(model, ["title"], syncTitle),
    onChanges(model, ["max_height"], syncHeight),
  ];

  return () => {
    for (const off of offs) off();
    disposeTheme();
  };
}

export default { render };
